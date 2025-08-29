import { logger } from '../lib/logger';
import { WebhookResponse } from './qboPillarsWebhookService';

interface LLMInputData {
  webhookData: WebhookResponse;
  calculatedAssessment: any;
  formattedDate: string;
  companyName: string;
}

export class LLMInputFormatter {
  /**
   * Formats raw QBO data in table format for USER VIEWING and PDF generation
   * Shows the actual QuickBooks data in readable tables, not computed scores
   */
  static formatForLLM(data: LLMInputData): string {
    const { webhookData, calculatedAssessment, formattedDate, companyName } = data;
    
    if (!webhookData?.rawQBOData) {
      logger.error('Missing webhook data for formatting');
      throw new Error('Missing required data');
    }
    
    // Use raw QBO data if available, otherwise show import status only
    const rawData = webhookData.rawQBOData;

    const output = [];
    
    // Header
    output.push('# QuickBooks Online Financial Data Report');
    output.push(`Company: ${companyName}`);
    output.push(`Report Date: ${formattedDate}`);
    output.push(`Data Period: ${webhookData.meta.start_date} to ${webhookData.meta.end_date} (${webhookData.meta.windowDays} days)`);
    output.push('');
    output.push('---');
    output.push('');
    
    // Data Import Status
    output.push('## DATA IMPORT STATUS');
    output.push('');
    output.push('| Data Type | Status |');
    output.push('|-----------|--------|');
    output.push(`| Chart of Accounts | ${rawData?.chartOfAccounts ? '✅ Imported' : '⏳ Pending'} |`);
    output.push(`| Transaction List | ${rawData?.txnList ? '✅ Imported' : '⏳ Pending'} |`);
    output.push(`| Accounts Receivable | ${rawData?.ar ? '✅ Imported' : '⏳ Pending'} |`);
    output.push(`| Accounts Payable | ${rawData?.ap ? '✅ Imported' : '⏳ Pending'} |`);
    output.push(`| Trial Balance | ${rawData?.trialBal ? '✅ Imported' : '⏳ Pending'} |`);
    output.push(`| Journal Entries | ${rawData?.journalEntries ? '✅ Imported' : '⏳ Pending'} |`);
    output.push('');
    
    if (rawData) {
      // Chart of Accounts Table - Show ALL accounts
      if (rawData.chartOfAccounts?.Account) {
        output.push('## CHART OF ACCOUNTS');
        output.push('');
        output.push('| Account Name | Type | SubType | Balance | Status |');
        output.push('|--------------|------|---------|---------|--------|');
        
        const accounts = rawData.chartOfAccounts.Account;
        accounts.forEach((acc: any) => {
          output.push(`| ${acc.Name || 'N/A'} | ${acc.AccountType || 'N/A'} | ${acc.AccountSubType || 'N/A'} | $${(acc.CurrentBalance || 0).toFixed(2)} | ${acc.Active ? 'Active' : 'Inactive'} |`);
        });
        output.push('');
      }
      
      // Transaction List Table - Show more comprehensive data
      if (rawData.txnList?.rows?.Row || rawData.txnList?.QueryResponse?.Transaction) {
        output.push('## TRANSACTION LIST');
        output.push('');
        
        // Handle different transaction data structures
        if (rawData.txnList.rows?.Row) {
          output.push('| Date | Transaction Type | Name | Memo | Account | Amount |');
          output.push('|------|------------------|------|------|---------|--------|');
          
          const rows = Array.isArray(rawData.txnList.rows.Row) ? rawData.txnList.rows.Row : [rawData.txnList.rows.Row];
          rows.forEach((row: any) => {
            if (row.ColData && row.ColData.length >= 6) {
              const cols = row.ColData;
              output.push(`| ${cols[0]?.value || 'N/A'} | ${cols[1]?.value || 'N/A'} | ${cols[2]?.value || 'N/A'} | ${cols[3]?.value || 'N/A'} | ${cols[4]?.value || 'N/A'} | ${cols[5]?.value || '0'} |`);
            }
          });
        } else if (rawData.txnList.QueryResponse?.Transaction) {
          output.push('| Date | Type | Entity | Memo | Amount | Balance |');
          output.push('|------|------|--------|------|--------|---------|');
          
          const transactions = rawData.txnList.QueryResponse.Transaction;
          transactions.forEach((txn: any) => {
            const date = txn.TxnDate || 'N/A';
            const type = txn.domain || txn.type || 'Transaction';
            const entity = txn.EntityRef?.name || txn.CustomerRef?.name || txn.VendorRef?.name || 'N/A';
            const memo = txn.PrivateNote || txn.Memo || '';
            const amount = txn.TotalAmt || txn.Amount || 0;
            const balance = txn.Balance || 0;
            
            output.push(`| ${date} | ${type} | ${entity} | ${memo} | $${amount.toFixed(2)} | $${balance.toFixed(2)} |`);
          });
        }
        output.push('');
      }
      
      // A/R Aging Summary - Show ALL customers
      if (rawData.ar?.rows?.Row) {
        output.push('## ACCOUNTS RECEIVABLE AGING');
        output.push('');
        output.push('| Customer | Current | 1-30 Days | 31-60 Days | 61-90 Days | 90+ Days | Total |');
        output.push('|----------|---------|-----------|------------|------------|----------|-------|');
        
        const arRows = Array.isArray(rawData.ar.rows.Row) ? rawData.ar.rows.Row : [rawData.ar.rows.Row];
        arRows.forEach((row: any) => {
          // Skip summary rows and show actual customer data
          if (row.ColData && !row.Summary && !row.group) {
            const cols = row.ColData;
            if (cols.length >= 7) {
              output.push(`| ${cols[0]?.value || 'N/A'} | $${cols[1]?.value || '0'} | $${cols[2]?.value || '0'} | $${cols[3]?.value || '0'} | $${cols[4]?.value || '0'} | $${cols[5]?.value || '0'} | $${cols[6]?.value || '0'} |`);
            }
          }
        });
        
        // Add Grand Total row if exists
        const totalRow = arRows.find((row: any) => row.group === 'GrandTotal');
        if (totalRow?.Summary?.ColData) {
          const cols = totalRow.Summary.ColData;
          output.push('|----------|---------|-----------|------------|------------|----------|-------|');
          output.push(`| **TOTAL** | **$${cols[1]?.value || '0'}** | **$${cols[2]?.value || '0'}** | **$${cols[3]?.value || '0'}** | **$${cols[4]?.value || '0'}** | **$${cols[5]?.value || '0'}** | **$${cols[6]?.value || '0'}** |`);
        }
        output.push('');
      }
      
      // A/P Aging Summary - Show ALL vendors
      if (rawData.ap?.rows?.Row) {
        output.push('## ACCOUNTS PAYABLE AGING');
        output.push('');
        output.push('| Vendor | Current | 1-30 Days | 31-60 Days | 61-90 Days | 90+ Days | Total |');
        output.push('|--------|---------|-----------|------------|------------|----------|-------|');
        
        const apRows = Array.isArray(rawData.ap.rows.Row) ? rawData.ap.rows.Row : [rawData.ap.rows.Row];
        apRows.forEach((row: any) => {
          // Skip summary rows and show actual vendor data
          if (row.ColData && !row.Summary && !row.group) {
            const cols = row.ColData;
            if (cols.length >= 7) {
              output.push(`| ${cols[0]?.value || 'N/A'} | $${cols[1]?.value || '0'} | $${cols[2]?.value || '0'} | $${cols[3]?.value || '0'} | $${cols[4]?.value || '0'} | $${cols[5]?.value || '0'} | $${cols[6]?.value || '0'} |`);
            }
          }
        });
        
        // Add Grand Total row if exists
        const totalRow = apRows.find((row: any) => row.group === 'GrandTotal');
        if (totalRow?.Summary?.ColData) {
          const cols = totalRow.Summary.ColData;
          output.push('|--------|---------|-----------|------------|------------|----------|-------|');
          output.push(`| **TOTAL** | **$${cols[1]?.value || '0'}** | **$${cols[2]?.value || '0'}** | **$${cols[3]?.value || '0'}** | **$${cols[4]?.value || '0'}** | **$${cols[5]?.value || '0'}** | **$${cols[6]?.value || '0'}** |`);
        }
        output.push('');
      }
      
      // Trial Balance - Show ALL accounts
      if (rawData.trialBal?.rows?.Row || rawData.trialBal?.Rows?.Row) {
        output.push('## TRIAL BALANCE');
        output.push('');
        output.push('| Account | Debit | Credit |');
        output.push('|---------|-------|--------|');
        
        const rows = rawData.trialBal.rows?.Row || rawData.trialBal.Rows?.Row;
        const tbRows = Array.isArray(rows) ? rows : [rows];
        
        let totalDebit = 0;
        let totalCredit = 0;
        
        tbRows.forEach((row: any) => {
          if (row.ColData && row.ColData.length >= 3) {
            const cols = row.ColData;
            const accountName = cols[0]?.value || 'N/A';
            const debitValue = parseFloat(cols[1]?.value || '0');
            const creditValue = parseFloat(cols[2]?.value || '0');
            
            // Skip total rows in the iteration
            if (!accountName.toLowerCase().includes('total')) {
              output.push(`| ${accountName} | ${debitValue !== 0 ? '$' + debitValue.toFixed(2) : ''} | ${creditValue !== 0 ? '$' + Math.abs(creditValue).toFixed(2) : ''} |`);
              totalDebit += debitValue;
              totalCredit += Math.abs(creditValue);
            }
          }
        });
        
        // Add totals row
        output.push('|---------|-------|--------|');
        output.push(`| **TOTAL** | **$${totalDebit.toFixed(2)}** | **$${totalCredit.toFixed(2)}** |`);
        output.push('');
      }
      
      // Journal Entries - New section
      if (rawData.journalEntries?.QueryResponse?.JournalEntry) {
        output.push('## JOURNAL ENTRIES');
        output.push('');
        output.push('| Date | Doc Number | Line Description | Account | Debit | Credit |');
        output.push('|------|------------|------------------|---------|-------|--------|');
        
        const entries = Array.isArray(rawData.journalEntries.QueryResponse.JournalEntry) 
          ? rawData.journalEntries.QueryResponse.JournalEntry 
          : [rawData.journalEntries.QueryResponse.JournalEntry];
        
        entries.forEach((entry: any) => {
          const date = entry.TxnDate || 'N/A';
          const docNum = entry.DocNumber || 'N/A';
          
          if (entry.Line && Array.isArray(entry.Line)) {
            entry.Line.forEach((line: any) => {
              if (line.JournalEntryLineDetail) {
                const desc = line.Description || '';
                const accountName = line.JournalEntryLineDetail.AccountRef?.name || 'N/A';
                const amount = parseFloat(line.Amount || '0');
                const postingType = line.JournalEntryLineDetail.PostingType;
                
                if (postingType === 'Debit') {
                  output.push(`| ${date} | ${docNum} | ${desc} | ${accountName} | $${amount.toFixed(2)} | |`);
                } else {
                  output.push(`| ${date} | ${docNum} | ${desc} | ${accountName} | | $${amount.toFixed(2)} |`);
                }
              }
            });
          }
        });
        output.push('');
      }
      
      // Profit & Loss - New section
      if (rawData.profitLoss?.rows?.Row || rawData.profitLoss?.Rows?.Row) {
        output.push('## PROFIT & LOSS');
        output.push('');
        output.push('| Account | Amount |');
        output.push('|---------|--------|');
        
        const rows = rawData.profitLoss.rows?.Row || rawData.profitLoss.Rows?.Row;
        const plRows = Array.isArray(rows) ? rows : [rows];
        
        plRows.forEach((row: any) => {
          if (row.ColData && row.ColData.length >= 2) {
            const accountName = row.ColData[0]?.value || 'N/A';
            const amount = row.ColData[1]?.value || '0';
            
            // Add indentation for sub-accounts
            const indent = row.group === 'Income' || row.group === 'Expense' ? '  ' : '';
            output.push(`| ${indent}${accountName} | $${amount} |`);
          }
        });
        output.push('');
      }
      
      // Balance Sheet - New section
      if (rawData.balanceSheet?.rows?.Row || rawData.balanceSheet?.Rows?.Row) {
        output.push('## BALANCE SHEET');
        output.push('');
        output.push('| Account | Amount |');
        output.push('|---------|--------|');
        
        const rows = rawData.balanceSheet.rows?.Row || rawData.balanceSheet.Rows?.Row;
        const bsRows = Array.isArray(rows) ? rows : [rows];
        
        bsRows.forEach((row: any) => {
          if (row.ColData && row.ColData.length >= 2) {
            const accountName = row.ColData[0]?.value || 'N/A';
            const amount = row.ColData[1]?.value || '0';
            
            // Add section headers
            if (row.group === 'Assets' || row.group === 'Liabilities' || row.group === 'Equity') {
              output.push(`| **${accountName}** | **${amount}** |`);
            } else {
              output.push(`| ${accountName} | $${amount} |`);
            }
          }
        });
        output.push('');
      }
    } else {
      output.push('## DATA NOT YET IMPORTED');
      output.push('');
      output.push('Raw QuickBooks data has not been imported yet. Please ensure the webhook is properly configured.');
      output.push('');
    }
    
    output.push('---');
    output.push('');
    output.push('*This report shows the raw QuickBooks Online data in tabular format*');
    
    return output.join('\n');
  }

  /**
   * Converts the formatted text to a downloadable blob
   */
  static createDownloadBlob(formattedText: string, format: 'txt' | 'md' = 'md'): Blob {
    const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
    return new Blob([formattedText], { type: mimeType });
  }

  /**
   * Triggers download of the LLM input data
   */
  static downloadLLMInput(data: LLMInputData, format: 'txt' | 'md' = 'md'): void {
    try {
      const formattedText = this.formatForLLM(data);
      const blob = this.createDownloadBlob(formattedText, format);
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `llm-input-data-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      logger.info('LLM input data downloaded successfully');
    } catch (error) {
      logger.error('Failed to download LLM input data', error);
      throw error;
    }
  }

  /**
   * Sends the LLM input data to PDF API for viewing/downloading
   */
  static async sendToPDFAPI(data: LLMInputData): Promise<{ url?: string; error?: string }> {
    const pdfApiUrl = import.meta.env.VITE_PDF_API_URL;
    
    if (!pdfApiUrl) {
      logger.error('PDF API URL not configured');
      return { error: 'PDF API URL not configured' };
    }

    try {
      const formattedText = this.formatForLLM(data);
      
      // Send markdown directly as plain text, matching pdfGenerationService format
      const response = await fetch(pdfApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: formattedText,
      });

      if (!response.ok) {
        throw new Error(`PDF API returned ${response.status}`);
      }

      // Check response content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        logger.error('Invalid response type from PDF API', { contentType });
        throw new Error(`Invalid response type: ${contentType}`);
      }

      // Get PDF blob from response
      const pdfBlob = await response.blob();
      
      // Validate blob size
      if (pdfBlob.size === 0) {
        throw new Error('PDF API returned empty response');
      }
      
      // Create object URL for viewing
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Clean up URL after 1 minute
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
      
      logger.info('LLM input data sent to PDF API successfully', { size: pdfBlob.size });
      return { url: pdfUrl };
      
    } catch (error) {
      logger.error('Failed to send LLM input data to PDF API', error);
      return { error: error instanceof Error ? error.message : 'Failed to generate PDF' };
    }
  }
}