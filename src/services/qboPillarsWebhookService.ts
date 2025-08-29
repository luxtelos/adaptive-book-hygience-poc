/**
 * @file qboPillarsWebhookService.ts
 * @description Service for fetching all 5 pillars data via consolidated webhook
 * 
 * This service replaces multiple QBO API calls with a single webhook endpoint
 * that returns all required financial data for accounting quality assessment.
 */

import { QBOTokenService } from './qboTokenService';
import { logger } from '../lib/logger';
import { RawDataTransformer, RawQBOData } from './rawDataTransformer';

// =================================================================================
// WEBHOOK RESPONSE TYPES
// =================================================================================

/**
 * Raw response structure from the n8n webhook endpoint
 */
export interface RawWebhookResponse {
  pillarData?: WebhookPillarData; // Old format
  chartOfAccounts?: any[]; // New raw format
  txnList?: any[];
  ar?: any;
  ap?: any;
  trialBal?: any;
  journalEntries?: any[];
  meta: {
    realmId: string;
    start_date: string;
    end_date: string;
    windowDays: number;
  };
}

/**
 * Webhook response with ONLY raw QBO data - no computed pillars
 */
export interface WebhookResponse {
  rawQBOData: RawQBOData; // ONLY raw QBO API data
  meta: {
    realmId: string;
    start_date: string;
    end_date: string;
    windowDays: number;
  };
}

export interface WebhookPillarData {
  reconciliation: {
    clearedColumnFound: boolean;
    totalRowsFound: number;
    totalTransactionsProcessed: number;
    totalAccountsFound: number;
    hasTransactionData: boolean;
    byAccount: Array<{
      account: string;
      outstanding_30d_count: number;
      outstanding_30d_amount: number;
      cleared_amount: number;
      uncleared_amount: number;
      txns: number;
    }>;
    variance: Array<{
      account: string;
      bookEndingBalance: number;
      clearedAmount: number;
      unclearedAmount: number;
      outstanding30dAmount: number;
      varianceBookVsCleared: number;
    }>;
  };
  chartIntegrity: {
    source: string;
    totals: {
      accounts: number;
    };
    duplicates: {
      name: string[];
      acctNum: string[];
    };
    missingDetail: Array<{
      id: string;
      name: string;
    }>;
    subAccountsMissingParent: Array<{
      id: string;
      name: string;
    }>;
  };
  categorization: {
    uncategorized: {
      'Uncategorized Expense': {
        count: number;
        amount: number;
      };
      'Uncategorized Income': {
        count: number;
        amount: number;
      };
      'Uncategorized Asset': {
        count: number;
        amount: number;
      };
      'Ask My Accountant': {
        count: number;
        amount: number;
      };
    };
  };
  controlAccounts: {
    openingBalanceEquity: {
      balance: number;
      accountId: string | null;
    };
    undepositedFunds: {
      balance: number;
      accountId: string | null;
    };
    ar: {
      balance: number;
      accountId: string | null;
    };
    ap: {
      balance: number;
      accountId: string | null;
    };
    journalEntriesToARorAP: number;
  };
  arApValidity: {
    arAging: {
      current: number;
      d1_30: number;
      d31_60: number;
      d61_90: number;
      d90_plus: number;
    };
    apAging: {
      current: number;
      d1_30: number;
      d31_60: number;
      d61_90: number;
      d90_plus: number;
    };
    arTotal?: number; // Optional totals
    apTotal?: number;
  };
}

// =================================================================================
// SERVICE CONFIGURATION
// =================================================================================

const WEBHOOK_URL = import.meta.env.VITE_QBO_PILLARS_WEBHOOK_URL;
const WEBHOOK_TIMEOUT = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // Start with 2 seconds

// =================================================================================
// MAIN SERVICE FUNCTIONS
// =================================================================================

/**
 * Fetches all 5 pillars data from the consolidated webhook
 */
export async function fetchAllPillarsData(
  clerkUserId: string,
  onProgress?: (pillar: string, status: 'pending' | 'importing' | 'completed' | 'error') => void,
  days?: string
): Promise<WebhookResponse> {
  try {
    // Validate webhook URL is configured
    if (!WEBHOOK_URL) {
      throw new Error('VITE_QBO_PILLARS_WEBHOOK_URL environment variable is not configured');
    }

    // Validate and refresh tokens if needed before making the request
    logger.debug('Validating tokens before webhook request');
    const isValid = await QBOTokenService.validateAndRefreshIfNeeded(clerkUserId);
    
    if (!isValid) {
      logger.error('Token validation failed - tokens have been cleared for re-authentication');
      // Tokens have been cleared, user needs to re-authenticate
      throw new Error('Your QuickBooks session has expired. Please reconnect to QuickBooks.');
    }

    // Get QBO tokens (may have been refreshed)
    const tokens = await QBOTokenService.getTokens(clerkUserId);
    if (!tokens || !tokens.access_token || !tokens.realm_id) {
      throw new Error('QuickBooks authentication required');
    }

    // Report import progress for UI
    if (onProgress) {
      // Start all data types as importing
      onProgress('chartOfAccounts', 'importing');
      onProgress('transactionList', 'importing');
      onProgress('accountsReceivable', 'importing');
      onProgress('accountsPayable', 'importing');
      onProgress('trialBalance', 'importing');
    }

    // Build webhook URL with parameters
    const webhookParams = new URLSearchParams({
      realmId: tokens.realm_id,
      token: tokens.access_token
    });
    
    // Add days parameter if provided
    if (days) {
      webhookParams.append('days', days);
      logger.info(`Requesting data for ${days} days from webhook`);
    } else {
      logger.info('No days parameter provided, using webhook default');
    }

    // Make webhook request with retry logic
    const response = await fetchWithRetry(
      `${WEBHOOK_URL}?${webhookParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook error response:', errorText);
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    // Check for empty response before parsing
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      console.error('Webhook returned empty response');
      throw new Error('Webhook returned empty response. Please check if the N8N workflow is active and configured correctly.');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse webhook response:', responseText);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      throw new Error(`Invalid JSON response from webhook: ${errorMessage}`);
    }
    
    // Enhanced logging for debugging
    console.log('🔍 Raw webhook response structure:', {
      isArray: Array.isArray(data),
      hasChartOfAccounts: !!data.chartOfAccounts || !!(data[0]?.chartOfAccounts),
      hasPillarData: !!data.pillarData || !!(data[0]?.pillarData),
      keys: Object.keys(Array.isArray(data) ? data[0] || {} : data)
    });
    
    // Check if data is in new raw format or old pillar format
    let webhookData: WebhookResponse;
    
    // Handle array response - webhook returns data split across array elements
    let processedData = data;
    if (Array.isArray(data)) {
      // Merge all array elements into a single object
      processedData = data.reduce((merged, item) => ({...merged, ...item}), {});
      logger.info('Merged array response into single object');
    }
    
    // ONLY use raw QBO data - no pillar transformation
    logger.info('Using raw QuickBooks data without any transformation');
    webhookData = {
      rawQBOData: processedData as RawQBOData,
      meta: processedData.meta || {
        realmId: tokens.realm_id,
        start_date: '',
        end_date: '',
        windowDays: parseInt(days || '30')
      }
    };
    
    // Log and verify windowDays matches requested days
    if (webhookData?.meta?.windowDays) {
      logger.info(`Webhook returned windowDays: ${webhookData.meta.windowDays}, requested days: ${days || 'default'}`);
      if (days && webhookData.meta.windowDays !== parseInt(days)) {
        logger.warn(`⚠️ Webhook windowDays (${webhookData.meta.windowDays}) doesn't match requested days (${days})`);
        // Override with user-selected value if mismatch
        webhookData.meta.windowDays = parseInt(days);
        logger.info(`Overriding windowDays with user selection: ${days}`);
      }
    }
    
    console.log('🔍 Raw webhook data received:', JSON.stringify(webhookData, null, 2));
    
    // Validate that we have raw QBO data
    if (!webhookData?.rawQBOData) {
      console.error('❌ No raw QBO data available');
      throw new Error('Failed to receive raw QBO data from webhook');
    }
    
    // Log raw QBO data types received
    console.log('🎯 RAW QBO DATA RECEIVED:', {
      chartOfAccounts: !!webhookData.rawQBOData.chartOfAccounts,
      transactionList: !!webhookData.rawQBOData.txnList,
      accountsReceivable: !!webhookData.rawQBOData.ar,
      accountsPayable: !!webhookData.rawQBOData.ap,
      trialBalance: !!webhookData.rawQBOData.trialBal,
      journalEntries: !!webhookData.rawQBOData.journalEntries
    });

    // Report import completion for UI
    if (onProgress) {
      const dataTypes = ['chartOfAccounts', 'transactionList', 'accountsReceivable', 'accountsPayable', 'trialBalance'];
      dataTypes.forEach((dataType) => {
        onProgress(dataType, 'completed');
      });
    }

    return webhookData;

  } catch (error) {
    // Update progress to error state
    if (onProgress) {
      onProgress('reconciliation', 'error');
      onProgress('chartIntegrity', 'error');
      onProgress('categorization', 'error');
      onProgress('controlAccounts', 'error');
      onProgress('arApValidity', 'error');
    }
    
    console.error('Failed to fetch pillars data via webhook:', error);
    throw error;
  }
}

/**
 * Fetch with retry logic using exponential backoff
 */
async function fetchWithRetry(url: string, options: RequestInit, attempt = 1): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Retry on 5xx errors or network issues
    if (response.status >= 500 && attempt < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
      console.warn(`Webhook returned ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, attempt + 1);
    }
    
    return response;
  } catch (error) {
    if (attempt < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
      console.warn(`Webhook request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw error;
  }
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Calculate data completeness score
 */
export function calculateDataCompleteness(data: WebhookPillarData): number {
  let score = 0;
  let total = 5;

  // Check each pillar for completeness
  if (data.reconciliation?.variance?.length > 0) score++;
  if (data.chartIntegrity?.totals?.accounts > 0) score++;
  if (data.categorization?.uncategorized) score++;
  if (data.controlAccounts) score++;
  if (data.arApValidity?.arAging || data.arApValidity?.apAging) score++;

  return Math.round((score / total) * 100);
}

/**
 * Export service singleton
 */
export const qboPillarsWebhookService = {
  fetchAllPillarsData: (clerkUserId: string, onProgress?: (pillar: string, status: 'pending' | 'importing' | 'completed' | 'error') => void, days?: string) => 
    fetchAllPillarsData(clerkUserId, onProgress, days),
  formatCurrency,
  calculateDataCompleteness,
};