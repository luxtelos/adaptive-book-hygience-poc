/**
 * useBatchProgress - React hook for tracking Claude batch processing progress
 * Provides real-time status updates and progress indication
 */

import { useState, useEffect, useCallback } from 'react';
import { batchSessionManager } from '@/services/llm/BatchSessionManager';
import { BatchJob } from '@/services/llm/types';
import { logger } from '@/lib/logger';

export interface BatchProgressState {
  batchId: string | null;
  status: 'idle' | 'submitting' | 'polling' | 'completed' | 'failed' | 'timeout';
  progress: number; // 0-100
  currentPoll: number;
  maxPolls: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  error: string | null;
  result: any | null;
}

export interface BatchProgressActions {
  startBatch: (batchId: string) => void;
  updateProgress: (poll: number, maxPolls: number) => void;
  completeBatch: (result: any) => void;
  failBatch: (error: string) => void;
  resetBatch: () => void;
  getBatchJob: () => BatchJob | null;
}

export function useBatchProgress(): [BatchProgressState, BatchProgressActions] {
  const [state, setState] = useState<BatchProgressState>({
    batchId: null,
    status: 'idle',
    progress: 0,
    currentPoll: 0,
    maxPolls: 5,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    error: null,
    result: null
  });

  const [startTime, setStartTime] = useState<number>(0);

  // Update elapsed time every second during active polling
  useEffect(() => {
    if (state.status === 'polling' || state.status === 'submitting') {
      const interval = setInterval(() => {
        const elapsed = startTime > 0 ? Date.now() - startTime : 0;
        setState(prev => ({
          ...prev,
          elapsedTime: elapsed,
          estimatedTimeRemaining: calculateEstimatedTime(elapsed, prev.currentPoll, prev.maxPolls)
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [state.status, startTime]);

  const calculateEstimatedTime = (elapsed: number, currentPoll: number, maxPolls: number): number => {
    if (currentPoll === 0) return 30000; // 30 seconds default
    
    // Based on exponential backoff pattern: 0, 2, 6, 14, 30 seconds
    const pollTimes = [0, 2000, 6000, 14000, 30000];
    const remainingPolls = maxPolls - currentPoll;
    
    if (remainingPolls <= 0) return 0;
    if (currentPoll >= pollTimes.length) return Math.max(0, 30000 - elapsed);
    
    return pollTimes[pollTimes.length - 1] - elapsed;
  };

  const startBatch = useCallback((batchId: string) => {
    logger.info('Starting batch progress tracking', { batchId });
    
    const now = Date.now();
    setStartTime(now);
    
    setState({
      batchId,
      status: 'submitting',
      progress: 5, // 5% for successful submission
      currentPoll: 0,
      maxPolls: 5,
      elapsedTime: 0,
      estimatedTimeRemaining: 30000,
      error: null,
      result: null
    });
  }, []);

  const updateProgress = useCallback((poll: number, maxPolls: number) => {
    const progressPercent = Math.round((poll / maxPolls) * 85) + 10; // 10-95%
    
    logger.debug('Updating batch progress', { poll, maxPolls, progressPercent });
    
    setState(prev => ({
      ...prev,
      status: 'polling',
      progress: progressPercent,
      currentPoll: poll,
      maxPolls
    }));
  }, []);

  const completeBatch = useCallback((result: any) => {
    logger.info('Batch completed successfully');
    
    setState(prev => ({
      ...prev,
      status: 'completed',
      progress: 100,
      result,
      estimatedTimeRemaining: 0
    }));
  }, []);

  const failBatch = useCallback((error: string) => {
    logger.error('Batch failed', { error });
    
    setState(prev => ({
      ...prev,
      status: 'failed',
      error,
      estimatedTimeRemaining: 0
    }));
  }, []);

  const resetBatch = useCallback(() => {
    logger.debug('Resetting batch progress');
    
    setState({
      batchId: null,
      status: 'idle',
      progress: 0,
      currentPoll: 0,
      maxPolls: 5,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      error: null,
      result: null
    });
    
    setStartTime(0);
  }, []);

  const getBatchJob = useCallback((): BatchJob | null => {
    if (!state.batchId) return null;
    return batchSessionManager.getBatchJob(state.batchId);
  }, [state.batchId]);

  const actions: BatchProgressActions = {
    startBatch,
    updateProgress,
    completeBatch,
    failBatch,
    resetBatch,
    getBatchJob
  };

  return [state, actions];
}

// Helper function to format time duration
export function formatDuration(ms: number): string {
  if (ms < 1000) return '< 1s';
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Helper function to get progress color based on status
export function getProgressColor(status: BatchProgressState['status']): string {
  switch (status) {
    case 'submitting':
    case 'polling':
      return 'blue';
    case 'completed':
      return 'green';
    case 'failed':
    case 'timeout':
      return 'red';
    default:
      return 'gray';
  }
}

// Helper function to get status message
export function getStatusMessage(state: BatchProgressState): string {
  switch (state.status) {
    case 'idle':
      return 'Ready to start analysis';
    case 'submitting':
      return 'Submitting request to Claude...';
    case 'polling':
      return `Processing... (${state.currentPoll}/${state.maxPolls} checks)`;
    case 'completed':
      return 'Analysis completed successfully!';
    case 'failed':
      return state.error || 'Analysis failed';
    case 'timeout':
      return 'Analysis timed out after 30 seconds';
    default:
      return 'Unknown status';
  }
}