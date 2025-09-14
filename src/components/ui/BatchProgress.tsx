/**
 * BatchProgress - UI component for displaying Claude batch processing progress
 */

import React from 'react';
import { BatchProgressState, formatDuration, getProgressColor, getStatusMessage } from '@/hooks/useBatchProgress';

interface BatchProgressProps {
  state: BatchProgressState;
  onCancel?: () => void;
  className?: string;
}

export function BatchProgress({ state, onCancel, className = '' }: BatchProgressProps) {
  if (state.status === 'idle') {
    return null;
  }

  const progressColor = getProgressColor(state.status);
  const statusMessage = getStatusMessage(state);
  const isActive = state.status === 'submitting' || state.status === 'polling';

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {isActive && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          <span className="text-sm font-medium text-gray-900">
            Financial Analysis Progress
          </span>
        </div>
        
        {onCancel && isActive && (
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{statusMessage}</span>
          <span>{state.progress}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              progressColor === 'blue' ? 'bg-blue-600' :
              progressColor === 'green' ? 'bg-green-600' :
              progressColor === 'red' ? 'bg-red-600' :
              'bg-gray-400'
            }`}
            style={{ width: `${Math.max(state.progress, 5)}%` }}
          />
        </div>
      </div>

      {/* Status Details */}
      <div className="space-y-2 text-xs text-gray-600">
        {/* Timing Information */}
        {isActive && (
          <div className="flex justify-between">
            <span>Elapsed: {formatDuration(state.elapsedTime)}</span>
            <span>Est. remaining: {formatDuration(state.estimatedTimeRemaining)}</span>
          </div>
        )}

        {/* Polling Progress */}
        {state.status === 'polling' && (
          <div className="flex justify-between">
            <span>Check {state.currentPoll} of {state.maxPolls}</span>
            <span>Using Claude Batch API</span>
          </div>
        )}

        {/* Batch ID (for debugging) */}
        {state.batchId && process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 font-mono break-all">
            Batch: {state.batchId}
          </div>
        )}

        {/* Error Message */}
        {state.status === 'failed' && state.error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
            {state.error}
          </div>
        )}

        {/* Success Message */}
        {state.status === 'completed' && (
          <div className="text-green-600 text-sm bg-green-50 p-2 rounded border border-green-200">
            Analysis completed in {formatDuration(state.elapsedTime)}
          </div>
        )}
      </div>

      {/* Info Message for Large Datasets */}
      {isActive && (
        <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
          💡 Large datasets are processed using Claude's batch API to ensure reliable completion
        </div>
      )}
    </div>
  );
}

export default BatchProgress;