/**
 * BatchSessionManager - Manages batch job storage in sessionStorage
 * Automatically cleans up on logout and handles quota limits
 */

import { BatchJob } from './types';
import { logger } from '@/lib/logger';

export class BatchSessionManager {
  private static readonly STORAGE_KEY = 'claude_batch_jobs';
  private static readonly MAX_JOBS = 10; // Limit to prevent quota issues
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.startCleanupTimer();
    this.setupLogoutHandler();
  }

  /**
   * Store a batch job in session storage
   */
  storeBatchJob(job: BatchJob): void {
    try {
      const jobs = this.getAllJobs();
      
      // Remove expired jobs first
      this.cleanupExpiredJobs(jobs);
      
      // Limit number of stored jobs
      if (jobs.length >= BatchSessionManager.MAX_JOBS) {
        // Remove oldest job
        jobs.shift();
        logger.debug('Removed oldest batch job due to storage limit');
      }
      
      // Add new job
      jobs.push(job);
      
      sessionStorage.setItem(BatchSessionManager.STORAGE_KEY, JSON.stringify(jobs));
      logger.debug(`Stored batch job: ${job.batchId}`, { customId: job.customId });
      
    } catch (error) {
      logger.error('Failed to store batch job', { error, batchId: job.batchId });
      // Try to clear storage and retry once
      this.clearAllJobs();
      try {
        sessionStorage.setItem(BatchSessionManager.STORAGE_KEY, JSON.stringify([job]));
      } catch (retryError) {
        logger.error('Failed to store batch job after cleanup', { retryError });
      }
    }
  }

  /**
   * Retrieve a specific batch job
   */
  getBatchJob(batchId: string): BatchJob | null {
    try {
      const jobs = this.getAllJobs();
      return jobs.find(job => job.batchId === batchId) || null;
    } catch (error) {
      logger.error('Failed to retrieve batch job', { error, batchId });
      return null;
    }
  }

  /**
   * Update an existing batch job
   */
  updateBatchJob(batchId: string, updates: Partial<BatchJob>): void {
    try {
      const jobs = this.getAllJobs();
      const jobIndex = jobs.findIndex(job => job.batchId === batchId);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = { ...jobs[jobIndex], ...updates };
        sessionStorage.setItem(BatchSessionManager.STORAGE_KEY, JSON.stringify(jobs));
        logger.debug(`Updated batch job: ${batchId}`, updates);
      } else {
        logger.warn(`Batch job not found for update: ${batchId}`);
      }
    } catch (error) {
      logger.error('Failed to update batch job', { error, batchId });
    }
  }

  /**
   * Remove a specific batch job
   */
  removeBatchJob(batchId: string): void {
    try {
      const jobs = this.getAllJobs().filter(job => job.batchId !== batchId);
      sessionStorage.setItem(BatchSessionManager.STORAGE_KEY, JSON.stringify(jobs));
      logger.debug(`Removed batch job: ${batchId}`);
    } catch (error) {
      logger.error('Failed to remove batch job', { error, batchId });
    }
  }

  /**
   * Get all stored batch jobs
   */
  getAllJobs(): BatchJob[] {
    try {
      const stored = sessionStorage.getItem(BatchSessionManager.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Failed to parse stored batch jobs', { error });
      // Clear corrupted data
      this.clearAllJobs();
      return [];
    }
  }

  /**
   * Get active (non-ended) jobs
   */
  getActiveJobs(): BatchJob[] {
    return this.getAllJobs().filter(job => 
      job.status === 'pending' || job.status === 'in_progress'
    );
  }

  /**
   * Clear all stored batch jobs
   */
  clearAllJobs(): void {
    try {
      sessionStorage.removeItem(BatchSessionManager.STORAGE_KEY);
      logger.debug('Cleared all batch jobs from session storage');
    } catch (error) {
      logger.error('Failed to clear batch jobs', { error });
    }
  }

  /**
   * Check if storage is available and has space
   */
  isStorageAvailable(): boolean {
    try {
      const test = 'storage_test';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage info
   */
  getStorageInfo(): { used: number; available: boolean; jobCount: number } {
    const jobs = this.getAllJobs();
    const stored = sessionStorage.getItem(BatchSessionManager.STORAGE_KEY) || '';
    
    return {
      used: stored.length,
      available: this.isStorageAvailable(),
      jobCount: jobs.length
    };
  }

  /**
   * Clean up expired jobs (older than 24 hours)
   */
  private cleanupExpiredJobs(jobs: BatchJob[]): BatchJob[] {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    const validJobs = jobs.filter(job => {
      const isExpired = (now - job.submittedAt) > twentyFourHours;
      if (isExpired) {
        logger.debug(`Removing expired batch job: ${job.batchId}`);
      }
      return !isExpired;
    });

    if (validJobs.length !== jobs.length) {
      try {
        sessionStorage.setItem(BatchSessionManager.STORAGE_KEY, JSON.stringify(validJobs));
      } catch (error) {
        logger.error('Failed to cleanup expired jobs', { error });
      }
    }

    return validJobs;
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      const jobs = this.getAllJobs();
      this.cleanupExpiredJobs(jobs);
    }, BatchSessionManager.CLEANUP_INTERVAL);
  }

  /**
   * Setup cleanup on logout/page unload
   */
  private setupLogoutHandler(): void {
    // Clear on page unload (includes logout)
    window.addEventListener('beforeunload', () => {
      // Only clear active jobs, keep completed ones for potential retrieval
      const jobs = this.getAllJobs();
      const completedJobs = jobs.filter(job => job.status === 'ended');
      
      if (completedJobs.length > 0) {
        try {
          sessionStorage.setItem(BatchSessionManager.STORAGE_KEY, JSON.stringify(completedJobs));
        } catch (error) {
          logger.error('Failed to preserve completed jobs on unload', { error });
        }
      } else {
        this.clearAllJobs();
      }
    });

    // Listen for Clerk logout events if available
    if (typeof window !== 'undefined' && (window as any).Clerk) {
      (window as any).Clerk.addListener('signOut', () => {
        this.clearAllJobs();
        logger.debug('Cleared batch jobs on user sign out');
      });
    }
  }
}

// Export singleton instance
export const batchSessionManager = new BatchSessionManager();