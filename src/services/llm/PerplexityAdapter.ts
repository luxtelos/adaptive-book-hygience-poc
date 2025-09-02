/**
 * Perplexity AI adapter implementation for LLM service abstraction
 * Handles communication with Perplexity API using sonar-reasoning-pro model
 */

import { BaseLLMService } from "./BaseLLMService";
import { LLMProvider, LLMMessage, LLMResponse, LLMConfig } from "./types";
import { logger } from "@/lib/logger";

export class PerplexityAdapter extends BaseLLMService {
  private readonly API_BASE_URL = "https://api.perplexity.ai";
  private promptCache: string | null = null;

  constructor(config: LLMConfig) {
    const provider: LLMProvider = {
      name: "perplexity",
      maxTokens: 4000,
      costPer1kTokens: 0.0002,
      apiEndpoint: "https://api.perplexity.ai/chat/completions",
    };

    super(config, provider);
    logger.info("PerplexityAdapter initialized with sonar-reasoning-pro model");
  }

  /**
   * Load the hygiene assessment prompt from public directory
   */
  private async loadAssessmentPrompt(): Promise<string> {
    if (this.promptCache) {
      return this.promptCache;
    }

    try {
      const response = await fetch("/hygiene-assessment-prompt.txt");
      if (!response.ok) {
        throw new Error(
          `Failed to load assessment prompt: ${response.statusText}`,
        );
      }
      this.promptCache = await response.text();
      logger.debug("Assessment prompt loaded and cached");
      return this.promptCache;
    } catch (error) {
      logger.error("Failed to load hygiene assessment prompt", error);
      throw error;
    }
  }

  /**
   * Make Perplexity-specific API request
   */
  protected async makeProviderSpecificRequest(
    messages: LLMMessage[],
    signal: AbortSignal,
  ): Promise<LLMResponse> {
    const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model || "sonar-reasoning-pro",
        messages,
        max_tokens: this.provider.maxTokens,
        temperature: this.config.temperature || 0.1,
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Perplexity API error", {
        status: response.status,
        statusText: response.statusText,
        errorBody,
      });
      throw new Error(
        `Perplexity API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    // Validate response structure
    if (
      !result.choices ||
      !result.choices[0] ||
      !result.choices[0].message ||
      !result.choices[0].message.content
    ) {
      logger.error("Invalid Perplexity response structure", { result });
      throw new Error("Invalid response structure from Perplexity API");
    }

    return {
      content: result.choices[0].message.content,
      tokensUsed: result.usage?.total_tokens || 0,
      provider: "perplexity",
      model: "sonar-reasoning-pro",
    };
  }

  /**
   * Analyze accounting quality using Perplexity AI
   */
  async analyzeAccountingQuality(rawData: any): Promise<any> {
    logger.info("Starting accounting quality analysis with Perplexity");

    // Check token limit before proceeding
    if (!this.validateTokenLimit(rawData)) {
      logger.warn("Data exceeds Perplexity token limit");
      throw new Error("Data size exceeds Perplexity token limit (4000 tokens)");
    }

    try {
      // Load assessment prompt
      const systemPrompt = await this.loadAssessmentPrompt();

      // Send raw QBO data directly to LLM without any formatting
      const formattedData = JSON.stringify(rawData);

      // Create messages for API
      const messages: LLMMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: formattedData },
      ];

      // Make API request
      const response = await this.makeAPIRequest(messages);

      // Parse the response
      const assessmentResult = this.parseAssessmentResponse(response.content);

      return {
        assessmentResult,
        rawLLMResponse: response.content,
        provider: this.provider.name,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      logger.error(
        "Failed to analyze accounting quality with Perplexity",
        error,
      );
      throw error;
    }
  }

  /**
   * Parse the LLM text response to extract structured assessment result
   */
  private parseAssessmentResponse(response: string): any {
    logger.debug("Parsing Perplexity response");

    // Extract overall score
    let overallScore = 0;
    const scorePatterns = [
      /Overall\s+(?:Health\s+)?Score[:\s]*(\d+)(?:\/100)?/i,
      /Health\s+Score[:\s]*(\d+)(?:\/100)?/i,
      /(\d+)\s*\/\s*100/i,
    ];

    for (const pattern of scorePatterns) {
      const match = response.match(pattern);
      if (match) {
        overallScore = parseInt(match[1]);
        break;
      }
    }

    // Extract readiness status
    let readinessStatus = "ADDITIONAL_CLEANUP_REQUIRED";
    if (response.match(/READY\s+FOR\s+MONTHLY\s+OPERATIONS/i)) {
      readinessStatus = "READY_FOR_MONTHLY_OPERATIONS";
    } else if (response.match(/MINOR\s+FIXES\s+NEEDED/i)) {
      readinessStatus = "MINOR_FIXES_NEEDED";
    }

    // Extract sections
    const section1 = this.extractBusinessOwnerSection(response);
    const section2 = this.extractBookkeeperSection(response);
    const metadata = this.extractMetadata(response);

    return {
      overallScore,
      readinessStatus,
      businessOwnerSummary: section1,
      bookkeeperReport: section2,
      assessmentMetadata: metadata,
    };
  }

  private extractBusinessOwnerSection(response: string): any {
    const healthScoreMatch = response.match(
      /(?:Health|Overall)\s+Score[:\s]*(\d+\/100)/i,
    );
    const healthScore = healthScoreMatch ? healthScoreMatch[1] : "";

    const whatThisMeansMatch = response.match(
      /WHAT\s+THIS\s+MEANS[:\s]*([\s\S]*?)(?=KEY\s+FINDINGS|RECOMMENDED|##|$)/i,
    );
    const whatThisMeans = whatThisMeansMatch
      ? whatThisMeansMatch[1].trim()
      : "";

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

  private extractBookkeeperSection(response: string): any {
    const criticalIssues: any[] = [];
    const issuesMatch = response.match(
      /CRITICAL\s+ISSUES[:\s]*([\s\S]*?)(?=RECOMMENDED\s+IMPROVEMENTS|ONGOING|##|$)/i,
    );
    if (issuesMatch) {
      const priorityMatches = issuesMatch[1].matchAll(
        /Priority\s+(\d+)[:\s]*([^\n]+)/gi,
      );
      let priority = 1;
      for (const match of priorityMatches) {
        criticalIssues.push({
          priority: priority++,
          pillar: "General",
          issue: match[2].trim(),
          qboLocation: "QuickBooks Online",
          fixSteps: "See detailed report",
          estimatedTime: "1-2 hours",
        });
      }
    }

    const recommendedImprovements: string[] = [];
    const improvementsMatch = response.match(
      /RECOMMENDED\s+IMPROVEMENTS[:\s]*([\s\S]*?)(?=ONGOING|##|$)/i,
    );
    if (improvementsMatch) {
      const bullets = improvementsMatch[1].match(/[•●▪-]\s*([^\n]+)/g);
      if (bullets) {
        bullets.forEach((bullet) => {
          recommendedImprovements.push(bullet.replace(/[•●▪-]\s*/, "").trim());
        });
      }
    }

    const ongoingMaintenance: string[] = [];
    const maintenanceMatch = response.match(
      /ONGOING\s+MAINTENANCE[:\s]*([\s\S]*?)(?=##|ASSESSMENT\s+METHODOLOGY|$)/i,
    );
    if (maintenanceMatch) {
      const bullets = maintenanceMatch[1].match(/[•●▪-]\s*([^\n]+)/g);
      if (bullets) {
        bullets.forEach((bullet) => {
          ongoingMaintenance.push(bullet.replace(/[•●▪-]\s*/, "").trim());
        });
      }
    }

    return {
      criticalIssues,
      recommendedImprovements,
      ongoingMaintenance,
    };
  }

  private extractMetadata(response: string): any {
    return {
      assessmentDate: new Date().toISOString(),
      dataPeriod: "Last 90 days",
      scoringModel: "Day-30 Readiness Framework",
      limitations: [],
    };
  }

  /**
   * Health check for Perplexity service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testMessages: LLMMessage[] = [{ role: "user", content: "Test" }];

      const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-reasoning-pro",
          messages: testMessages,
          max_tokens: 10,
          temperature: 0.1,
          stream: false,
        }),
      });

      const isHealthy = response.ok;
      logger.debug(`Perplexity health check: ${isHealthy ? "OK" : "FAILED"}`);
      return isHealthy;
    } catch (error) {
      logger.error("Perplexity health check failed", error);
      return false;
    }
  }
}
