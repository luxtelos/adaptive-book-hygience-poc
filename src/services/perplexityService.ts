import { logger } from "../lib/logger";
import { FivePillarRawData, RawDataFormatter } from "./rawDataFormatter";

/**
 * @file perplexityService.ts
 * @description Service for integrating with Perplexity AI API to perform financial hygiene assessments.
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
  coaIntegrity: number;   // 0-100, weighted 20%
  categorization: number; // 0-100, weighted 20%
  controlAccount: number; // 0-100, weighted 15%
  aging: number;         // 0-100, weighted 15%
}

/**
 * Interface for the complete hygiene assessment result.
 */
export interface HygieneAssessmentResult {
  overallScore: number; // 0-100 composite score
  pillarScores: HygienePillarScores;
  readinessStatus: "READY_FOR_MONTHLY_OPERATIONS" | "MINOR_FIXES_NEEDED" | "ADDITIONAL_CLEANUP_REQUIRED";
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
  rawLLMResponse: string; // The raw markdown response from Perplexity
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
    public originalError?: any
  ) {
    super(message);
    this.name = "PerplexityError";
  }
}

// =================================================================================
// PERPLEXITY SERVICE CLASS
// =================================================================================

export class PerplexityService {
  private readonly config: PerplexityConfig;
  private readonly API_BASE_URL = "https://api.perplexity.ai";

  constructor(config?: Partial<PerplexityConfig>) {
    logger.debug("Initializing PerplexityService...");

    const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new PerplexityError(
        "VITE_PERPLEXITY_API_KEY environment variable is not set."
      );
    }

    this.config = {
      apiKey,
      model: import.meta.env.VITE_PERPLEXITY_MODEL || config?.model || "sonar-reasoning-pro",
      maxTokens: config?.maxTokens || 4000,
      temperature: config?.temperature || 0.1, // Low temperature for consistent analysis
      timeout: config?.timeout || 60000, // 60 seconds for complex analysis
      ...config
    };

    logger.info("PerplexityService initialized successfully");
  }

  /**
   * Loads the hygiene assessment prompt from the public directory.
   */
  private async loadAssessmentPrompt(): Promise<string> {
    try {
      const response = await fetch('/hygiene-assessment-prompt.txt');
      if (!response.ok) {
        throw new PerplexityError(`Failed to load assessment prompt: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      logger.error("Failed to load hygiene assessment prompt", error);
      throw new PerplexityError(
        "Unable to load assessment prompt template",
        undefined,
        error
      );
    }
  }

  /**
   * Formats QBO data into a structured format for AI analysis.
   */
  private formatQBODataForAnalysis(data: QBODataPackage): string {
    const sections = [];

    sections.push("=== QUICKBOOKS ONLINE FINANCIAL DATA ANALYSIS ===");
    sections.push(`Data Period: ${data.datePeriod.startDate} to ${data.datePeriod.endDate}`);
    sections.push("");

    // Bank Reconciliation Data
    if (data.bankReconciliation) {
      sections.push("BANK RECONCILIATION REPORTS:");
      sections.push(JSON.stringify(data.bankReconciliation, null, 2));
      sections.push("");
    }

    // Chart of Accounts
    if (data.chartOfAccounts) {
      sections.push("CHART OF ACCOUNTS:");
      sections.push(JSON.stringify(data.chartOfAccounts, null, 2));
      sections.push("");
    }

    // General Ledger
    if (data.generalLedger) {
      sections.push("GENERAL LEDGER & TRANSACTION DATA:");
      sections.push(JSON.stringify(data.generalLedger, null, 2));
      sections.push("");
    }

    // Trial Balance
    if (data.trialBalance) {
      sections.push("TRIAL BALANCE:");
      sections.push(JSON.stringify(data.trialBalance, null, 2));
      sections.push("");
    }

    // Opening Balance Equity
    if (data.openingBalanceEquity) {
      sections.push("OPENING BALANCE EQUITY REPORT:");
      sections.push(JSON.stringify(data.openingBalanceEquity, null, 2));
      sections.push("");
    }

    // Undeposited Funds
    if (data.undepositedFunds) {
      sections.push("UNDEPOSITED FUNDS LEDGER:");
      sections.push(JSON.stringify(data.undepositedFunds, null, 2));
      sections.push("");
    }

    // A/R Aging
    if (data.arAging) {
      sections.push("ACCOUNTS RECEIVABLE AGING:");
      sections.push(JSON.stringify(data.arAging, null, 2));
      sections.push("");
    }

    // A/P Aging
    if (data.apAging) {
      sections.push("ACCOUNTS PAYABLE AGING:");
      sections.push(JSON.stringify(data.apAging, null, 2));
      sections.push("");
    }

    // Audit Log
    if (data.auditLog) {
      sections.push("AUDIT LOG (Last 90 Days):");
      sections.push(JSON.stringify(data.auditLog, null, 2));
      sections.push("");
    }

    return sections.join("\n");
  }

  /**
   * Sends a request to the Perplexity API.
   */
  private async makeAPIRequest(messages: any[]): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new PerplexityError(
          `Perplexity API error: ${response.status} ${response.statusText}`,
          response.status,
          errorBody
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof PerplexityError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new PerplexityError("Request timed out", undefined, error);
      }
      throw new PerplexityError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error
      );
    }
  }

  /**
   * Parses the LLM response into a structured assessment result.
   * NOTE: This parser focuses on extracting AI insights only.
   * Actual scores should come from PillarScoringService.calculateAssessmentFromPillars()
   */
  private parseAssessmentResponse(response: string): HygieneAssessmentResult {
    try {
      // Try to extract JSON from the response if it's wrapped in markdown or other text
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      let jsonContent = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
      
      // Clean up the JSON content
      jsonContent = jsonContent.trim();
      
      const parsed = JSON.parse(jsonContent);
      
      // Return AI insights with placeholder scores
      // Actual scores will be preserved from PillarScoringService calculations
      const result: HygieneAssessmentResult = {
        // These scores are placeholders - will be replaced with calculated scores
        overallScore: parsed.overallScore || 0,
        pillarScores: {
          reconciliation: parsed.pillarScores?.reconciliation || 0,
          coaIntegrity: parsed.pillarScores?.coaIntegrity || 0,
          categorization: parsed.pillarScores?.categorization || 0,
          controlAccount: parsed.pillarScores?.controlAccount || 0,
          aging: parsed.pillarScores?.aging || 0
        },
        readinessStatus: parsed.readinessStatus || "ADDITIONAL_CLEANUP_REQUIRED",
        // AI-generated insights and recommendations
        businessOwnerSummary: {
          healthScore: parsed.businessOwnerSummary?.healthScore || "Assessment in progress",
          whatThisMeans: parsed.businessOwnerSummary?.whatThisMeans || "Analyzing your financial data...",
          keyFindings: parsed.businessOwnerSummary?.keyFindings || [],
          nextSteps: parsed.businessOwnerSummary?.nextSteps || []
        },
        bookkeeperReport: {
          criticalIssues: parsed.bookkeeperReport?.criticalIssues || [],
          recommendedImprovements: parsed.bookkeeperReport?.recommendedImprovements || [],
          ongoingMaintenance: parsed.bookkeeperReport?.ongoingMaintenance || []
        },
        assessmentMetadata: {
          assessmentDate: new Date().toISOString().split('T')[0],
          dataPeriod: parsed.assessmentMetadata?.dataPeriod || "Unknown",
          scoringModel: "Day-30 Readiness Framework with AI Enhancement",
          limitations: parsed.assessmentMetadata?.limitations
        }
      };

      return result;
    } catch (error) {
      logger.error("Failed to parse LLM assessment response", { response, error });
      throw new PerplexityError(
        "Unable to parse assessment results from AI response",
        undefined,
        error
      );
    }
  }

  /**
   * Performs a complete financial hygiene assessment using the Perplexity API.
   * Now supports webhook assessment data format
   */
  public async analyzeFinancialHygiene(
    rawData: FivePillarRawData | QBODataPackage | any
  ): Promise<CompleteAssessmentResponse> {
    logger.info("Starting financial hygiene assessment with Perplexity AI");

    try {
      // Load the assessment prompt
      const systemPrompt = await this.loadAssessmentPrompt();
      
      // Format the data for analysis - support new webhook assessment data format
      let formattedData: string;
      if (this.isWebhookAssessmentData(rawData)) {
        formattedData = this.formatWebhookAssessmentDataForAnalysis(rawData);
      } else if (this.isFivePillarRawData(rawData)) {
        formattedData = this.formatFivePillarDataForAnalysis(rawData);
      } else {
        formattedData = this.formatQBODataForAnalysis(rawData as QBODataPackage);
      }
      
      // Prepare the messages for the API
      const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Please analyze the following QuickBooks Online data and provide a complete hygiene assessment following the Day-30 Readiness Scoring Model.

IMPORTANT: You MUST return your response as a valid JSON object only, with no additional text, markdown, or explanations outside the JSON structure. The JSON should follow this exact format:

{
  "overallScore": number (0-100),
  "pillarScores": {
    "reconciliation": number (0-100),
    "coaIntegrity": number (0-100),
    "categorization": number (0-100),
    "controlAccounts": number (0-100),
    "arApValidity": number (0-100)
  },
  "readinessStatus": string ("READY FOR MONTHLY OPERATIONS" | "NEEDS CLEANUP" | "CRITICAL ISSUES"),
  "criticalIssues": [
    {
      "pillar": string,
      "description": string,
      "severity": string ("critical" | "major" | "minor"),
      "impact": string,
      "remediation": string
    }
  ],
  "improvements": [
    {
      "area": string,
      "description": string,
      "priority": string ("high" | "medium" | "low"),
      "estimatedTime": string
    }
  ],
  "summary": {
    "executiveSummary": string,
    "technicalSummary": string,
    "nextSteps": [string]
  },
  "detailedAnalysis": {
    "reconciliation": {
      "score": number,
      "findings": string,
      "recommendations": string
    },
    "chartOfAccounts": {
      "score": number,
      "findings": string,
      "recommendations": string
    },
    "categorization": {
      "score": number,
      "findings": string,
      "recommendations": string
    },
    "controlAccounts": {
      "score": number,
      "findings": string,
      "recommendations": string
    },
    "arApValidity": {
      "score": number,
      "findings": string,
      "recommendations": string
    }
  }
}

Here is the QuickBooks Online data to analyze:

${formattedData}`
        }
      ];

      // Enhanced validation for different data formats
      let validation: { isComplete: boolean; missingData: string[]; warnings: string[] };
      if (this.isWebhookAssessmentData(rawData)) {
        // For webhook data, validate the current assessment structure
        validation = this.validateWebhookAssessmentData(rawData);
      } else if (this.isFivePillarRawData(rawData)) {
        validation = this.validateFivePillarDataCompleteness(rawData);
      } else {
        validation = this.validateDataCompleteness(rawData as QBODataPackage);
      }
      
      if (!validation.isComplete) {
        logger.warn("Assessment data incomplete", {
          missingData: validation.missingData,
          warnings: validation.warnings
        });
      }

      // Make the API request
      logger.debug("Sending request to Perplexity API");
      const apiResponse = await this.makeAPIRequest(messages);
      
      if (!apiResponse.choices || !apiResponse.choices[0] || !apiResponse.choices[0].message) {
        throw new PerplexityError("Invalid API response structure");
      }

      const rawLLMResponse = apiResponse.choices[0].message.content;
      logger.debug("Received assessment response from Perplexity API");

      // Parse the structured response
      const assessmentResult = this.parseAssessmentResponse(rawLLMResponse);
      
      logger.info("Financial hygiene assessment completed successfully", {
        overallScore: assessmentResult.overallScore,
        readinessStatus: assessmentResult.readinessStatus
      });

      return {
        assessmentResult,
        rawLLMResponse
      };

    } catch (error) {
      logger.error("Financial hygiene assessment failed", error);
      throw error instanceof PerplexityError ? error : new PerplexityError(
        `Assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error
      );
    }
  }

  /**
   * Validates that the QBO data package contains the minimum required data.
   */
  public validateDataCompleteness(data: QBODataPackage): {
    isComplete: boolean;
    missingData: string[];
    warnings: string[];
  } {
    const missingData: string[] = [];
    const warnings: string[] = [];

    // Required data elements
    if (!data.chartOfAccounts || data.chartOfAccounts.length === 0) {
      missingData.push("Chart of Accounts");
    }
    if (!data.trialBalance) {
      missingData.push("Trial Balance");
    }
    if (!data.generalLedger) {
      warnings.push("General Ledger data may be incomplete");
    }

    // Important but not critical
    if (!data.bankReconciliation) {
      warnings.push("Bank reconciliation data not available - reconciliation assessment will be limited");
    }
    if (!data.arAging && !data.apAging) {
      warnings.push("Aging reports not available - A/R and A/P assessment will be limited");
    }

    return {
      isComplete: missingData.length === 0,
      missingData,
      warnings
    };
  }

  /**
   * Type guard to check if data is FivePillarRawData
   */
  private isFivePillarRawData(data: any): data is FivePillarRawData {
    return data && data.reconciliation && 
           data.chartOfAccounts && 
           data.categorization && 
           data.controlAccounts && 
           data.arApValidity &&
           data.assessmentMetadata;
  }

  /**
   * Type guard to check if data is webhook assessment data format
   */
  private isWebhookAssessmentData(data: any): boolean {
    // Check for either the full webhook response or the assessment data format from Assessment.tsx
    return data && (
      // Full webhook response format
      (data.pillarData && data.meta) ||
      // Assessment data format with raw pillar data
      (data.rawPillarData && data.financialMetrics)
    );
  }

  /**
   * Formats webhook assessment data for LLM analysis
   */
  private formatWebhookAssessmentDataForAnalysis(data: any): string {
    const sections = [];

    sections.push("=== QUICKBOOKS ONLINE FINANCIAL DATA ANALYSIS ===");
    sections.push(`Assessment Date: ${new Date().toISOString().split('T')[0]}`);
    sections.push(`Data Period: ${data.datePeriod?.startDate || data.meta?.start_date} to ${data.datePeriod?.endDate || data.meta?.end_date}`);
    if (data.meta?.realmId) {
      sections.push(`Company Realm ID: ${data.meta.realmId}`);
    }
    sections.push("");
    sections.push("Please analyze the following QuickBooks Online data and calculate scores according to the Day-30 Readiness Scoring Model:");
    sections.push("");

    // Key financial metrics
    sections.push("KEY FINANCIAL METRICS:");
    sections.push(`• Total Bank Accounts: ${data.financialMetrics.bankAccounts}`);
    sections.push(`• Total Chart of Accounts: ${data.financialMetrics.totalAccounts}`);
    sections.push(`• Data Quality Score: ${data.financialMetrics.dataCompletenessScore}%`);
    sections.push(`• A/R Total: $${data.financialMetrics.arTotal?.toFixed(2) || '0.00'}`);
    sections.push(`• A/P Total: $${data.financialMetrics.apTotal?.toFixed(2) || '0.00'}`);
    sections.push("");

    // Raw pillar data for detailed analysis
    const pillarData = data.pillarData || data.rawPillarData;
    if (pillarData) {
      sections.push("DETAILED PILLAR DATA FOR ANALYSIS:");
      sections.push("");
      
      sections.push("PILLAR 1: BANK & CREDIT CARD RECONCILIATION");
      sections.push(JSON.stringify(pillarData.reconciliation, null, 2));
      sections.push("");

      sections.push("PILLAR 2: CHART OF ACCOUNTS INTEGRITY");
      sections.push(JSON.stringify(pillarData.chartIntegrity, null, 2));
      sections.push("");

      sections.push("PILLAR 3: TRANSACTION CATEGORIZATION");
      sections.push(JSON.stringify(pillarData.categorization, null, 2));
      sections.push("");

      sections.push("PILLAR 4: CONTROL ACCOUNT ACCURACY");
      sections.push(JSON.stringify(pillarData.controlAccounts, null, 2));
      sections.push("");

      sections.push("PILLAR 5: A/R & A/P VALIDITY");
      sections.push(JSON.stringify(pillarData.arApValidity, null, 2));
    }

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
      warnings
    };
  }

  /**
   * Formats five pillar raw data for LLM analysis
   */
  private formatFivePillarDataForAnalysis(rawData: FivePillarRawData): string {
    const sections = [];

    sections.push("=== FINANCIAL BOOKS HYGIENE ASSESSMENT DATA ===");
    sections.push(`Assessment Date: ${rawData.assessmentMetadata.assessmentDate}`);
    sections.push(`Data Period: ${rawData.assessmentMetadata.datePeriodAnalyzed.startDate} to ${rawData.assessmentMetadata.datePeriodAnalyzed.endDate}`);
    sections.push("");

    // PILLAR 1: Reconciliation Data
    sections.push("PILLAR 1: BANK & CREDIT CARD RECONCILIATION");
    sections.push(JSON.stringify(rawData.reconciliation, null, 2));
    sections.push("");

    // PILLAR 2: Chart of Accounts Data
    sections.push("PILLAR 2: CHART OF ACCOUNTS INTEGRITY");
    sections.push(JSON.stringify(rawData.chartOfAccounts, null, 2));
    sections.push("");

    // PILLAR 3: Categorization Data
    sections.push("PILLAR 3: TRANSACTION CATEGORIZATION");
    sections.push(JSON.stringify(rawData.categorization, null, 2));
    sections.push("");

    // PILLAR 4: Control Accounts Data
    sections.push("PILLAR 4: CONTROL ACCOUNT ACCURACY");
    sections.push(JSON.stringify(rawData.controlAccounts, null, 2));
    sections.push("");

    // PILLAR 5: A/R & A/P Data
    sections.push("PILLAR 5: ACCOUNTS RECEIVABLE & PAYABLE VALIDITY");
    sections.push(JSON.stringify(rawData.arApValidity, null, 2));
    sections.push("");

    // Data Completeness Information
    sections.push("DATA COMPLETENESS ANALYSIS:");
    sections.push(JSON.stringify(rawData.assessmentMetadata.dataCompleteness, null, 2));

    return sections.join("\n");
  }

  /**
   * Validates that the five pillar raw data contains the minimum required data.
   */
  private validateFivePillarDataCompleteness(data: FivePillarRawData): {
    isComplete: boolean;
    missingData: string[];
    warnings: string[];
  } {
    const missingData: string[] = [];
    const warnings: string[] = [];

    // Check data completeness flags from metadata
    if (data.assessmentMetadata.dataCompleteness.missingReports.length > 0) {
      data.assessmentMetadata.dataCompleteness.missingReports.forEach(report => {
        if (report.includes('Chart of Accounts') || report.includes('Trial Balance')) {
          missingData.push(report);
        } else {
          warnings.push(`${report} data not available - may impact assessment accuracy`);
        }
      });
    }

    // Check pillar data completeness
    if (!data.assessmentMetadata.dataCompleteness.reconciliationDataAvailable) {
      warnings.push('Bank reconciliation data not available - reconciliation assessment will be limited');
    }

    if (!data.assessmentMetadata.dataCompleteness.chartOfAccountsAvailable) {
      missingData.push('Chart of Accounts data is missing');
    }

    if (!data.assessmentMetadata.dataCompleteness.categorizationDataAvailable) {
      warnings.push('Categorization analysis data not available');
    }

    if (!data.assessmentMetadata.dataCompleteness.controlAccountsAvailable) {
      warnings.push('Control accounts data not available');
    }

    if (!data.assessmentMetadata.dataCompleteness.arApDataAvailable) {
      warnings.push('A/R and A/P aging data not available');
    }

    // Check individual pillar data quality
    if (data.reconciliation.totalBankAccounts === 0) {
      warnings.push('No bank accounts found for reconciliation analysis');
    }

    if (data.chartOfAccounts.totalAccounts === 0) {
      missingData.push('Chart of Accounts is empty');
    }

    return {
      isComplete: missingData.length === 0,
      missingData,
      warnings
    };
  }

  /**
   * Health check method to verify Perplexity API connectivity.
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const messages = [{
        role: "user",
        content: "Please respond with 'OK' if you can process this request."
      }];

      const response = await this.makeAPIRequest(messages);
      return response.choices && response.choices[0] && response.choices[0].message;
    } catch (error) {
      logger.error("Perplexity service health check failed", error);
      return false;
    }
  }
}