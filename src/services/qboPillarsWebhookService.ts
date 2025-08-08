/**
 * @file qboPillarsWebhookService.ts
 * @description Service for fetching all 5 pillars data via consolidated webhook
 * 
 * This service replaces multiple QBO API calls with a single webhook endpoint
 * that returns all required financial data for hygiene assessment.
 */

import { QBOTokenService } from './qboTokenService';

// =================================================================================
// WEBHOOK RESPONSE TYPES
// =================================================================================

/**
 * Response structure from the n8n webhook endpoint
 */
export interface WebhookResponse {
  pillarData: WebhookPillarData;
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
  onProgress?: (pillar: string, status: 'pending' | 'importing' | 'completed' | 'error') => void
): Promise<WebhookResponse> {
  try {
    // Validate webhook URL is configured
    if (!WEBHOOK_URL) {
      throw new Error('VITE_QBO_PILLARS_WEBHOOK_URL environment variable is not configured');
    }

    // Get QBO tokens
    const tokens = await QBOTokenService.getTokens(clerkUserId);
    if (!tokens || !tokens.access_token || !tokens.realm_id) {
      throw new Error('QuickBooks authentication required');
    }

    // Simulate progress for UI consistency
    if (onProgress) {
      // Start all pillars as importing
      onProgress('reconciliation', 'importing');
      onProgress('chartIntegrity', 'importing');
      onProgress('categorization', 'importing');
      onProgress('controlAccounts', 'importing');
      onProgress('arApValidity', 'importing');
    }

    // Make webhook request with retry logic
    const response = await fetchWithRetry(
      `${WEBHOOK_URL}?realmId=${tokens.realm_id}&token=${encodeURIComponent(tokens.access_token)}`,
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

    const data = await response.json();
    
    // Enhanced logging for debugging
    console.log('🔍 Raw webhook response:', JSON.stringify(data, null, 2));
    console.log('🔍 Response type:', Array.isArray(data) ? 'array' : typeof data);
    
    // Handle both array and object response formats
    const webhookData: WebhookResponse = Array.isArray(data) ? data[0] : data;
    
    console.log('🔍 Processed webhook data:', JSON.stringify(webhookData, null, 2));
    
    if (!webhookData?.pillarData) {
      console.error('❌ Invalid webhook response structure - missing pillarData');
      console.error('Available keys:', Object.keys(webhookData || {}));
      throw new Error('Invalid webhook response structure');
    }
    
    // Log pillar data details for debugging
    const pillarData = webhookData.pillarData;
    console.log('🔍 Pillar data summary:', {
      reconciliation: {
        variance: pillarData.reconciliation?.variance?.length || 0,
        byAccount: pillarData.reconciliation?.byAccount?.length || 0
      },
      chartIntegrity: {
        accounts: pillarData.chartIntegrity?.totals?.accounts || 0
      },
      categorization: {
        uncategorizedExpense: pillarData.categorization?.uncategorized?.['Uncategorized Expense']?.amount || 0
      },
      controlAccounts: {
        arBalance: pillarData.controlAccounts?.ar?.balance || 0,
        apBalance: pillarData.controlAccounts?.ap?.balance || 0
      }
    });

    // Simulate staggered completion for better UX
    if (onProgress) {
      const pillars = ['reconciliation', 'chartIntegrity', 'categorization', 'controlAccounts', 'arApValidity'];
      for (let i = 0; i < pillars.length; i++) {
        setTimeout(() => {
          onProgress(pillars[i], 'completed');
        }, i * 200); // Stagger by 200ms
      }
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
  fetchAllPillarsData: (clerkUserId: string, onProgress?: (pillar: string, status: 'pending' | 'importing' | 'completed' | 'error') => void) => 
    fetchAllPillarsData(clerkUserId, onProgress),
  formatCurrency,
  calculateDataCompleteness,
};