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
  CLAUDE = 'claude'
}