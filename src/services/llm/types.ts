/**
 * Type definitions for LLM service abstraction layer
 */

export interface LLMProvider {
  name: string;
  maxTokens: number;
  costPer1kTokens: number;
  apiEndpoint?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  tokensUsed?: number;
  provider: string;
  model?: string;
}

export interface ILLMService {
  analyzeAccountingQuality(rawData: any): Promise<any>;
  estimateTokens(text: string): number;
  validateTokenLimit(data: any): boolean;
  getProvider(): LLMProvider;
  healthCheck(): Promise<boolean>;
}

export interface LLMConfig {
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
  apiVersion?: string;
}

export enum LLMProviderType {
  PERPLEXITY = 'perplexity',
  CLAUDE = 'claude',
  CLAUDE_ASYNC = 'claude-async'
}

export interface BatchJob {
  batchId: string;
  customId: string;
  status: 'pending' | 'in_progress' | 'ended' | 'failed';
  submittedAt: number;
  resultsUrl?: string;
  error?: string;
}

export interface BatchRequest {
  custom_id: string;
  params: {
    model: string;
    max_tokens: number;
    temperature?: number;
    system?: string;
    messages: LLMMessage[];
  };
}

export interface BatchResponse {
  id: string;
  type: 'message_batch';
  processing_status: 'in_progress' | 'ended' | 'failed';
  request_counts: {
    processing: number;
    succeeded: number;
    errored: number;
    canceled: number;
    expired: number;
  };
  ended_at?: string;
  created_at: string;
  expires_at: string;
  results_url?: string;
}

export interface BatchResult {
  custom_id: string;
  result: {
    type: 'succeeded' | 'errored';
    message?: {
      content: Array<{ type: 'text'; text: string }>;
      usage: {
        input_tokens: number;
        output_tokens: number;
        service_tier: string;
      };
    };
    error?: {
      type: string;
      message: string;
    };
  };
}

export interface AsyncLLMService extends ILLMService {
  submitBatch(rawData: any): Promise<string>;
  pollBatchStatus(batchId: string): Promise<BatchResponse>;
  retrieveBatchResults(resultsUrl: string): Promise<BatchResult[]>;
  getBatchJob(batchId: string): BatchJob | null;
}