/**
 * Factory class for creating and managing LLM service instances
 * Implements fallback chain: Perplexity → Claude → Error
 */

import { ILLMService, LLMProviderType, LLMConfig } from './types';
import { PerplexityAdapter } from './PerplexityAdapter';
import { ClaudeAdapter } from './ClaudeAdapter';
import { logger } from '@/lib/logger';
import { toast } from './toast';

export class LLMServiceFactory {
  private static instance: LLMServiceFactory | null = null;
  private services: Map<string, ILLMService> = new Map();
  private config: { perplexity?: LLMConfig; claude?: LLMConfig } = {};

  private constructor() {
    this.initializeConfig();
  }

  /**
   * Get singleton instance of the factory
   */
  static getInstance(): LLMServiceFactory {
    if (!LLMServiceFactory.instance) {
      LLMServiceFactory.instance = new LLMServiceFactory();
    }
    return LLMServiceFactory.instance;
  }

  /**
   * Initialize configuration from environment variables
   */
  private initializeConfig() {
    // Check feature flags
    const perplexityEnabled = import.meta.env.VITE_ENABLE_PERPLEXITY === 'true';
    const claudeEnabled = import.meta.env.VITE_ENABLE_CLAUDE === 'true';

    // Perplexity configuration
    const perplexityApiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;
    if (perplexityEnabled && perplexityApiKey) {
      this.config.perplexity = {
        apiKey: perplexityApiKey,
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        model: 'sonar-reasoning-pro',
        maxTokens: 4000,
        temperature: 0.1
      };
      logger.debug('Perplexity configuration loaded (enabled via feature flag)');
    } else if (perplexityEnabled && !perplexityApiKey) {
      logger.warn('Perplexity enabled but API key not configured');
    } else {
      logger.info('Perplexity disabled via feature flag');
    }

    // Claude configuration
    const claudeApiKey = import.meta.env.VITE_CLAUDE_API_KEY;
    if (claudeEnabled && claudeApiKey) {
      // Validate required Claude configuration
      if (!import.meta.env.VITE_CLAUDE_MODEL) {
        throw new Error('VITE_CLAUDE_MODEL environment variable is required when Claude is enabled');
      }
      if (!import.meta.env.VITE_CLAUDE_MAX_TOKENS) {
        throw new Error('VITE_CLAUDE_MAX_TOKENS environment variable is required when Claude is enabled');
      }
      if (!import.meta.env.VITE_CLAUDE_TEMPERATURE) {
        throw new Error('VITE_CLAUDE_TEMPERATURE environment variable is required when Claude is enabled');
      }
      if (!import.meta.env.VITE_CLAUDE_BASE_URL) {
        throw new Error('VITE_CLAUDE_BASE_URL environment variable is required when Claude is enabled');
      }
      if (!import.meta.env.VITE_CLAUDE_API_VERSION) {
        throw new Error('VITE_CLAUDE_API_VERSION environment variable is required when Claude is enabled');
      }

      this.config.claude = {
        apiKey: claudeApiKey,
        timeout: 60000, // Longer timeout for larger context
        maxRetries: 2,
        retryDelay: 2000,
        model: import.meta.env.VITE_CLAUDE_MODEL,
        maxTokens: parseInt(import.meta.env.VITE_CLAUDE_MAX_TOKENS),
        temperature: parseFloat(import.meta.env.VITE_CLAUDE_TEMPERATURE),
        baseUrl: import.meta.env.VITE_CLAUDE_BASE_URL,
        apiVersion: import.meta.env.VITE_CLAUDE_API_VERSION
      };
      // Validate parsed values
      if (isNaN(this.config.claude.maxTokens)) {
        throw new Error('VITE_CLAUDE_MAX_TOKENS must be a valid number');
      }
      if (isNaN(this.config.claude.temperature)) {
        throw new Error('VITE_CLAUDE_TEMPERATURE must be a valid number');
      }

      logger.debug('Claude configuration loaded (enabled via feature flag)', {
        model: this.config.claude.model,
        maxTokens: this.config.claude.maxTokens,
        temperature: this.config.claude.temperature,
        baseUrl: this.config.claude.baseUrl,
        apiVersion: this.config.claude.apiVersion
      });
    } else if (claudeEnabled && !claudeApiKey) {
      logger.warn('Claude enabled but API key not configured');
    } else {
      logger.info('Claude disabled via feature flag');
    }

    // Log overall configuration status
    if (!this.config.perplexity && !this.config.claude) {
      logger.error('No LLM providers configured or enabled');
    }
  }

  /**
   * Create or get cached service instance
   */
  createService(provider: string): ILLMService {
    // Check cache first
    if (this.services.has(provider)) {
      logger.debug(`Returning cached ${provider} service`);
      return this.services.get(provider)!;
    }

    let service: ILLMService;

    switch (provider) {
      case LLMProviderType.PERPLEXITY:
        if (!this.config.perplexity) {
          throw new Error('Perplexity API key not configured');
        }
        service = new PerplexityAdapter(this.config.perplexity);
        break;
      
      case LLMProviderType.CLAUDE:
        if (!this.config.claude) {
          throw new Error('Claude API key not configured');
        }
        service = new ClaudeAdapter(this.config.claude);
        break;
      
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }

    // Cache the service
    this.services.set(provider, service);
    logger.info(`Created new ${provider} service instance`);
    
    return service;
  }

  /**
   * Select optimal provider based on data size
   * Returns Perplexity for small data, Claude for large data
   */
  selectOptimalProvider(dataSize: number): ILLMService {
    const estimatedTokens = Math.ceil(dataSize / 4); // 1 token ≈ 4 characters
    const perplexityLimit = 3200; // 80% of 4000 tokens for safety

    logger.debug(`Selecting provider for data size: ${dataSize} chars (≈${estimatedTokens} tokens)`);

    if (estimatedTokens <= perplexityLimit && this.config.perplexity) {
      logger.info('Selected Perplexity for small dataset');
      return this.createService(LLMProviderType.PERPLEXITY);
    } else if (this.config.claude) {
      logger.info('Selected Claude for large dataset');
      return this.createService(LLMProviderType.CLAUDE);
    } else if (this.config.perplexity) {
      logger.warn('Claude not available, attempting Perplexity despite large dataset');
      return this.createService(LLMProviderType.PERPLEXITY);
    } else {
      throw new Error('No LLM providers configured');
    }
  }

  /**
   * Analyze accounting quality with automatic fallback chain
   * Tries Perplexity first, falls back to Claude if needed
   */
  async analyzeWithFallback(rawData: any): Promise<any> {
    const dataString = JSON.stringify(rawData);
    const dataSize = dataString.length;
    
    logger.info(`Starting LLM analysis with fallback chain (data size: ${dataSize} chars)`);

    // Try Perplexity first if data fits
    if (this.config.perplexity) {
      try {
        const perplexityService = this.createService(LLMProviderType.PERPLEXITY);
        
        // Check if data fits within Perplexity's limits
        if (perplexityService.validateTokenLimit(rawData)) {
          logger.info('Attempting analysis with Perplexity');
          const result = await perplexityService.analyzeAccountingQuality(rawData);
          logger.info('Successfully analyzed with Perplexity');
          return result;
        } else {
          logger.warn('Data exceeds Perplexity token limit, skipping to Claude');
        }
      } catch (error: any) {
        logger.error('Perplexity analysis failed', { error: error.message });
        
        // Show toast notification about switching to Claude
        if (this.config.claude) {
          toast.warning('Switching to Claude AI due to data size or Perplexity error. Retrying analysis...', 7000);
        }
      }
    }

    // Try Claude as fallback
    if (this.config.claude) {
      try {
        const claudeService = this.createService(LLMProviderType.CLAUDE);
        logger.info('Attempting analysis with Claude (fallback)');
        
        const result = await claudeService.analyzeAccountingQuality(rawData);
        logger.info('Successfully analyzed with Claude');
        
        // Show success toast
        toast.success('Analysis completed successfully using Claude AI', 5000);
        
        return result;
      } catch (error: any) {
        logger.error('Claude analysis failed', { error: error.message });
        toast.error('Failed to analyze data with both Perplexity and Claude. Please try again.', 8000);
        throw new Error(`All LLM providers failed. Last error: ${error.message}`);
      }
    }

    // No providers available or all failed
    logger.error('No LLM providers available or all attempts failed');
    toast.error('No AI providers available for analysis. Please check configuration.', 8000);
    throw new Error('No LLM providers available for analysis');
  }

  /**
   * Health check for all configured providers
   */
  async healthCheckAll(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};

    if (this.config.perplexity) {
      try {
        const service = this.createService(LLMProviderType.PERPLEXITY);
        results.perplexity = await service.healthCheck();
      } catch (error) {
        logger.error('Perplexity health check error', error);
        results.perplexity = false;
      }
    }

    if (this.config.claude) {
      try {
        const service = this.createService(LLMProviderType.CLAUDE);
        results.claude = await service.healthCheck();
      } catch (error) {
        logger.error('Claude health check error', error);
        results.claude = false;
      }
    }

    logger.info('Health check results', results);
    return results;
  }

  /**
   * Clear service cache
   */
  clearCache() {
    this.services.clear();
    logger.debug('Service cache cleared');
  }
}