/**
 * @file pdfGenerationService.ts
 * @description Service for generating PDF reports from assessment data
 * 
 * This service integrates with the N8N webhook endpoint to convert
 * markdown-formatted assessment reports into PDF documents.
 */

import { HygieneAssessmentResult } from './perplexityService';
import logger from '../lib/logger';

// =================================================================================
// CONFIGURATION
// =================================================================================

const PDF_API_URL = import.meta.env.VITE_PDF_API_URL || 'https://n8n-1-102-1-c1zi.onrender.com/webhook/convert-pdf';
const PDF_TIMEOUT = 30000; // 30 seconds

// =================================================================================
// INTERFACES
// =================================================================================

export interface PDFGenerationOptions {
  action: 'download' | 'view';
  fileName?: string;
}

export interface PDFGenerationResult {
  success: boolean;
  pdfBlob?: Blob;
  pdfUrl?: string;
  error?: string;
}

// =================================================================================
// MAIN SERVICE CLASS
// =================================================================================

export class PDFGenerationService {
  /**
   * Generate markdown report from assessment results
   */
  private static generateMarkdownReport(
    assessmentResult: HygieneAssessmentResult,
    company: string
  ): string {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const formattedTime = currentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Generate assessment ID
    const assessmentId = `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Format following the OUTPUT FORMAT SPECIFICATION from the prompt
    let markdown = `# FINANCIAL BOOKS HYGIENE ASSESSMENT REPORT

**Company:** ${company}  
**Assessment Date:** ${currentDate.toISOString()}

---

## SECTION 1: EXECUTIVE SUMMARY (Business Owner)

### FINANCIAL BOOKS HEALTH ASSESSMENT

**Overall Health Score:** ${assessmentResult.overallScore}/100 - ${assessmentResult.businessOwnerSummary.healthScore || assessmentResult.readinessStatus.replace(/_/g, ' ')}

### WHAT THIS MEANS FOR YOUR BUSINESS:

${assessmentResult.businessOwnerSummary.whatThisMeans}

### KEY FINDINGS:

${assessmentResult.businessOwnerSummary.keyFindings.map(finding => `• ${finding}`).join('\n')}

### RECOMMENDED NEXT STEPS:

${assessmentResult.businessOwnerSummary.nextSteps.map(step => `• ${step}`).join('\n')}

---

## SECTION 2: DETAILED ASSESSMENT RESULTS

### PILLAR BREAKDOWN:

• Bank & Credit Card Matching: ${assessmentResult.pillarScores.reconciliation}/100
• Money Organization System: ${assessmentResult.pillarScores.coaIntegrity}/100
• Transaction Categorization: ${assessmentResult.pillarScores.categorization}/100
• Control Account Accuracy: ${assessmentResult.pillarScores.controlAccount}/100
• Customer/Vendor Balances: ${assessmentResult.pillarScores.aging}/100

---

## SECTION 3: TECHNICAL REMEDIATION PLAN (Bookkeeper)

### CRITICAL ISSUES REQUIRING IMMEDIATE ACTION:

${assessmentResult.bookkeeperReport.criticalIssues.length > 0 
  ? assessmentResult.bookkeeperReport.criticalIssues.map(issue => 
      `**Priority ${issue.priority}: ${issue.pillar}**
• Problem: ${issue.issue}
• Location: ${issue.qboLocation}
• Fix: ${issue.fixSteps}
• Time: ${issue.estimatedTime}
`).join('\n')
  : 'No critical issues identified.'}

### RECOMMENDED IMPROVEMENTS:

${assessmentResult.bookkeeperReport.recommendedImprovements.length > 0
  ? assessmentResult.bookkeeperReport.recommendedImprovements.map(improvement => `• ${improvement}`).join('\n')
  : 'No additional improvements recommended at this time.'}

### ONGOING MAINTENANCE REQUIREMENTS:

${assessmentResult.bookkeeperReport.ongoingMaintenance.length > 0
  ? assessmentResult.bookkeeperReport.ongoingMaintenance.map(task => `• ${task}`).join('\n')
  : 'Standard monthly bookkeeping maintenance recommended.'}

---

## SECTION 4: SCORING TRANSPARENCY

### ASSESSMENT METHODOLOGY SUMMARY:

• Assessment Date: ${formattedDate}
• Data Period Analyzed: ${assessmentResult.assessmentMetadata.dataPeriod}
• Scoring Model: ${assessmentResult.assessmentMetadata.scoringModel || 'Day-30 Readiness Framework'}
• Repeatability: Same data will produce identical results
${assessmentResult.assessmentMetadata.limitations && assessmentResult.assessmentMetadata.limitations.length > 0 
  ? `• Limitations: ${assessmentResult.assessmentMetadata.limitations.join(', ')}`
  : ''}

---

*This report follows established CPA standards and the Day-30 Readiness Framework for bookkeeping assessment.*

**Assessment ID:** ${assessmentId}  
**Generated on:** ${formattedDate}, ${formattedTime}`;

    return markdown;
  }

  /**
   * Send markdown to PDF API and get PDF blob
   */
  private static async generatePDF(markdown: string): Promise<Blob> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PDF_TIMEOUT);

    try {
      const response = await fetch(PDF_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: markdown,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error(`Invalid response type: ${contentType}`);
      }

      return await response.blob();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('PDF generation timed out');
      }
      throw error;
    }
  }

  /**
   * Generate PDF report from assessment results
   */
  public static async generateReport(
    assessmentResult: HygieneAssessmentResult,
    company: string,
    options: PDFGenerationOptions
  ): Promise<PDFGenerationResult> {
    try {
      logger.info(`Generating PDF report for ${company} (${options.action})`);

      // Generate markdown report
      const markdown = this.generateMarkdownReport(assessmentResult, company);
      logger.debug('Markdown report generated', { length: markdown.length });

      // Send to PDF API
      const pdfBlob = await this.generatePDF(markdown);
      logger.info('PDF generated successfully', { size: pdfBlob.size });

      // Create object URL for viewing/downloading
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Handle action
      if (options.action === 'download') {
        // Create download link
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = options.fileName || `assessment_report_${company}_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up URL after download
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
        
        return {
          success: true,
          pdfBlob
        };
      } else {
        // Open in new tab for viewing
        window.open(pdfUrl, '_blank');
        
        // Clean up URL after a delay
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000); // Keep for 1 minute
        
        return {
          success: true,
          pdfBlob,
          pdfUrl
        };
      }
    } catch (error) {
      logger.error('PDF generation failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed'
      };
    }
  }

  /**
   * Check if PDF API is available
   */
  public static async checkAPIHealth(): Promise<boolean> {
    try {
      const response = await fetch(PDF_API_URL, {
        method: 'HEAD'
      });
      return response.ok || response.status === 405; // 405 means endpoint exists but doesn't support HEAD
    } catch (error) {
      logger.error('PDF API health check failed', error);
      return false;
    }
  }
}

export default PDFGenerationService;