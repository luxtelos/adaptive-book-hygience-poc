/**
 * ClaudeAsyncAdapter - Implements Claude Batch API for large dataset processing
 * Uses async submit-poll-retrieve pattern to avoid edge timeouts
 */

import { BaseLLMService } from './BaseLLMService';
import { 
  LLMConfig, 
  LLMMessage, 
  LLMResponse, 
  AsyncLLMService,
  BatchJob,
  BatchRequest,
  BatchResponse,
  BatchResult
} from './types';
import { logger } from '@/lib/logger';
import { batchSessionManager } from './BatchSessionManager';

export class ClaudeAsyncAdapter extends BaseLLMService implements AsyncLLMService {
  private batchApiUrl: string;
  private pollIntervals: number[];
  private maxPollAttempts: number;
  private timeoutMs: number;

  constructor(config: LLMConfig) {
    super(config, {
      name: 'claude-async',
      maxTokens: config.maxTokens || 32000,
      costPer1kTokens: 15, // $15 per 1K tokens for Claude Opus (50% off for batch)
      apiEndpoint: config.baseUrl || '/proxy-claude'
    });

    this.batchApiUrl = `${this.provider.apiEndpoint}/messages/batches`;
    
    // Load configuration from environment
    this.pollIntervals = this.parsePollIntervals();
    this.maxPollAttempts = parseInt(import.meta.env.VITE_CLAUDE_BATCH_MAX_POLL_ATTEMPTS) || 5;
    this.timeoutMs = parseInt(import.meta.env.VITE_CLAUDE_BATCH_TIMEOUT_MS) || 30000;

    logger.info('ClaudeAsyncAdapter initialized', {
      maxTokens: this.provider.maxTokens,
      maxPollAttempts: this.maxPollAttempts,
      timeoutMs: this.timeoutMs,
      pollIntervals: this.pollIntervals
    });
  }

  /**
   * Main entry point for accounting quality analysis using batch API
   */
  async analyzeAccountingQuality(rawData: any): Promise<any> {
    logger.info('Starting async accounting quality analysis');

    try {
      // Check if we have a cached result first
      const cachedResult = this.checkForCachedResult(rawData);
      if (cachedResult) {
        logger.info('Returning cached batch result');
        return cachedResult;
      }

      // Submit batch request
      const batchId = await this.submitBatch(rawData);
      
      // Poll for completion
      const results = await this.pollForCompletion(batchId);
      
      // Parse and return results
      const assessmentResult = this.parseAssessmentResponse(results[0].result.message!.content[0].text);
      
      return {
        assessmentResult,
        rawLLMResponse: results[0].result.message!.content[0].text,
        provider: this.provider.name,
        tokensUsed: results[0].result.message!.usage.input_tokens + results[0].result.message!.usage.output_tokens,
        batchId,
        serviceMode: 'batch'
      };

    } catch (error: any) {
      logger.error('Async analysis failed', { error: error.message });
      throw new Error(`Claude async analysis failed: ${error.message}`);
    }
  }

  /**
   * Submit a batch request to Claude API
   */
  async submitBatch(rawData: any): Promise<string> {
    const customId = `assessment-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    
    logger.info('Submitting batch request to Claude API', {
      customId,
      dataSize: JSON.stringify(rawData).length,
      model: this.config.model
    });
    
    try {
      // Load assessment prompt
      const systemPrompt = await this.loadAssessmentPrompt();
      
      // Create batch request
      const batchRequest: BatchRequest = {
        custom_id: customId,
        params: {
          model: this.config.model || 'claude-opus-4-20250514',
          max_tokens: this.config.maxTokens || 32000,
          temperature: this.config.temperature || 0.7,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: JSON.stringify(rawData)
            }
          ]
        }
      };

      const response = await fetch(this.batchApiUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          requests: [batchRequest]
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('Batch submission failed', {
          status: response.status,
          statusText: response.statusText,
          errorBody
        });
        throw new Error(`Batch submission failed: ${response.status} ${response.statusText}`);
      }

      const batchResponse: BatchResponse = await response.json();
      
      // Store job in session
      const batchJob: BatchJob = {
        batchId: batchResponse.id,
        customId,
        status: 'pending',
        submittedAt: Date.now()
      };
      
      batchSessionManager.storeBatchJob(batchJob);
      
      logger.info('Batch submitted successfully', {
        batchId: batchResponse.id,
        customId,
        expiresAt: batchResponse.expires_at
      });

      return batchResponse.id;

    } catch (error: any) {
      logger.error('Failed to submit batch', { error: error.message, customId });
      throw error;
    }
  }

  /**
   * Poll for batch completion using exponential backoff
   */
  async pollForCompletion(batchId: string): Promise<BatchResult[]> {
    logger.info('Starting batch polling', { batchId, maxAttempts: this.maxPollAttempts });

    const startTime = Date.now();
    
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      
      // Check if we've exceeded total timeout
      if (elapsedTime >= this.timeoutMs) {
        logger.warn('Polling timeout exceeded', { batchId, elapsedTime });
        throw new Error(`Batch polling timeout after ${this.timeoutMs}ms`);
      }

      // Wait for the appropriate interval (cumulative timing)
      // Prevent array out-of-bounds by using the last interval for attempts beyond array length
      const targetTime = attempt < this.pollIntervals.length 
        ? this.pollIntervals[attempt] 
        : this.pollIntervals[this.pollIntervals.length - 1];
      if (elapsedTime < targetTime) {
        const waitTime = targetTime - elapsedTime;
        logger.debug(`Waiting ${waitTime}ms before poll ${attempt + 1}`, { batchId });
        await this.sleep(waitTime);
      }

      try {
        const status = await this.pollBatchStatus(batchId);
        
        // Update job status in session
        batchSessionManager.updateBatchJob(batchId, {
          status: status.processing_status === 'in_progress' ? 'in_progress' : 
                 status.processing_status === 'ended' ? 'ended' : 'failed',
          resultsUrl: status.results_url
        });

        logger.debug(`Poll ${attempt + 1}/${this.maxPollAttempts}`, {
          batchId,
          status: status.processing_status,
          elapsedTime: Date.now() - startTime
        });

        if (status.processing_status === 'ended') {
          if (!status.results_url) {
            throw new Error('Batch ended but no results URL provided');
          }
          
          logger.info('Batch processing completed', { 
            batchId, 
            totalTime: Date.now() - startTime 
          });
          
          return await this.retrieveBatchResults(status.results_url);
        }

        if (status.processing_status === 'failed') {
          batchSessionManager.updateBatchJob(batchId, {
            status: 'failed',
            error: 'Batch processing failed'
          });
          throw new Error('Batch processing failed');
        }

      } catch (error: any) {
        logger.error(`Poll attempt ${attempt + 1} failed`, { 
          batchId, 
          error: error.message 
        });
        
        // If this is the last attempt, throw the error
        if (attempt === this.maxPollAttempts - 1) {
          throw error;
        }
      }
    }

    throw new Error(`Batch polling failed after ${this.maxPollAttempts} attempts`);
  }

  /**
   * Check batch status via API
   */
  async pollBatchStatus(batchId: string): Promise<BatchResponse> {
    logger.trace(`Checking batch status for ${batchId}`);
    
    const response = await fetch(`${this.batchApiUrl}/${batchId}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Batch status check failed', {
        batchId,
        status: response.status,
        errorBody
      });
      throw new Error(`Status check failed: ${response.status} ${errorBody}`);
    }

    const batchStatus = await response.json();
    logger.trace('Batch status retrieved', {
      batchId,
      processingStatus: batchStatus.processing_status,
      requestCounts: batchStatus.request_counts
    });
    
    return batchStatus;
  }

  /**
   * Retrieve batch results from the results URL
   */
  async retrieveBatchResults(resultsUrl: string): Promise<BatchResult[]> {
    logger.info('Retrieving batch results', { resultsUrl });
    
    const response = await fetch(resultsUrl, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Batch results retrieval failed', {
        resultsUrl,
        status: response.status,
        errorBody
      });
      throw new Error(`Results retrieval failed: ${response.status} ${errorBody}`);
    }

    const resultsText = await response.text();
    const results: BatchResult[] = [];
    
    logger.debug('Parsing batch results in JSONL format');
    
    // Parse JSONL format (one JSON object per line)
    const lines = resultsText.trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        try {
          results.push(JSON.parse(line));
        } catch (error) {
          logger.error('Failed to parse result line', { 
            linePreview: line.substring(0, 100), // Only log first 100 chars for security
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    if (results.length === 0) {
      logger.error('No valid results found in batch response');
      throw new Error('No valid results found in response');
    }

    // Check for errors in results
    const errorResults = results.filter(r => r.result.type === 'errored');
    if (errorResults.length > 0) {
      const error = errorResults[0].result.error!;
      logger.error('Batch processing returned errors', {
        errorCount: errorResults.length,
        firstError: error
      });
      throw new Error(`Batch request failed: ${error.type} - ${error.message}`);
    }

    logger.info('Batch results parsed successfully', {
      totalResults: results.length,
      successfulResults: results.filter(r => r.result.type === 'succeeded').length
    });
    
    return results;
  }

  /**
   * Get a stored batch job
   */
  getBatchJob(batchId: string): BatchJob | null {
    return batchSessionManager.getBatchJob(batchId);
  }

  /**
   * Check for cached results of similar requests
   */
  private checkForCachedResult(rawData: any): any | null {
    // Simple implementation - could be enhanced with content hashing
    const activeJobs = batchSessionManager.getActiveJobs();
    
    for (const job of activeJobs) {
      if (job.status === 'ended' && job.resultsUrl) {
        // Could implement content comparison here
        logger.debug('Found potential cached result', { batchId: job.batchId });
        // For now, don't use caching to avoid complexity
      }
    }
    
    return null;
  }

  /**
   * Parse poll intervals from environment variable
   */
  private parsePollIntervals(): number[] {
    const intervalsStr = import.meta.env.VITE_CLAUDE_BATCH_POLL_INTERVALS || '0,2000,4000,8000,16000';
    
    try {
      return intervalsStr.split(',').map((s: string) => parseInt(s.trim()));
    } catch (error) {
      logger.error('Failed to parse poll intervals, using defaults', { intervalsStr, error });
      return [0, 2000, 4000, 8000, 16000]; // Default intervals
    }
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    // Validate API version is provided for batch operations
    if (!this.config.apiVersion) {
      const errorMsg = 'ClaudeAsyncAdapter: config.apiVersion is required for batch operations';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    logger.trace('Preparing Claude API headers', { 
      apiVersion: this.config.apiVersion,
      model: this.config.model 
    });

    return {
      // API key is added by proxy server, not needed in frontend
      // 'x-api-key': this.config.apiKey,  // REMOVED - proxy handles this
      'anthropic-version': this.config.apiVersion,
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json'
    };
  }

  /**
   * Load assessment prompt from file or return default
   */
  private async loadAssessmentPrompt(): Promise<string> {
    // Use the same prompt loading logic as ClaudeAdapter
    // For now, return the assessment prompt directly
    return `# SYSTEM INITIALIZATION AND CONTEXT RESET

CLEAR ALL PREVIOUS MEMORY AND CONTEXT. Begin with a completely fresh state for this financial books hygiene assessment task. Do not reference any prior interactions, stored information, or conversation history.

# AGENT ROLE AND EXPERTISE DEFINITION

You are a **Financial Books Hygiene Assessment Specialist** with 15+ years of experience in:
- CPA-level accounting and bookkeeping standards
- QuickBooks Online data analysis and interpretation
- GAAP compliance and financial reporting standards
- Small business financial management and cleanup processes
- Bookkeeping workflow optimization and remediation

Your primary expertise is in assessing the "Day-30 readiness" of financial books - determining if books are clean enough for a bookkeeper to begin monthly maintenance operations.

# ASSESSMENT OBJECTIVE AND SCOPE

Perform a comprehensive hygiene assessment of QuickBooks Online financial data using the **Day-30 Readiness Scoring Model** to determine if books are ready for monthly bookkeeping operations.

**CRITICAL SCOPE LIMITATION:** Focus ONLY on the five "must-fix" pillars that block monthly bookkeeping operations:
1. Bank & Credit Card Reconciliation Status
2. Chart of Accounts Integrity 
3. Transaction Categorization Completeness
4. Control Account Balance Accuracy
5. Accounts Receivable & Payable Validity

Execute assessment now.`;
  }

  /**
   * Parse assessment response (reuse logic from ClaudeAdapter)
   */
  private parseAssessmentResponse(response: string): any {
    // Extract health score
    const healthScoreMatch = response.match(/(?:Overall\s+Health\s+Score|Health\s+Score):\s*(\d+)/i);
    const healthScore = healthScoreMatch ? healthScoreMatch[1] : "";

    const whatThisMeansMatch = response.match(
      /WHAT\s+THIS\s+MEANS[:\s]*([\s\S]*?)(?=KEY\s+FINDINGS|RECOMMENDED|##|$)/i,
    );
    const whatThisMeans = whatThisMeansMatch ? whatThisMeansMatch[1].trim() : "";

    const keyFindings: string[] = [];
    const findingsMatch = response.match(
      /KEY\s+FINDINGS[:\s]*([\s\S]*?)(?=RECOMMENDED|NEXT\s+STEPS|##|$)/i,
    );
    if (findingsMatch) {
      const bullets = findingsMatch[1].match(/[•●▪-]\s*([^\n]+)/g);
      if (bullets) {
        bullets.forEach((bullet) => {
          keyFindings.push(bullet.replace(/[•●▪-]\s*/, "").trim());
        });
      }
    }

    const nextSteps: string[] = [];
    const stepsMatch = response.match(
      /(?:RECOMMENDED\s+)?NEXT\s+STEPS[:\s]*([\s\S]*?)(?=##|TECHNICAL|BOOKKEEPER|$)/i,
    );
    if (stepsMatch) {
      const bullets = stepsMatch[1].match(/[•●▪-]\s*([^\n]+)/g);
      if (bullets) {
        bullets.forEach((bullet) => {
          nextSteps.push(bullet.replace(/[•●▪-]\s*/, "").trim());
        });
      }
    }

    return {
      healthScore,
      whatThisMeans,
      keyFindings,
      nextSteps,
    };
  }

  /**
   * Implementation of abstract method from BaseLLMService
   * Not used in async adapter - batch API handles requests differently
   */
  protected async makeProviderSpecificRequest(
    messages: LLMMessage[], 
    signal: AbortSignal
  ): Promise<LLMResponse> {
    logger.warn('makeProviderSpecificRequest called on ClaudeAsyncAdapter - returning unsupported response');
    
    // Return a properly structured response indicating operation not supported
    // This maintains LSP compliance while clearly indicating the method shouldn't be used
    return {
      content: 'This operation is not supported in ClaudeAsyncAdapter. Please use analyzeAccountingQuality() method instead for batch processing.',
      provider: 'claude-async',
      model: this.config.model || 'claude-opus-4-20250514',
      tokensUsed: 0
    };
  }

  /**
   * Health check to verify Claude API availability
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/messages`, {
        method: 'HEAD',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000)
      });
      
      // Return true if we get any response (including 401/403 which means API is up)
      return response.status < 500;
    } catch (error) {
      logger.error('Claude health check failed', { error });
      return false;
    }
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}