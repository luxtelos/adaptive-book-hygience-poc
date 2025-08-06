/**
 * QuickBooks Online API Service Layer
 *
 * Provides comprehensive access to QBO financial data through N8N proxy
 * with cookie-based authentication, rate limiting, and error handling.
 */

import logger from "../lib/logger";

// ============================================================================
// TYPE DEFINITIONS AND INTERFACES
// ============================================================================

/**
 * Progress callback type for multi-report fetching
 */
export type ProgressCallback = (progress: FetchProgress) => void;

/**
 * Progress tracking interface
 */
export interface FetchProgress {
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  error?: string;
}

/**
 * Date range interface for financial reports
 */
export interface DateRange {
  start_date: string; // YYYY-MM-DD format
  end_date: string; // YYYY-MM-DD format
}

/**
 * Generic QBO API response wrapper
 */
export interface QBOApiResponse<T> {
  QueryResponse?: {
    [key: string]: T[] | number | undefined;
    startPosition?: number;
    maxResults?: number;
  };
  fault?: {
    error: Array<{
      Detail: string;
      code: string;
      element: string;
    }>;
  };
  time: string;
}

/**
 * QBO Customer interface
 */
export interface QBOCustomer {
  Id: string;
  Name: string;
  CompanyName?: string;
  DisplayName: string;
  Active: boolean;
  PrimaryEmailAddr?: {
    Address: string;
  };
  PrimaryPhone?: {
    FreeFormNumber: string;
  };
  BillAddr?: QBOAddress;
  ShipAddr?: QBOAddress;
  Balance: number;
  BalanceWithJobs: number;
  CurrencyRef?: {
    value: string;
    name: string;
  };
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

/**
 * QBO Address interface
 */
export interface QBOAddress {
  Id?: string;
  Line1?: string;
  Line2?: string;
  Line3?: string;
  Line4?: string;
  Line5?: string;
  City?: string;
  Country?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
}

/**
 * QBO Company Information interface
 */
export interface QBOCompanyInfo {
  Id: string;
  CompanyName: string;
  LegalName?: string;
  CompanyAddr?: QBOAddress;
  CustomerCommunicationAddr?: QBOAddress;
  LegalAddr?: QBOAddress;
  PrimaryPhone?: {
    FreeFormNumber: string;
  };
  CompanyStartDate?: string;
  FiscalYearStartMonth?: string;
  Country?: string;
  Email?: {
    Address: string;
  };
  WebAddr?: {
    URI: string;
  };
  SupportedLanguages?: string;
  NameValue?: Array<{
    Name: string;
    Value: string;
  }>;
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

/**
 * QBO Account interface (Chart of Accounts)
 */
export interface QBOAccount {
  Id: string;
  Name: string;
  SubAccount: boolean;
  ParentRef?: {
    value: string;
    name: string;
  };
  Description?: string;
  FullyQualifiedName: string;
  Active: boolean;
  Classification: string;
  AccountType: string;
  AccountSubType: string;
  CurrentBalance: number;
  CurrentBalanceWithSubAccounts: number;
  CurrencyRef?: {
    value: string;
    name: string;
  };
  AcctNum?: string;
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

/**
 * QBO Report Column interface
 */
export interface QBOReportColumn {
  ColTitle: string;
  ColType: string;
  MetaData?: Array<{
    Name: string;
    Value: string;
  }>;
}

/**
 * QBO Report Row interface
 */
export interface QBOReportRow {
  ColData: Array<{
    value: string;
    href?: string;
    id?: string;
  }>;
  type?: string;
  group?: string;
}

/**
 * QBO Report interface (P&L, Balance Sheet, etc.)
 */
export interface QBOReport {
  Header: {
    ReportName: string;
    Option: Array<{
      Name: string;
      Value: string;
    }>;
    Time: string;
    ReportBasis: string;
    StartPeriod?: string;
    EndPeriod?: string;
    Currency: string;
    Customer?: string;
  };
  Columns: {
    Column: QBOReportColumn[];
  };
  Rows: {
    Row: QBOReportRow[];
  };
}

/**
 * QBO Journal Entry interface (General Ledger)
 */
export interface QBOJournalEntry {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  PrivateNote?: string;
  Adjustment: boolean;
  Line: Array<{
    Id: string;
    Description?: string;
    Amount: number;
    DetailType: string;
    JournalEntryLineDetail: {
      PostingType: "Debit" | "Credit";
      AccountRef: {
        value: string;
        name: string;
      };
      Entity?: {
        EntityRef: {
          value: string;
          name: string;
        };
        Type: string;
      };
    };
  }>;
  TotalAmt: number;
  CurrencyRef?: {
    value: string;
    name: string;
  };
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

/**
 * QBO Aging Report interface
 */
export interface QBOAgingReport {
  Header: {
    ReportName: string;
    Option: Array<{
      Name: string;
      Value: string;
    }>;
    Time: string;
    ReportBasis: string;
    Currency: string;
  };
  Columns: {
    Column: QBOReportColumn[];
  };
  Rows: {
    Row: QBOReportRow[];
  };
}

/**
 * QBO Audit Log Entry interface
 */
export interface QBOAuditLogEntry {
  Id: string;
  TimeCreated: string;
  Operation: string;
  SourceServiceType: string;
  User: {
    UserName: string;
    UserId: string;
  };
  Entity: {
    Name: string;
    Type: string;
  };
  Changes?: Array<{
    FieldName: string;
    OldValue?: string;
    NewValue?: string;
  }>;
}

/**
 * Comprehensive financial data structure
 */
export interface QBOFinancialReports {
  companyInfo: QBOCompanyInfo;
  customers: QBOCustomer[];
  chartOfAccounts: QBOAccount[];
  profitAndLoss: QBOReport;
  balanceSheet: QBOReport;
  generalLedger: QBOJournalEntry[];
  trialBalance: QBOReport;
  bankReconciliation: QBOReport;
  arAgingSummary: QBOAgingReport;
  arAgingDetail: QBOAgingReport;
  apAgingSummary: QBOAgingReport;
  apAgingDetail: QBOAgingReport;
  auditLog: QBOAuditLogEntry[];
}

/**
 * API request configuration
 */
export interface QBOApiConfig {
  method: "GET" | "POST";
  endpoint: string;
  params?: Record<string, string>;
  data?: any;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  retryDelayMs: number;
  maxRetries: number;
}

/**
 * Error types for different failure scenarios
 */
export enum QBOErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  AUTH_ERROR = "AUTH_ERROR",
  QBO_API_ERROR = "QBO_API_ERROR",
  PARSING_ERROR = "PARSING_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Custom QBO Error class
 */
export class QBOError extends Error {
  constructor(
    public type: QBOErrorType,
    message: string,
    public originalError?: any,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = "QBOError";
  }
}

// ============================================================================
// RATE LIMITING AND QUEUE MANAGEMENT
// ============================================================================

/**
 * Request queue item
 */
interface QueuedRequest {
  config: QBOApiConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  retryCount: number;
}

/**
 * Rate limiter class with queue management
 */
class RateLimiter {
  private queue: QueuedRequest[] = [];
  private requestTimes: number[] = [];
  private processing = false;

  constructor(private config: RateLimitConfig) {}

  /**
   * Add request to queue
   */
  async enqueue<T>(config: QBOApiConfig): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        config,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0,
      });

      this.processQueue();
    });
  }

  /**
   * Process queued requests with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();

      // Remove request times older than 1 minute
      this.requestTimes = this.requestTimes.filter(
        (time) => now - time < 60000,
      );

      // Check if we can make another request
      if (this.requestTimes.length >= this.config.maxRequestsPerMinute) {
        // Wait until we can make another request
        const oldestRequest = Math.min(...this.requestTimes);
        const waitTime = 60000 - (now - oldestRequest) + 100; // Add small buffer

        await this.delay(waitTime);
        continue;
      }

      const request = this.queue.shift()!;
      this.requestTimes.push(now);

      try {
        const result = await this.makeRequest(request.config);
        request.resolve(result);
      } catch (error) {
        if (
          error instanceof QBOError &&
          error.retryable &&
          request.retryCount < this.config.maxRetries
        ) {
          // Retry the request
          request.retryCount++;
          request.timestamp = Date.now();
          this.queue.unshift(request); // Add back to front of queue

          // Wait before retry
          await this.delay(
            this.config.retryDelayMs * Math.pow(2, request.retryCount),
          );
        } else {
          request.reject(error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Make actual HTTP request
   */
  private async makeRequest<T>(config: QBOApiConfig): Promise<T> {
    // This will be implemented by the QBOApiService
    throw new Error("makeRequest must be implemented by QBOApiService");
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// MAIN QBO API SERVICE CLASS
// ============================================================================

/**
 * QuickBooks Online API Service
 *
 * Provides comprehensive access to QBO financial data through N8N proxy
 * with cookie-based authentication, rate limiting, and error handling.
 */
export class QBOApiService {
  private readonly PROXY_BASE_URL: string;
  private readonly REQUEST_TIMEOUT: number;

  private rateLimiter: RateLimiter;

  constructor(rateLimitConfig?: Partial<RateLimitConfig>) {
    logger.debug("Initializing QBOApiService...");

    // Initialize configuration from environment variables with fallbacks
    this.PROXY_BASE_URL = import.meta.env.VITE_QBO_PROXY_BASE_URL;
    this.REQUEST_TIMEOUT =
      Number(import.meta.env.VITE_QBO_REQUEST_TIMEOUT) || 30000;

    // Validate required environment variables with helpful guidance
    if (!this.PROXY_BASE_URL) {
      const errorMessage = [
        "VITE_QBO_PROXY_BASE_URL environment variable is required but not set.",
        "Please add it to your .env file:",
        "VITE_QBO_PROXY_BASE_URL=https://your-proxy-server.com/api",
      ].join("\n");

      logger.error(errorMessage);
      throw new QBOError(QBOErrorType.QBO_API_ERROR, errorMessage);
    }

    const defaultConfig: RateLimitConfig = {
      maxRequestsPerMinute:
        Number(import.meta.env.VITE_QBO_MAX_REQUESTS_PER_MINUTE) || 450,
      retryDelayMs: Number(import.meta.env.VITE_QBO_RETRY_DELAY_MS) || 1000,
      maxRetries: Number(import.meta.env.VITE_QBO_MAX_RETRIES) || 3,
    };

    this.rateLimiter = new RateLimiter({
      ...defaultConfig,
      ...rateLimitConfig,
    });

    // Override the makeRequest method in rate limiter
    (this.rateLimiter as any).makeRequest = this.makeDirectRequest.bind(this);

    logger.info("QBOApiService initialized successfully");
  }

  // ============================================================================
  // CORE API METHODS
  // ============================================================================

  /**
   * Fetch QBO customers
   */
  async fetchCustomers(): Promise<QBOCustomer[]> {
    const config: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/query",
      params: {
        query: "SELECT * FROM Customer MAXRESULTS 1000",
      },
    };

    const response =
      await this.rateLimiter.enqueue<QBOApiResponse<QBOCustomer>>(config);
    return this.extractQueryResults<QBOCustomer>(response, "Customer");
  }

  /**
   * Fetch company information
   */
  async fetchCompanyInfo(): Promise<QBOCompanyInfo> {
    const config: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/companyinfo/{realmId}",
    };

    const response =
      await this.rateLimiter.enqueue<QBOApiResponse<QBOCompanyInfo>>(config);
    const companies = this.extractQueryResults<QBOCompanyInfo>(
      response,
      "CompanyInfo",
    );

    if (companies.length === 0) {
      throw new QBOError(
        QBOErrorType.QBO_API_ERROR,
        "No company information found",
      );
    }

    return companies[0];
  }

  /**
   * Fetch Profit & Loss report
   */
  async fetchProfitAndLoss(
    customerId?: string,
    dateRange?: DateRange,
  ): Promise<QBOReport> {
    const params: Record<string, string> = {
      summarize_column_by: "Month",
    };

    if (dateRange) {
      params.start_date = dateRange.start_date;
      params.end_date = dateRange.end_date;
    }

    if (customerId) {
      params.customer = customerId;
    }

    const config: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/reports/ProfitAndLoss",
      params,
    };

    return await this.rateLimiter.enqueue<QBOReport>(config);
  }

  /**
   * Fetch Balance Sheet report
   */
  async fetchBalanceSheet(
    customerId?: string,
    dateRange?: DateRange,
  ): Promise<QBOReport> {
    const params: Record<string, string> = {
      summarize_column_by: "Month",
    };

    if (dateRange) {
      params.date = dateRange.end_date;
    }

    if (customerId) {
      params.customer = customerId;
    }

    const config: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/reports/BalanceSheet",
      params,
    };

    return await this.rateLimiter.enqueue<QBOReport>(config);
  }

  /**
   * Fetch General Ledger entries
   */
  async fetchGeneralLedger(
    customerId?: string,
    dateRange?: DateRange,
  ): Promise<QBOJournalEntry[]> {
    let query = "SELECT * FROM JournalEntry";
    const conditions: string[] = [];

    if (dateRange) {
      conditions.push(`TxnDate >= '${dateRange.start_date}'`);
      conditions.push(`TxnDate <= '${dateRange.end_date}'`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " MAXRESULTS 1000";

    const config: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/query",
      params: { query },
    };

    const response =
      await this.rateLimiter.enqueue<QBOApiResponse<QBOJournalEntry>>(config);
    return this.extractQueryResults<QBOJournalEntry>(response, "JournalEntry");
  }

  /**
   * Fetch Chart of Accounts
   */
  async fetchChartOfAccounts(customerId?: string): Promise<QBOAccount[]> {
    const config: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/query",
      params: {
        query: "SELECT * FROM Account MAXRESULTS 1000",
      },
    };

    const response =
      await this.rateLimiter.enqueue<QBOApiResponse<QBOAccount>>(config);
    return this.extractQueryResults<QBOAccount>(response, "Account");
  }

  /**
   * Fetch Trial Balance report
   */
  async fetchTrialBalance(
    customerId?: string,
    dateRange?: DateRange,
  ): Promise<QBOReport> {
    const params: Record<string, string> = {};

    if (dateRange) {
      params.date = dateRange.end_date;
    }

    if (customerId) {
      params.customer = customerId;
    }

    const config: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/reports/TrialBalance",
      params,
    };

    return await this.rateLimiter.enqueue<QBOReport>(config);
  }

  /**
   * Fetch Bank Reconciliation report
   */
  async fetchBankReconciliation(
    customerId?: string,
    dateRange?: DateRange,
  ): Promise<QBOReport> {
    const params: Record<string, string> = {};

    if (dateRange) {
      params.start_date = dateRange.start_date;
      params.end_date = dateRange.end_date;
    }

    if (customerId) {
      params.customer = customerId;
    }

    const config: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/reports/CashFlow",
      params,
    };

    return await this.rateLimiter.enqueue<QBOReport>(config);
  }

  /**
   * Fetch Accounts Receivable Aging reports (Summary & Detail)
   */
  async fetchARAgingReports(
    customerId?: string,
  ): Promise<{ summary: QBOAgingReport; detail: QBOAgingReport }> {
    const baseParams: Record<string, string> = {};

    if (customerId) {
      baseParams.customer = customerId;
    }

    const summaryConfig: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/reports/AgedReceivables",
      params: { ...baseParams, summary_columns: "true" },
    };

    const detailConfig: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/reports/AgedReceivableDetail",
      params: baseParams,
    };

    const [summary, detail] = await Promise.all([
      this.rateLimiter.enqueue<QBOAgingReport>(summaryConfig),
      this.rateLimiter.enqueue<QBOAgingReport>(detailConfig),
    ]);

    return { summary, detail };
  }

  /**
   * Fetch Accounts Payable Aging reports (Summary & Detail)
   */
  async fetchAPAgingReports(
    customerId?: string,
  ): Promise<{ summary: QBOAgingReport; detail: QBOAgingReport }> {
    const baseParams: Record<string, string> = {};

    if (customerId) {
      baseParams.vendor = customerId; // Note: AP uses vendor parameter
    }

    const summaryConfig: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/reports/AgedPayables",
      params: { ...baseParams, summary_columns: "true" },
    };

    const detailConfig: QBOApiConfig = {
      method: "GET",
      endpoint: "v3/company/{realmId}/reports/AgedPayableDetail",
      params: baseParams,
    };

    const [summary, detail] = await Promise.all([
      this.rateLimiter.enqueue<QBOAgingReport>(summaryConfig),
      this.rateLimiter.enqueue<QBOAgingReport>(detailConfig),
    ]);

    return { summary, detail };
  }

  /**
   * Fetch Audit Log (limited by QBO API capabilities)
   */
  async fetchAuditLog(
    customerId?: string,
    dateRange?: DateRange,
  ): Promise<QBOAuditLogEntry[]> {
    // Note: QBO doesn't have a direct audit log API
    // This would typically require integration with QBO Audit Log service
    // For now, we'll return an empty array and log a warning

    console.warn(
      "QBO Audit Log API is not directly available through standard QBO API. Consider using QBO Audit Log service separately.",
    );

    return [];
  }

  // ============================================================================
  // COMPREHENSIVE DATA FETCHING
  // ============================================================================

  /**
   * Fetch all financial data with progress tracking
   */
  async fetchAllFinancialData(
    customerId?: string,
    dateRange?: DateRange,
    progressCallback?: ProgressCallback,
  ): Promise<QBOFinancialReports> {
    const steps = [
      "Fetching company information",
      "Fetching customers",
      "Fetching chart of accounts",
      "Fetching profit & loss report",
      "Fetching balance sheet",
      "Fetching general ledger",
      "Fetching trial balance",
      "Fetching bank reconciliation",
      "Fetching A/R aging reports",
      "Fetching A/P aging reports",
      "Fetching audit log",
    ];

    const totalSteps = steps.length;
    let completedSteps = 0;

    const updateProgress = (stepName: string, error?: string) => {
      if (progressCallback) {
        progressCallback({
          currentStep: stepName,
          completedSteps,
          totalSteps,
          percentage: (completedSteps / totalSteps) * 100,
          error,
        });
      }
    };

    const results: Partial<QBOFinancialReports> = {};

    try {
      // Step 1: Company Info
      updateProgress(steps[0]);
      results.companyInfo = await this.fetchCompanyInfo();
      completedSteps++;

      // Step 2: Customers
      updateProgress(steps[1]);
      results.customers = await this.fetchCustomers();
      completedSteps++;

      // Step 3: Chart of Accounts
      updateProgress(steps[2]);
      results.chartOfAccounts = await this.fetchChartOfAccounts(customerId);
      completedSteps++;

      // Step 4: Profit & Loss
      updateProgress(steps[3]);
      results.profitAndLoss = await this.fetchProfitAndLoss(
        customerId,
        dateRange,
      );
      completedSteps++;

      // Step 5: Balance Sheet
      updateProgress(steps[4]);
      results.balanceSheet = await this.fetchBalanceSheet(
        customerId,
        dateRange,
      );
      completedSteps++;

      // Step 6: General Ledger
      updateProgress(steps[5]);
      results.generalLedger = await this.fetchGeneralLedger(
        customerId,
        dateRange,
      );
      completedSteps++;

      // Step 7: Trial Balance
      updateProgress(steps[6]);
      results.trialBalance = await this.fetchTrialBalance(
        customerId,
        dateRange,
      );
      completedSteps++;

      // Step 8: Bank Reconciliation
      updateProgress(steps[7]);
      results.bankReconciliation = await this.fetchBankReconciliation(
        customerId,
        dateRange,
      );
      completedSteps++;

      // Step 9: A/R Aging
      updateProgress(steps[8]);
      const arAging = await this.fetchARAgingReports(customerId);
      results.arAgingSummary = arAging.summary;
      results.arAgingDetail = arAging.detail;
      completedSteps++;

      // Step 10: A/P Aging
      updateProgress(steps[9]);
      const apAging = await this.fetchAPAgingReports(customerId);
      results.apAgingSummary = apAging.summary;
      results.apAgingDetail = apAging.detail;
      completedSteps++;

      // Step 11: Audit Log
      updateProgress(steps[10]);
      results.auditLog = await this.fetchAuditLog(customerId, dateRange);
      completedSteps++;

      // Final progress update
      updateProgress("Data fetching completed");

      return results as QBOFinancialReports;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      updateProgress(steps[completedSteps] || "Unknown step", errorMessage);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY AND HELPER METHODS
  // ============================================================================

  /**
   * Make direct HTTP request to N8N proxy
   */
  private async makeDirectRequest<T>(config: QBOApiConfig): Promise<T> {
    const { method, endpoint, params, data } = config;

    try {
      // Build proxy URL
      const proxyUrl = `${this.PROXY_BASE_URL}/${endpoint}`;

      // Create request body for N8N proxy
      const requestBody = {
        method,
        endpoint,
        params: params || {},
        data: data || null,
      };

      // Make request with cookies
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT,
      );

      const response = await fetch(proxyUrl, {
        method: "POST",
        credentials: "include", // Include HTTP-only cookies
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const result = await response.json();

      // Check for QBO API errors in response
      if (result.fault) {
        throw new QBOError(
          QBOErrorType.QBO_API_ERROR,
          this.formatQBOError(result.fault),
          result.fault,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new QBOError(
          QBOErrorType.TIMEOUT_ERROR,
          "Request timed out",
          error,
          true,
        );
      }

      if (error instanceof QBOError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new QBOError(
          QBOErrorType.NETWORK_ERROR,
          "Network connection failed",
          error,
          true,
        );
      }

      throw new QBOError(
        QBOErrorType.UNKNOWN_ERROR,
        `Unexpected error: ${error instanceof Error ? error.message : "Unknown"}`,
        error,
      );
    }
  }

  /**
   * Handle HTTP errors from N8N proxy
   */
  private async handleHttpError(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorType = QBOErrorType.QBO_API_ERROR;
    let retryable = false;

    try {
      const errorBody = await response.text();
      if (errorBody) {
        errorMessage += ` - ${errorBody}`;
      }
    } catch {
      // Ignore JSON parsing errors
    }

    switch (response.status) {
      case 401:
        errorType = QBOErrorType.AUTH_ERROR;
        errorMessage = "Authentication failed. Please reconnect to QuickBooks.";
        break;
      case 429:
        errorType = QBOErrorType.RATE_LIMIT_ERROR;
        errorMessage = "Rate limit exceeded. Request will be retried.";
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = QBOErrorType.NETWORK_ERROR;
        errorMessage = "Server error. Request will be retried.";
        retryable = true;
        break;
    }

    throw new QBOError(errorType, errorMessage, response, retryable);
  }

  /**
   * Extract results from QBO query response
   */
  private extractQueryResults<T>(
    response: QBOApiResponse<T>,
    entityName: string,
  ): T[] {
    if (!response.QueryResponse) {
      return [];
    }

    const result = response.QueryResponse[entityName];
    return Array.isArray(result) ? result : [];
  }

  /**
   * Format QBO API error message
   */
  private formatQBOError(fault: any): string {
    if (fault.error && Array.isArray(fault.error) && fault.error.length > 0) {
      const error = fault.error[0];
      return `QBO API Error: ${error.Detail} (Code: ${error.code})`;
    }

    return "Unknown QBO API error";
  }

  /**
   * Validate date range format
   */
  public static validateDateRange(dateRange: DateRange): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (
      !dateRegex.test(dateRange.start_date) ||
      !dateRegex.test(dateRange.end_date)
    ) {
      return false;
    }

    const startDate = new Date(dateRange.start_date);
    const endDate = new Date(dateRange.end_date);

    return (
      startDate <= endDate &&
      !isNaN(startDate.getTime()) &&
      !isNaN(endDate.getTime())
    );
  }

  /**
   * Create date range for common periods
   */
  public static createDateRange(
    period:
      | "current_month"
      | "current_quarter"
      | "current_year"
      | "last_month"
      | "last_quarter"
      | "last_year",
  ): DateRange {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (period) {
      case "current_month":
        return {
          start_date: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`,
          end_date: new Date(currentYear, currentMonth + 1, 0)
            .toISOString()
            .split("T")[0],
        };

      case "current_quarter": {
        const quarterStart = Math.floor(currentMonth / 3) * 3;
        return {
          start_date: `${currentYear}-${String(quarterStart + 1).padStart(2, "0")}-01`,
          end_date: new Date(currentYear, quarterStart + 3, 0)
            .toISOString()
            .split("T")[0],
        };
      }

      case "current_year":
        return {
          start_date: `${currentYear}-01-01`,
          end_date: `${currentYear}-12-31`,
        };

      case "last_month": {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear =
          currentMonth === 0 ? currentYear - 1 : currentYear;
        return {
          start_date: `${lastMonthYear}-${String(lastMonth + 1).padStart(2, "0")}-01`,
          end_date: new Date(lastMonthYear, lastMonth + 1, 0)
            .toISOString()
            .split("T")[0],
        };
      }

      case "last_quarter": {
        const lastQuarterStart = Math.floor(currentMonth / 3) * 3 - 3;
        const isLastYear = lastQuarterStart < 0;
        const quarterStart = isLastYear
          ? lastQuarterStart + 12
          : lastQuarterStart;
        const quarterYear = isLastYear ? currentYear - 1 : currentYear;

        return {
          start_date: `${quarterYear}-${String(quarterStart + 1).padStart(2, "0")}-01`,
          end_date: new Date(quarterYear, quarterStart + 3, 0)
            .toISOString()
            .split("T")[0],
        };
      }

      case "last_year":
        return {
          start_date: `${currentYear - 1}-01-01`,
          end_date: `${currentYear - 1}-12-31`,
        };

      default:
        throw new Error(`Unsupported period: ${period}`);
    }
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example usage of the QBOApiService
 */
export const QBOApiServiceExample = {
  /**
   * Basic usage example
   */
  async basicUsage() {
    const qboService = new QBOApiService();

    try {
      // Fetch company info
      const companyInfo = await qboService.fetchCompanyInfo();
      console.log("Company:", companyInfo.CompanyName);

      // Fetch customers
      const customers = await qboService.fetchCustomers();
      console.log(`Found ${customers.length} customers`);

      // Fetch P&L for current month
      const dateRange = QBOApiService.createDateRange("current_month");
      const profitAndLoss = await qboService.fetchProfitAndLoss(
        undefined,
        dateRange,
      );
      console.log("P&L report fetched successfully");
    } catch (error) {
      if (error instanceof QBOError) {
        console.error(`QBO Error (${error.type}):`, error.message);

        if (error.type === QBOErrorType.AUTH_ERROR) {
          // Redirect to OAuth
          console.log("Redirecting to QuickBooks authentication...");
        }
      } else {
        console.error("Unexpected error:", error);
      }
    }
  },

  /**
   * Comprehensive data fetching with progress tracking
   */
  async fetchAllDataWithProgress() {
    const qboService = new QBOApiService();
    const dateRange = QBOApiService.createDateRange("current_year");

    try {
      const financialData = await qboService.fetchAllFinancialData(
        undefined, // No specific customer
        dateRange,
        (progress) => {
          console.log(
            `Progress: ${progress.percentage.toFixed(1)}% - ${progress.currentStep}`,
          );
          if (progress.error) {
            console.error("Step error:", progress.error);
          }
        },
      );

      console.log("All financial data fetched successfully:");
      console.log("- Company:", financialData.companyInfo.CompanyName);
      console.log("- Customers:", financialData.customers.length);
      console.log("- Accounts:", financialData.chartOfAccounts.length);
      console.log("- Journal Entries:", financialData.generalLedger.length);

      return financialData;
    } catch (error) {
      console.error("Failed to fetch financial data:", error);
      throw error;
    }
  },

  /**
   * Rate limiting demonstration
   */
  async rateLimitingExample() {
    const qboService = new QBOApiService({
      maxRequestsPerMinute: 10, // Lower limit for demonstration
      retryDelayMs: 2000,
      maxRetries: 5,
    });

    // Make multiple rapid requests
    const promises = Array.from({ length: 15 }, (_, i) =>
      qboService
        .fetchCustomers()
        .then((customers) =>
          console.log(`Request ${i + 1}: ${customers.length} customers`),
        )
        .catch((error) =>
          console.error(`Request ${i + 1} failed:`, error.message),
        ),
    );

    await Promise.allSettled(promises);
  },
};

export default QBOApiService;
