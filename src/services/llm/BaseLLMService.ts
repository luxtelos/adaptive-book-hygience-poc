/**
 * Abstract base class for LLM service implementations
 * Provides common functionality for token estimation, rate limiting, and error handling
 */

import { logger } from '@/lib/logger';
import { ILLMService, LLMProvider, LLMResponse, LLMMessage } from './types';

export abstract class BaseLLMService implements ILLMService {
  protected config: any;
  protected provider: LLMProvider;

  constructor(config: any, provider: LLMProvider) {
    this.config = config;
    this.provider = provider;
    logger.debug(`Initializing ${provider.name} LLM service`, { maxTokens: provider.maxTokens });
  }

  /**
   * Estimate token count for a given text
   * Using approximation: 1 token ≈ 4 characters
   */
  estimateTokens(text: string): number {
    const tokenCount = Math.ceil(text.length / 4);
    logger.trace(`Estimated ${tokenCount} tokens for text of length ${text.length}`);
    return tokenCount;
  }

  /**
   * Validate if data fits within token limit with safety margin
   * Uses 80% of max tokens to account for response overhead
   */
  validateTokenLimit(data: any): boolean {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
    const estimatedTokens = this.estimateTokens(jsonString);
    const tokenLimit = this.provider.maxTokens * 0.8; // 80% safety margin
    const isValid = estimatedTokens <= tokenLimit;
    
    logger.debug(`Token validation for ${this.provider.name}`, {
      estimatedTokens,
      tokenLimit,
      maxTokens: this.provider.maxTokens,
      isValid
    });
    
    return isValid;
  }

  /**
   * Get the current provider information
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * Make API request with timeout and error handling
   */
  protected async makeAPIRequest(messages: LLMMessage[]): Promise<LLMResponse> {
    const timeout = this.config.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      logger.debug(`Making API request to ${this.provider.name}`, {
        messageCount: messages.length,
        timeout
      });

      const response = await this.makeProviderSpecificRequest(messages, controller.signal);
      clearTimeout(timeoutId);
      
      logger.debug(`API request successful for ${this.provider.name}`);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        logger.error(`API request timeout for ${this.provider.name}`, { timeout });
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      logger.error(`API request failed for ${this.provider.name}`, { 
        error: error.message,
        status: error.status 
      });
      throw error;
    }
  }

  /**
   * Abstract method for provider-specific API request implementation
   */
  protected abstract makeProviderSpecificRequest(
    messages: LLMMessage[], 
    signal: AbortSignal
  ): Promise<LLMResponse>;

  /**
   * Abstract method for analyzing accounting quality
   */
  abstract analyzeAccountingQuality(rawData: any): Promise<any>;

  /**
   * Health check to verify service availability
   */
  abstract healthCheck(): Promise<boolean>;
}