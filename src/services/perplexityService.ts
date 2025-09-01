import { logger } from "../lib/logger";
import { FivePillarRawData, RawDataFormatter } from "./rawDataFormatter";
import { LLMInputFormatter } from "./llmInputFormatter";
import { LLMServiceFactory } from "./llm/LLMServiceFactory";

/**
 * @file perplexityService.ts
 * @description Service for integrating with Perplexity AI API to perform accounting quality assessments.
 *
 * This service handles communication with the Perplexity LLM API, formatting financial data
 * for analysis, and parsing the structured assessment results according to the Day-30
 * Readiness Scoring Model.
 */

// =================================================================================
// TYPE DEFINITIONS & INTERFACES
// =================================================================================

/**
 * Interface for individual pillar scores in the assessment.
 */
export interface HygienePillarScores {
  reconciliation: number; // 0-100, weighted 30%
  coaIntegrity: number; // 0-100, weighted 20%
  categorization: number; // 0-100, weighted 20%
  controlAccount: number; // 0-100, weighted 15%
  aging: number; // 0-100, weighted 15%
}

/**
 * Interface for the complete hygiene assessment result.
 */
export interface HygieneAssessmentResult {
  overallScore: number; // 0-100 composite score
  readinessStatus:
    | "READY_FOR_MONTHLY_OPERATIONS"
    | "MINOR_FIXES_NEEDED"
    | "ADDITIONAL_CLEANUP_REQUIRED";
  businessOwnerSummary: {
    healthScore: string;
    whatThisMeans: string;
    keyFindings: string[];
    nextSteps: string[];
  };
  bookkeeperReport: {
    criticalIssues: Array<{
      priority: number;
      pillar: string;
      issue: string;
      qboLocation: string;
      fixSteps: string;
      estimatedTime: string;
    }>;
    recommendedImprovements: string[];
    ongoingMaintenance: string[];
  };
  assessmentMetadata: {
    assessmentDate: string;
    dataPeriod: string;
    scoringModel: string;
    limitations?: string[];
  };
}

/**
 * Interface for the complete assessment response including raw LLM response.
 */
export interface CompleteAssessmentResponse {
  assessmentResult: HygieneAssessmentResult;
  rawLLMResponse: string; // The raw text response from Perplexity
  pdfUrl?: string; // Optional URL for PDF download
}

/**
 * Interface for QBO financial data package required for assessment.
 */
export interface QBODataPackage {
  bankReconciliation?: any[];
  generalLedger?: any;
  chartOfAccounts?: any[];
  trialBalance?: any;
  openingBalanceEquity?: any;
  undepositedFunds?: any[];
  arAging?: any;
  apAging?: any;
  auditLog?: any[];
  datePeriod: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Configuration for Perplexity API requests.
 */
interface PerplexityConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

/**
 * Custom error class for Perplexity API related issues.
 */
export class PerplexityError extends Error {
  constructor(
    public message: string,
    public statusCode?: number,
    public originalError?: any,
  ) {
    super(message);
    this.name = "PerplexityError";
  }
}

// =================================================================================
// PERPLEXITY SERVICE CLASS
// =================================================================================

export class PerplexityService {
  private readonly llmFactory: LLMServiceFactory;

  constructor(config?: Partial<PerplexityConfig>) {
    logger.debug("Initializing PerplexityService with LLM abstraction...");
    
    // Initialize the LLM factory (singleton)
    this.llmFactory = LLMServiceFactory.getInstance();
    
    logger.info("PerplexityService initialized with LLM abstraction layer");
  }


  // Note: loadAssessmentPrompt and makeAPIRequest methods are now handled by the LLM adapters

  /**
   * Parses the LLM text response to extract key findings and hygiene score.
   * The LLM now returns a plain text response that we parse using pattern matching.
   */
  private parseAssessmentResponse(response: string): HygieneAssessmentResult {
    try {
      // Handle empty or null responses
      if (!response || response.trim().length === 0) {
        logger.warn(
          "Empty response received from AI, returning default result",
        );
        return this.createDefaultAssessmentResult();
      }

      logger.info("Parsing text response from LLM");

      // Extract overall score using various patterns
      let overallScore = 0;
      const scorePatterns = [
        /Overall\s+(?:Health\s+)?Score[:\s]*(\d+)(?:\/100)?/i,
        /Health\s+Score[:\s]*(\d+)(?:\/100)?/i,
        /Score[:\s]*(\d+)(?:\/100)?/i,
        /(\d+)\s*\/\s*100\s*-\s*(?:READY|MINOR|ADDITIONAL|Excellent|Good|Fair|Needs\s+Attention|Critical)/i,
        /Composite\s+Score[:\s]*(\d+)(?:\/100)?/i,
      ];

      for (const pattern of scorePatterns) {
        const match = response.match(pattern);
        if (match) {
          overallScore = parseInt(match[1]);
          logger.info(`Extracted overall score: ${overallScore}`);
          break;
        }
      }

      // Extract score category
      let scoreCategory = "";
      const categoryPatterns = [
        /(Excellent|Good|Fair|Needs\s+Attention|Critical)\s*(?:-|\||$)/i,
        /Score\s*Category[:\s]*([^\n]+)/i,
        /\d+\/100\s*-\s*([^\n]+)/i,
      ];

      for (const pattern of categoryPatterns) {
        const match = response.match(pattern);
        if (match) {
          scoreCategory = match[1].trim();
          logger.info(`Extracted score category: ${scoreCategory}`);
          break;
        }
      }

      // Extract readiness status
      let readinessStatus:
        | "READY_FOR_MONTHLY_OPERATIONS"
        | "MINOR_FIXES_NEEDED"
        | "ADDITIONAL_CLEANUP_REQUIRED" = "ADDITIONAL_CLEANUP_REQUIRED";

      if (response.match(/READY\s+FOR\s+MONTHLY\s+OPERATIONS/i)) {
        readinessStatus = "READY_FOR_MONTHLY_OPERATIONS";
      } else if (response.match(/MINOR\s+FIXES\s+NEEDED|NEEDS\s+CLEANUP/i)) {
        readinessStatus = "MINOR_FIXES_NEEDED";
      }

      // Extract key findings
      const keyFindings: string[] = [];
      const findingsSection = response.match(
        /KEY\s+FINDINGS[:\s]*([\s\S]*?)(?=RECOMMENDED|NEXT\s+STEPS|PILLAR|##|$)/i,
      );
      if (findingsSection) {
        const findingsText = findingsSection[1];

        // Look for sections with emojis (✅ STRONG AREAS and ⚠️ AREAS NEEDING ATTENTION)
        const strongAreas = findingsText.match(
          /✅\s*STRONG\s+AREAS[:\s]*([\s\S]*?)(?=⚠️|💰|####|$)/i,
        );
        const needsAttention = findingsText.match(
          /⚠️\s*AREAS\s+NEEDING\s+ATTENTION[:\s]*([\s\S]*?)(?=💰|####|$)/i,
        );
        const businessImpact = findingsText.match(
          /💰\s*BUSINESS\s+IMPACT[:\s]*([\s\S]*?)(?=####|###|$)/i,
        );

        // Extract items from each section
        const extractItems = (text: string | null) => {
          if (!text) return [];
          const items: string[] = [];
          const bulletPoints = text.match(/[•\-*]\s*([^\n]+)/g) || [];
          bulletPoints.forEach((item) => {
            const cleaned = item.replace(/^[•\-*\s]+/, "").trim();
            if (cleaned && cleaned.length > 5) {
              items.push(cleaned);
            }
          });
          return items;
        };

        if (strongAreas) {
          extractItems(strongAreas[1]).forEach((item) =>
            keyFindings.push(`✅ ${item}`),
          );
        }
        if (needsAttention) {
          extractItems(needsAttention[1]).forEach((item) =>
            keyFindings.push(`⚠️ ${item}`),
          );
        }
        if (businessImpact) {
          extractItems(businessImpact[1]).forEach((item) =>
            keyFindings.push(`💰 ${item}`),
          );
        }

        // Fallback to general bullet points if no emoji sections found
        if (keyFindings.length === 0) {
          const bulletPoints = findingsText.match(/[•\-*]\s*([^\n]+)/g) || [];
          const numberedItems = findingsText.match(/\d+\.\s*([^\n]+)/g) || [];

          [...bulletPoints, ...numberedItems].forEach((item) => {
            const cleaned = item.replace(/^[•\-*\d\.\s]+/, "").trim();
            if (cleaned && cleaned.length > 5) {
              keyFindings.push(cleaned);
            }
          });
        }
      }

      // If no structured findings, extract sentences that look like findings
      if (keyFindings.length === 0) {
        const findingPatterns = [
          /(?:found|identified|detected|discovered)\s+([^.]+)/gi,
          /(?:issue|problem|concern)\s+(?:is|with)\s+([^.]+)/gi,
          /(?:missing|incomplete|unreconciled)\s+([^.]+)/gi,
        ];

        for (const pattern of findingPatterns) {
          const matches = response.matchAll(pattern);
          for (const match of matches) {
            if (match[1] && match[1].length > 10) {
              keyFindings.push(match[1].trim());
              if (keyFindings.length >= 5) break;
            }
          }
          if (keyFindings.length >= 5) break;
        }
      }

      // Pillar scores no longer extracted as we only use raw QBO data

      // Extract next steps
      const nextSteps: string[] = [];
      const nextStepsSection = response.match(
        /(?:RECOMMENDED\s+)?NEXT\s+STEPS[:\s]*([\s\S]*?)(?=PILLAR|TECHNICAL|$)/i,
      );
      if (nextStepsSection) {
        const stepsText = nextStepsSection[1];
        const bulletPoints = stepsText.match(/[•\-*]\s*([^\n]+)/g) || [];
        const numberedItems = stepsText.match(/\d+\.\s*([^\n]+)/g) || [];

        [...bulletPoints, ...numberedItems].forEach((item) => {
          const cleaned = item.replace(/^[•\-*\d\.\s]+/, "").trim();
          if (cleaned && cleaned.length > 5) {
            nextSteps.push(cleaned);
          }
        });
      }

      // Build the result
      const result: HygieneAssessmentResult = {
        overallScore,
        readinessStatus,
        businessOwnerSummary: {
          healthScore: scoreCategory ? `${overallScore}/100 - ${scoreCategory}` : `${overallScore}/100`,
          whatThisMeans: this.extractWhatThisMeans(response, overallScore),
          keyFindings: keyFindings,
          nextSteps: nextSteps,
        },
        bookkeeperReport: {
          criticalIssues: this.extractCriticalIssues(response),
          recommendedImprovements:
            this.extractRecommendedImprovements(response),
          ongoingMaintenance: this.extractOngoingMaintenance(response),
        },
        assessmentMetadata: {
          assessmentDate: new Date().toISOString().split("T")[0],
          dataPeriod: this.extractDataPeriod(response),
          scoringModel: "Day-30 Readiness Framework",
          limitations: this.extractLimitations(response),
        },
      };

      logger.info("Successfully parsed text response", {
        overallScore: result.overallScore,
        readinessStatus: result.readinessStatus,
        keyFindingsCount: result.businessOwnerSummary.keyFindings.length,
      });

      return result;
    } catch (error) {
      logger.error("Failed to parse LLM text response", {
        response:
          response.substring(0, 500) + (response.length > 500 ? "..." : ""),
        error,
      });

      // Return a default result instead of throwing to maintain service availability
      logger.info("Returning default assessment result due to parsing failure");
      return this.createDefaultAssessmentResult();
    }
  }

  /**
   * Extract "What This Means" section from text response
   */
  private extractWhatThisMeans(response: string, score: number): string {
    const patterns = [
      /WHAT\s+THIS\s+MEANS[:\s]*([^\n]+(?:\n(?!\n)[^\n]+)*)/i,
      /(?:Your\s+)?(?:financial\s+)?books\s+(?:are|scored)[^.]+\.[^.]+\./i,
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        return match[1] ? match[1].trim() : match[0].trim();
      }
    }

    // No fallback - LLM must provide this
    return '';
  }

  /**
   * Extract critical issues from text response
   */
  private extractCriticalIssues(response: string): Array<{
    priority: number;
    pillar: string;
    issue: string;
    qboLocation: string;
    fixSteps: string;
    estimatedTime: string;
  }> {
    const issues: any[] = [];
    const criticalSection = response.match(
      /CRITICAL\s+ISSUES[:\s]*([\s\S]*?)(?=RECOMMENDED|ONGOING|$)/i,
    );

    if (criticalSection) {
      const text = criticalSection[1];
      const priorityMatches = text.matchAll(/Priority\s*(\d+)[:\s]*([^\n]+)/gi);

      let priority = 1;
      for (const match of priorityMatches) {
        issues.push({
          priority: parseInt(match[1]) || priority++,
          pillar: "General",
          issue: match[2].trim(),
          qboLocation: "QuickBooks Online",
          fixSteps: "See detailed report",
          estimatedTime: "To be determined",
        });
      }
    }

    return issues;
  }

  /**
   * Extract recommended improvements from text response
   */
  private extractRecommendedImprovements(response: string): string[] {
    const improvements: string[] = [];
    const section = response.match(
      /RECOMMENDED\s+IMPROVEMENTS[:\s]*([\s\S]*?)(?=ONGOING|$)/i,
    );

    if (section) {
      const text = section[1];
      const items = text.match(/[•\-*]\s*([^\n]+)/g) || [];

      items.forEach((item) => {
        const cleaned = item.replace(/^[•\-*\s]+/, "").trim();
        if (cleaned && cleaned.length > 5) {
          improvements.push(cleaned);
        }
      });
    }

    return improvements;
  }

  /**
   * Extract ongoing maintenance tasks from text response
   */
  private extractOngoingMaintenance(response: string): string[] {
    const maintenance: string[] = [];
    const section = response.match(
      /ONGOING\s+MAINTENANCE[:\s]*([\s\S]*?)(?=$)/i,
    );

    if (section) {
      const text = section[1];
      const items = text.match(/[•\-*]\s*([^\n]+)/g) || [];

      items.forEach((item) => {
        const cleaned = item.replace(/^[•\-*\s]+/, "").trim();
        if (cleaned && cleaned.length > 5) {
          maintenance.push(cleaned);
        }
      });
    }

    return maintenance;
  }

  /**
   * Extract data period from text response
   */
  private extractDataPeriod(response: string): string {
    const match = response.match(/Data\s+Period[:\s]*([^\n]+)/i);
    return match ? match[1].trim() : "Current Period";
  }

  /**
   * Extract limitations from text response
   */
  private extractLimitations(response: string): string[] | undefined {
    const limitations: string[] = [];
    const section = response.match(/Limitations[:\s]*([\s\S]*?)(?=$|\n\n)/i);

    if (section) {
      const text = section[1];
      const items = text.match(/[•\-*]\s*([^\n]+)/g) || [];

      items.forEach((item) => {
        const cleaned = item.replace(/^[•\-*\s]+/, "").trim();
        if (cleaned && cleaned.length > 5) {
          limitations.push(cleaned);
        }
      });
    }

    return limitations.length > 0 ? limitations : undefined;
  }

  /**
   * Creates a default assessment result for cases where AI response cannot be parsed
   */
  private createDefaultAssessmentResult(): HygieneAssessmentResult {
    return {
      overallScore: 0,
      readinessStatus: "ADDITIONAL_CLEANUP_REQUIRED",
      businessOwnerSummary: {
        healthScore: '',
        whatThisMeans: '',
        keyFindings: [],
        nextSteps: [],
      },
      bookkeeperReport: {
        criticalIssues: [],
        recommendedImprovements: [],
        ongoingMaintenance: [],
      },
      assessmentMetadata: {
        assessmentDate: new Date().toISOString().split("T")[0],
        dataPeriod: '',
        scoringModel: "Day-30 Readiness Framework",
        limitations: [
          "Assessment could not be completed due to parsing errors",
        ],
      },
    };
  }

  /**
   * Parses the new structured format as defined in hygiene-assessment-prompt.txt
   */
  private parseNewStructuredFormat(parsed: any): HygieneAssessmentResult {
    try {
      // Extract basic scores and status with validation
      const overallScore = this.validateScore(parsed.overallScore);

      // Map readiness status to expected enum values
      let readinessStatus:
        | "READY_FOR_MONTHLY_OPERATIONS"
        | "MINOR_FIXES_NEEDED"
        | "ADDITIONAL_CLEANUP_REQUIRED";
      const rawStatus = parsed.readinessStatus || "";
      if (rawStatus.includes("READY FOR MONTHLY OPERATIONS")) {
        readinessStatus = "READY_FOR_MONTHLY_OPERATIONS";
      } else if (
        rawStatus.includes("MINOR FIXES") ||
        rawStatus.includes("NEEDS CLEANUP")
      ) {
        readinessStatus = "MINOR_FIXES_NEEDED";
      } else {
        readinessStatus = "ADDITIONAL_CLEANUP_REQUIRED";
      }

      // Extract Section 1: Executive Summary (Business Owner)
      const section1 = parsed.section1_executiveSummary || {};
      const businessOwnerSummary = {
        healthScore: section1.healthScore || '',
        whatThisMeans: section1.whatThisMeans || '',
        keyFindings: Array.isArray(section1.keyFindings)
          ? section1.keyFindings
          : [],
        nextSteps: Array.isArray(section1.recommendedNextSteps)
          ? section1.recommendedNextSteps
          : [],
      };

      // Extract Section 2: Detailed Results (Optional pillar breakdown info)
      const section2 = parsed.section2_detailedResults || {};
      // This section provides additional context but doesn't change the main structure

      // Extract Section 3: Technical Remediation (Bookkeeper)
      const section3 = parsed.section3_technicalRemediation || {};
      const criticalIssues = Array.isArray(section3.criticalIssues)
        ? section3.criticalIssues.map((issue: any, index: number) => ({
            priority: issue.priority || index + 1,
            pillar: this.mapIssueToPillar(
              issue.issueDescription || issue.problem || "Unknown",
            ),
            issue:
              issue.issueDescription ||
              issue.problem ||
              "Critical issue identified",
            qboLocation: issue.qboLocation || "QuickBooks Online",
            fixSteps:
              issue.fixSteps ||
              "Contact your bookkeeper for detailed remediation steps",
            estimatedTime: issue.estimatedTime || "To be determined",
          }))
        : [];

      // Convert recommended improvements to string array format
      const recommendedImprovements = Array.isArray(
        section3.recommendedImprovements,
      )
        ? section3.recommendedImprovements.map((item: any) =>
            typeof item === "string"
              ? item
              : `${item.area || "General"}: ${item.description || item.task || "Improvement recommended"}`,
          )
        : [];

      // Convert ongoing maintenance to string array format
      const ongoingMaintenance = Array.isArray(section3.ongoingMaintenance)
        ? section3.ongoingMaintenance.map((item: any) =>
            typeof item === "string"
              ? item
              : `${item.frequency || "Regular"}: ${item.task || "Maintenance task"} (${item.qboPath || "QuickBooks Online"})`,
          )
        : [];

      // Extract Section 4: Scoring Transparency
      const section4 = parsed.section4_scoringTransparency || {};
      const assessmentMetadata = {
        assessmentDate:
          section4.assessmentDate || new Date().toISOString().split("T")[0],
        dataPeriod: section4.dataPeriodAnalyzed || "Current Period",
        scoringModel: section4.scoringModel || "Day-30 Readiness Framework",
        limitations: Array.isArray(section4.limitations)
          ? section4.limitations
          : undefined,
      };

      const result: HygieneAssessmentResult = {
        overallScore,
        readinessStatus,
        businessOwnerSummary,
        bookkeeperReport: {
          criticalIssues,
          recommendedImprovements,
          ongoingMaintenance,
        },
        assessmentMetadata,
      };

      return result;
    } catch (error) {
      logger.error(
        "Error parsing new structured format, falling back to default",
        error,
      );
      return this.createDefaultAssessmentResult();
    }
  }

  /**
   * Fallback parser for legacy format responses
   */
  private parseLegacyFormat(parsed: any): HygieneAssessmentResult {
    // Return AI insights with placeholder scores
    // Actual scores will be preserved from PillarScoringService calculations
    const result: HygieneAssessmentResult = {
      // These scores are placeholders - will be replaced with calculated scores
      overallScore: parsed.overallScore || 0,
      readinessStatus: parsed.readinessStatus || "ADDITIONAL_CLEANUP_REQUIRED",
      // AI-generated insights and recommendations
      businessOwnerSummary: {
        healthScore: parsed.businessOwnerSummary?.healthScore || '',
        whatThisMeans: parsed.businessOwnerSummary?.whatThisMeans || '',
        keyFindings: parsed.businessOwnerSummary?.keyFindings || [],
        nextSteps: parsed.businessOwnerSummary?.nextSteps || [],
      },
      bookkeeperReport: {
        criticalIssues: parsed.bookkeeperReport?.criticalIssues || [],
        recommendedImprovements:
          parsed.bookkeeperReport?.recommendedImprovements || [],
        ongoingMaintenance: parsed.bookkeeperReport?.ongoingMaintenance || [],
      },
      assessmentMetadata: {
        assessmentDate: new Date().toISOString().split("T")[0],
        dataPeriod: parsed.assessmentMetadata?.dataPeriod || "Unknown",
        scoringModel: "Day-30 Readiness Framework with AI Enhancement",
        limitations: parsed.assessmentMetadata?.limitations,
      },
    };

    return result;
  }

  /**
   * Maps an issue description to the appropriate pillar name
   */
  private mapIssueToPillar(issueDescription: string): string {
    const issue = issueDescription.toLowerCase();

    if (
      issue.includes("reconcil") ||
      issue.includes("bank") ||
      issue.includes("credit card")
    ) {
      return "Bank & Credit Card Matching";
    }
    if (
      issue.includes("chart of accounts") ||
      issue.includes("coa") ||
      issue.includes("account structure")
    ) {
      return "Money Organization System";
    }
    if (
      issue.includes("categor") ||
      issue.includes("uncategor") ||
      issue.includes("transaction")
    ) {
      return "Transaction Categorization";
    }
    if (
      issue.includes("control") ||
      issue.includes("opening balance") ||
      issue.includes("undeposited")
    ) {
      return "Control Account Accuracy";
    }
    if (
      issue.includes("receivable") ||
      issue.includes("payable") ||
      issue.includes("aging") ||
      issue.includes("customer") ||
      issue.includes("vendor")
    ) {
      return "Customer/Vendor Balances";
    }

    return "General";
  }

  /**
   * Validates and normalizes score values to ensure they're within 0-100 range
   */
  private validateScore(score: any): number {
    if (typeof score === "number" && !isNaN(score)) {
      return Math.max(0, Math.min(100, Math.round(score)));
    }
    if (typeof score === "string") {
      const parsed = parseFloat(score);
      if (!isNaN(parsed)) {
        return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }
    return 0; // Default to 0 for invalid scores
  }

  /**
   * Performs a complete accounting quality assessment using LLM service abstraction.
   * Automatically handles fallback from Perplexity to Claude based on data size.
   */
  public async analyzeAccountingQuality(
    rawData: FivePillarRawData | QBODataPackage | any,
  ): Promise<CompleteAssessmentResponse> {
    logger.info("Starting accounting quality assessment with LLM abstraction");

    try {
      // Validate webhook data structure
      const validation = this.validateWebhookAssessmentData(rawData);

      if (!validation.isComplete) {
        logger.warn("Webhook assessment data incomplete", {
          missingData: validation.missingData,
          warnings: validation.warnings,
        });
      }

      // Use the LLM factory to analyze with automatic fallback
      logger.info("Invoking LLM service factory with fallback chain");
      const llmResult = await this.llmFactory.analyzeWithFallback(rawData);
      
      // Extract the assessment result and raw response
      const assessmentResult = llmResult.assessmentResult;
      const rawLLMResponse = llmResult.rawLLMResponse;
      
      logger.debug(`Assessment completed with ${llmResult.provider} provider`);
      
      logger.info("Assessment complete", {
        overallScore: assessmentResult.overallScore,
        readinessStatus: assessmentResult.readinessStatus,
      });

      // Generate PDF if PDF API URL is configured
      let pdfUrl: string | undefined;
      if (import.meta.env.VITE_PDF_API_URL) {
        try {
          const pdfResponse = await this.generatePDF(rawLLMResponse);
          pdfUrl = pdfResponse.url;
        } catch (pdfError) {
          logger.error("Failed to generate PDF", pdfError);
          // Continue without PDF - it's optional
        }
      }

      return {
        assessmentResult,
        rawLLMResponse,
        pdfUrl,
      };
    } catch (error) {
      logger.error("Financial hygiene assessment failed", error);
      throw error instanceof PerplexityError
        ? error
        : new PerplexityError(
            `Assessment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            undefined,
            error,
          );
    }
  }

  /**
   * Formats raw QBO data for LLM analysis
   */
  private formatWebhookAssessmentDataForAnalysis(data: any): string {
    const sections = [];

    sections.push("=== QUICKBOOKS ONLINE DATA FOR ANALYSIS ===");
    sections.push("");

    // Include metadata if available
    if (data.meta) {
      sections.push(
        `Data Period: ${data.meta?.start_date} to ${data.meta?.end_date}`,
      );
      sections.push(`Company: ${data.meta?.companyName || "Unknown"}`);
      sections.push("");
    }

    sections.push("INSTRUCTIONS FOR ANALYSIS:");
    sections.push(
      "1. Calculate scores based on actual data quality and completeness",
    );
    sections.push(
      "2. Identify specific issues with exact dollar amounts and account names",
    );
    sections.push(
      "3. Provide actionable, QuickBooks-specific remediation steps",
    );
    sections.push("4. Use business-friendly language in the executive summary");
    sections.push("5. Be specific about locations in QuickBooks (menu paths)");
    sections.push("");
    sections.push("KEY VALUES TO HIGHLIGHT:");
    sections.push("• AR Balance (Accounts Receivable)");
    sections.push("• AP Balance (Accounts Payable)");
    sections.push("• Opening Balance Equity amount");
    sections.push("• Undeposited Funds amount");
    sections.push("• Number of chart of accounts");
    sections.push("• Uncategorized transaction amounts");
    sections.push("• Bank account balances");
    sections.push("");

    // Send the raw QBO data
    sections.push("RAW QUICKBOOKS DATA:");
    sections.push(JSON.stringify(data.rawQBOData || data, null, 2));
    logger.info("Sending raw QBO API data to LLM for analysis");

    return sections.join("\n");
  }

  /**
   * Validates webhook assessment data completeness
   */
  private validateWebhookAssessmentData(data: any): {
    isComplete: boolean;
    missingData: string[];
    warnings: string[];
  } {
    const missingData: string[] = [];
    const warnings: string[] = [];

    // Check basic structure
    if (!data.pillarData) {
      missingData.push("Pillar data is missing");
    }

    if (!data.currentAssessment) {
      missingData.push("Current assessment results are missing");
    }

    if (!data.financialMetrics) {
      missingData.push("Financial metrics are missing");
    }

    // Check data quality
    if (data.financialMetrics?.totalAccounts === 0) {
      missingData.push("No chart of accounts data");
    }

    if (data.financialMetrics?.bankAccounts === 0) {
      warnings.push("No bank accounts for reconciliation analysis");
    }

    // Check pillar data completeness
    if (data.pillarData?.chartIntegrity?.totals?.accounts === 0) {
      warnings.push("Chart of accounts data appears empty");
    }

    return {
      isComplete: missingData.length === 0,
      missingData,
      warnings,
    };
  }

  /**
   * Generate PDF from assessment text using VITE_PDF_API_URL
   */
  private async generatePDF(
    assessmentText: string,
  ): Promise<{ url?: string; error?: string }> {
    const pdfApiUrl = import.meta.env.VITE_PDF_API_URL;

    if (!pdfApiUrl) {
      logger.error("PDF API URL not configured");
      return { error: "PDF API URL not configured" };
    }

    try {
      logger.info("Sending assessment to PDF API");

      // Send text directly as plain text for PDF generation
      const response = await fetch(pdfApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: assessmentText,
      });

      if (!response.ok) {
        throw new Error(`PDF API returned ${response.status}`);
      }

      // Check response content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/pdf")) {
        logger.error("Invalid response type from PDF API", { contentType });
        throw new Error(`Invalid response type: ${contentType}`);
      }

      // Get PDF blob from response
      const pdfBlob = await response.blob();

      // Validate blob size
      if (pdfBlob.size === 0) {
        throw new Error("PDF API returned empty response");
      }

      // Create object URL for viewing/downloading
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Clean up URL after 5 minutes
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 300000);

      logger.info("PDF generated successfully", { size: pdfBlob.size });
      return { url: pdfUrl };
    } catch (error) {
      logger.error("Failed to generate PDF", error);
      return {
        error:
          error instanceof Error ? error.message : "Failed to generate PDF",
      };
    }
  }

  /**
   * Health check method to verify LLM service connectivity.
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Use the LLM factory to check health of all configured providers
      const healthResults = await this.llmFactory.healthCheckAll();
      
      // Return true if at least one provider is healthy
      const hasHealthyProvider = Object.values(healthResults).some(isHealthy => isHealthy);
      
      if (!hasHealthyProvider) {
        logger.error("No healthy LLM providers available");
      }
      
      return hasHealthyProvider;
    } catch (error) {
      logger.error("LLM service health check failed", error);
      return false;
    }
  }
}
