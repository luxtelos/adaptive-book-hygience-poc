/**
 * @file rawDataTransformer.ts
 * @description Passes raw QuickBooks data through without transformation
 */

import { logger } from '../lib/logger';
import { WebhookResponse } from './qboPillarsWebhookService';

export interface RawQBOData {
  chartOfAccounts?: any;
  txnList?: any;
  ar?: any;
  ap?: any;
  trialBal?: any;
  journalEntries?: any;
  [key: string]: any; // Allow any other raw QBO data
}

export class RawDataTransformer {
  /**
   * Detects if the data is in raw format or already transformed pillar format
   */
  static isRawFormat(data: any): boolean {
    // Check for raw format indicators
    return !!(data.chartOfAccounts || data.txnList || data.ar || data.ap || data.trialBal);
  }

  /**
   * Pass through raw QuickBooks data without any transformation
   * Returns the webhook response with raw QBO data only
   */
  static transformToPillarFormat(rawData: RawQBOData): WebhookResponse {
    // Data should already be extracted from array if needed
    const data = rawData;
    
    logger.info('Passing through raw QBO data without transformation');

    // Return raw QBO data without any transformation
    // No pillar computation - just raw data as received from QBO API

    // Simple metadata extraction without complex logic
    const meta = this.extractMetadata(data);

    return {
      rawQBOData: data,
      meta
    };
  }


  /**
   * Extract minimal metadata from raw data - no complex logic
   */
  private static extractMetadata(data: RawQBOData): any {
    // Get current date as fallback ONLY if webhook doesn't provide dates
    const today = new Date().toISOString().split('T')[0];
    
    // Extract dates from txnList headers where they actually exist (lowercase 'headers')
    const txnListHeaders = data.txnList?.headers;
    const startDate = txnListHeaders?.StartPeriod || data.meta?.start_date || today;
    const endDate = txnListHeaders?.EndPeriod || data.meta?.end_date || today;
    
    // Calculate windowDays from actual date range if available
    let windowDays = 90; // default
    if (startDate && endDate && startDate !== today && endDate !== today) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      windowDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Only use actual data from the response, with required fields having defaults
    const meta = {
      realmId: data.meta?.realmId || data.realmId || txnListHeaders?.ReportBasis || '',
      companyName: data.meta?.companyName || data.companyName || '',
      start_date: startDate,
      end_date: endDate,
      windowDays: data.meta?.windowDays || data.windowDays || windowDays,
      timestamp: new Date().toISOString(),
      rawDataProvided: true
    };
    
    // Log what we actually have
    logger.info('Extracted metadata from raw response:', meta);
    
    return meta;
  }
}