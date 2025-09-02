/**
 * Claude AI adapter implementation for LLM service abstraction
 * Handles communication with Anthropic's Claude API for large context window processing
 */

import { BaseLLMService } from "./BaseLLMService";
import { LLMProvider, LLMMessage, LLMResponse, LLMConfig } from "./types";
import { logger } from "@/lib/logger";

export class ClaudeAdapter extends BaseLLMService {
  private readonly API_BASE_URL: string;
  private promptCache: string | null = null;
  private readonly apiVersion: string;

  constructor(config: LLMConfig) {
    // Validate required configuration
    if (!config.baseUrl) {
      throw new Error("Claude baseUrl is required in configuration");
    }
    if (!config.maxTokens) {
      throw new Error("Claude maxTokens is required in configuration");
    }
    if (!config.apiVersion) {
      throw new Error("Claude apiVersion is required in configuration");
    }
    if (!config.model) {
      throw new Error("Claude model is required in configuration");
    }
    if (config.temperature === undefined || config.temperature === null) {
      throw new Error("Claude temperature is required in configuration");
    }

    const provider: LLMProvider = {
      name: "claude",
      maxTokens: config.maxTokens,
      costPer1kTokens: 0.003,
      apiEndpoint: `${config.baseUrl}/messages`,
    };

    super(config, provider);

    // Set API base URL from config
    this.API_BASE_URL = config.baseUrl;
    this.apiVersion = config.apiVersion;

    logger.info(`ClaudeAdapter initialized with ${config.model} model`, {
      baseUrl: this.API_BASE_URL,
      maxTokens: config.maxTokens,
      apiVersion: this.apiVersion,
      temperature: config.temperature,
    });
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
      logger.debug("Assessment prompt loaded and cached for Claude");
      return this.promptCache;
    } catch (error) {
      logger.error(
        "Failed to load hygiene assessment prompt for Claude",
        error,
      );
      throw error;
    }
  }

  /**
   * Make Claude-specific API request
   */
  protected async makeProviderSpecificRequest(
    messages: LLMMessage[],
    signal: AbortSignal,
  ): Promise<LLMResponse> {
    // Claude API requires a specific format - system message is separate
    const systemMessage = messages.find((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch(`${this.API_BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.config.apiKey,
        "anthropic-version": this.apiVersion,
        "anthropic-dangerous-direct-browser-access": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: nonSystemMessages,
        system: systemMessage?.content || "",
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Claude API error", {
        status: response.status,
        statusText: response.statusText,
        errorBody,
      });
      throw new Error(
        `Claude API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    return {
      content: result.content[0].text,
      tokensUsed:
        (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
      provider: "claude",
      model: result.model,
    };
  }

  /**
   * Analyze accounting quality using Claude AI
   */
  async analyzeAccountingQuality(rawData: any): Promise<any> {
    logger.info(
      "Starting accounting quality analysis with Claude (large dataset)",
    );

    try {
      // Load assessment prompt
      const systemPrompt = await this.loadAssessmentPrompt();

      // Send raw QBO data directly to LLM without any formatting
      const formattedData = JSON.stringify(rawData);

      logger.debug(
        `Formatted data size: ${formattedData.length} chars, estimated tokens: ${this.estimateTokens(formattedData)}`,
      );

      // Create messages for API
      const messages: LLMMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: formattedData },
      ];

      // Make API request
      const response = await this.makeAPIRequest(messages);

      // Parse the response (same format as Perplexity)
      const assessmentResult = this.parseAssessmentResponse(response.content);

      return {
        assessmentResult,
        rawLLMResponse: response.content,
        provider: this.provider.name,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      logger.error("Failed to analyze accounting quality with Claude", error);
      throw error;
    }
  }

  /**
   * Parse the LLM text response to extract structured assessment result
   * Uses the same parsing logic as Perplexity for consistency
   */
  private parseAssessmentResponse(response: string): any {
    logger.debug("Parsing Claude response");

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

    // Extract sections (reusing same logic for consistency)
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
      scoringModel: "Day-30 Readiness Framework (Claude)",
      limitations: [],
    };
  }

  /**
   * Health check for Claude service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testMessages: LLMMessage[] = [{ role: "user", content: "Test" }];

      const response = await fetch(`${this.API_BASE_URL}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": this.config.apiKey,
          "anthropic-version": this.apiVersion,
          "anthropic-dangerous-direct-browser-access": "true",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: testMessages,
          max_tokens: 10,
          temperature: this.config.temperature,
        }),
      });

      const isHealthy = response.ok;
      logger.debug(`Claude health check: ${isHealthy ? "OK" : "FAILED"}`);
      return isHealthy;
    } catch (error) {
      logger.error("Claude health check failed", error);
      return false;
    }
  }
}
