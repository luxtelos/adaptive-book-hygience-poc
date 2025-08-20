import { supabase } from '../lib/supabaseConnect';
import logger from '../lib/logger';

export interface QBOTokens {
  access_token: string;
  refresh_token: string | null;
  realm_id: string;
  token_type: string;
  expires_in?: number;
  created_at?: string;
  updated_at?: string;
  expires_at?: string; // Calculated expiration timestamp
}

export interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
}

export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

export enum OAuthErrorType {
  INVALID_GRANT = 'invalid_grant',
  INVALID_REQUEST = 'invalid_request',
  INVALID_CLIENT = 'invalid_client',
  UNAUTHORIZED_CLIENT = 'unauthorized_client',
  UNSUPPORTED_GRANT_TYPE = 'unsupported_grant_type',
  INVALID_SCOPE = 'invalid_scope',
  ACCESS_DENIED = 'access_denied',
  SERVER_ERROR = 'server_error',
  TEMPORARILY_UNAVAILABLE = 'temporarily_unavailable',
  EXPIRED_TOKEN = 'expired_token',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export class OAuthTokenError extends Error {
  constructor(
    public type: OAuthErrorType,
    public message: string,
    public originalError?: any,
    public isRetryable: boolean = false,
    public requiresReauth: boolean = false
  ) {
    super(message);
    this.name = 'OAuthTokenError';
  }
}

export interface StoredQBOTokens extends QBOTokens {
  id: string;
  user_id: string;
  is_active: boolean;
}

/**
 * Configuration for OAuth endpoints
 */
interface OAuthConfig {
  tokenEndpoint: string;
  revokeEndpoint: string;
  clientId: string;
}

/**
 * Service for managing QuickBooks OAuth tokens in Supabase
 * Implements comprehensive OAuth error handling and automatic token refresh
 */
export class QBOTokenService {
  private static readonly TABLE_NAME = 'qbo_tokens';
  private static refreshInProgress = new Map<string, Promise<boolean>>();
  private static refreshAttempts = new Map<string, number>();
  private static get MAX_REFRESH_ATTEMPTS(): number {
    const envValue = import.meta.env.VITE_QBO_TOKEN_REFRESH_RETRY_MAX;
    const parsed = Number(envValue);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 3;
  }
  private static readonly REFRESH_BACKOFF_MS = 2000;
  private static get TOKEN_REFRESH_THRESHOLD_HOURS(): number {
    const envValue = import.meta.env.VITE_QBO_TOKEN_REFRESH_THRESHOLD_HOURS;
    const parsed = Number(envValue);
    return !isNaN(parsed) && parsed > 0 ? parsed : 12; // 12 hours default
  }
  
  /**
   * Get OAuth configuration from environment variables
   * SECURITY: Client secret is NOT included here - handled by N8N proxy backend
   */
  private static getOAuthConfig(): OAuthConfig {
    const tokenEndpoint = import.meta.env.VITE_N8N_OAUTH_TOKEN_ENDPOINT;
    const revokeEndpoint = import.meta.env.VITE_N8N_OAUTH_REVOKE_ENDPOINT;
    const clientId = import.meta.env.VITE_QBO_CLIENT_ID;

    if (!tokenEndpoint) {
      throw new Error('VITE_N8N_OAUTH_TOKEN_ENDPOINT environment variable is required');
    }
    if (!revokeEndpoint) {
      throw new Error('VITE_N8N_OAUTH_REVOKE_ENDPOINT environment variable is required');
    }
    if (!clientId) {
      throw new Error('VITE_QBO_CLIENT_ID environment variable is required');
    }

    return {
      tokenEndpoint,
      revokeEndpoint,
      clientId
    };
  }
  
  /**
   * Store QBO tokens for a user using atomic RPC function
   * Handles delete-then-insert in a single transaction to prevent conflicts
   */
  static async storeTokens(clerkUserId: string, tokens: QBOTokens): Promise<boolean> {
    try {
      logger.debug('Storing QBO tokens for user', { clerkUserId, realmId: tokens.realm_id });
      
      const expiresIn = tokens.expires_in || (12 * 60 * 60); // Default 12 hours in seconds
      
      // Use RPC function for atomic operation
      const { data, error } = await supabase.rpc('store_qbo_token', {
        p_user_id: clerkUserId,
        p_access_token: tokens.access_token,
        p_refresh_token: tokens.refresh_token || '',
        p_realm_id: tokens.realm_id,
        p_expires_in: expiresIn
      });

      if (error) {
        logger.error('Failed to store QBO tokens', error);
        return false;
      }

      logger.info('QBO tokens stored successfully via RPC function');
      return true;
    } catch (error) {
      logger.error('Unexpected error storing QBO tokens', error);
      return false;
    }
  }

  /**
   * Retrieve active QBO tokens for a user using RPC function
   */
  static async getTokens(clerkUserId: string): Promise<StoredQBOTokens | null> {
    try {
      logger.debug('Retrieving QBO tokens for user', { clerkUserId });

      const { data, error } = await supabase.rpc('get_qbo_token', {
        p_user_id: clerkUserId
      });

      if (error) {
        logger.error('Failed to retrieve QBO tokens', error);
        return null;
      }

      // Handle RPC response format
      if (!data || !data.success) {
        logger.debug('No active QBO tokens found for user');
        return null;
      }

      // Extract token from RPC response
      // data.data can be an array (all tokens) or single object (specific token)
      const tokenData = Array.isArray(data.data) ? data.data[0] : data.data;
      
      if (!tokenData) {
        logger.debug('No active QBO tokens found for user');
        return null;
      }

      const tokens = tokenData as StoredQBOTokens;
      logger.debug('Retrieved QBO tokens', { realmId: tokens.realm_id });
      return tokens;
    } catch (error) {
      logger.error('Unexpected error retrieving QBO tokens', error);
      return null;
    }
  }

  /**
   * Update existing tokens (for token refresh) using RPC function
   */
  static async updateTokens(clerkUserId: string, tokens: Partial<QBOTokens>): Promise<boolean> {
    try {
      logger.debug('Updating QBO tokens for user', { clerkUserId });

      // Get realm_id from existing tokens if not provided
      let realmId = tokens.realm_id;
      if (!realmId) {
        const existingTokens = await this.getTokens(clerkUserId);
        if (!existingTokens) {
          logger.error('No existing tokens found to update');
          return false;
        }
        realmId = existingTokens.realm_id;
      }

      const { data, error } = await supabase.rpc('update_qbo_token', {
        p_user_id: clerkUserId,
        p_realm_id: realmId,
        p_access_token: tokens.access_token!,
        p_refresh_token: tokens.refresh_token || null,
        p_expires_in: tokens.expires_in || null
      });

      if (error) {
        logger.error('Failed to update QBO tokens', error);
        return false;
      }

      if (!data || !data.success) {
        logger.error('Failed to update QBO tokens', data?.message || 'Unknown error');
        return false;
      }

      logger.info('QBO tokens updated successfully');
      return true;
    } catch (error) {
      logger.error('Unexpected error updating QBO tokens', error);
      return false;
    }
  }

  /**
   * Check if user has valid QBO tokens
   */
  static async hasValidTokens(clerkUserId: string): Promise<boolean> {
    const tokens = await this.getTokens(clerkUserId);
    return tokens !== null;
  }

  /**
   * Deactivate all tokens for a user using RPC function
   */
  static async deactivateExistingTokens(clerkUserId: string): Promise<boolean> {
    try {
      logger.debug('Deactivating existing QBO tokens for user', { clerkUserId });

      const { data, error } = await supabase.rpc('deactivate_qbo_tokens', {
        p_user_id: clerkUserId
      });

      if (error) {
        logger.error('Failed to deactivate existing QBO tokens', error);
        return false;
      }

      if (data && data.success) {
        logger.info('Existing QBO tokens deactivated successfully', { count: data.count });
      }
      
      return true;
    } catch (error) {
      logger.error('Unexpected error deactivating QBO tokens', error);
      return false;
    }
  }

  /**
   * Clear tokens for a user (alias for clearUserData)
   */
  static async clearTokens(clerkUserId: string): Promise<boolean> {
    return this.clearUserData(clerkUserId);
  }

  /**
   * Clear all QBO data for a user (called on logout)
   * Now uses delete instead of deactivate for permanent removal
   */
  static async clearUserData(clerkUserId: string): Promise<boolean> {
    try {
      logger.debug('Clearing all QBO data for user', { clerkUserId });
      
      // Clear any ongoing refresh attempts
      this.refreshInProgress.delete(clerkUserId);
      this.refreshAttempts.delete(clerkUserId);
      
      // Delete tokens permanently using RPC function
      const { data, error } = await supabase.rpc('delete_qbo_tokens', {
        p_user_id: clerkUserId
      });

      if (error) {
        logger.error('Failed to clear QBO tokens', error);
        return false;
      }
      
      if (data && data.success) {
        logger.info('All QBO data cleared for user', { count: data.count });
      }
      
      return true;
    } catch (error) {
      logger.error('Unexpected error clearing QBO data', error);
      return false;
    }
  }

  /**
   * Check if tokens need to be refreshed (within threshold of expiry)
   */
  static isTokenNearExpiry(tokens: StoredQBOTokens): boolean {
    try {
      if (!tokens.expires_at && !tokens.expires_in) {
        return false; // No expiry info, assume valid
      }

      const now = Date.now();
      let expiryTime: number;

      if (tokens.expires_at) {
        expiryTime = new Date(tokens.expires_at).getTime();
      } else if (tokens.expires_in) {
        const createdAt = new Date(tokens.created_at || tokens.updated_at || '');
        expiryTime = createdAt.getTime() + (tokens.expires_in * 1000);
      } else {
        return false;
      }

      const thresholdMs = this.TOKEN_REFRESH_THRESHOLD_HOURS * 60 * 60 * 1000;
      return (expiryTime - now) <= thresholdMs;
    } catch (error) {
      logger.error('Error checking token expiry', error);
      return true; // Assume needs refresh on error
    }
  }

  /**
   * Check if tokens are expired
   */
  static isTokenExpired(tokens: StoredQBOTokens): boolean {
    try {
      if (!tokens.expires_at && !tokens.expires_in) {
        return false; // No expiry info, assume valid
      }

      const now = Date.now();
      let expiryTime: number;

      if (tokens.expires_at) {
        expiryTime = new Date(tokens.expires_at).getTime();
      } else if (tokens.expires_in) {
        const createdAt = new Date(tokens.created_at || tokens.updated_at || '');
        expiryTime = createdAt.getTime() + (tokens.expires_in * 1000);
      } else {
        return false;
      }

      return now >= expiryTime;
    } catch (error) {
      logger.error('Error checking token expiry', error);
      return true; // Assume expired on error
    }
  }

  /**
   * Validate if tokens are still functional (comprehensive check)
   */
  static async validateTokens(tokens: StoredQBOTokens): Promise<boolean> {
    try {
      // Basic validation - check if tokens exist and have required fields
      if (!tokens.access_token || !tokens.realm_id) {
        return false;
      }

      // Check if tokens are expired
      if (this.isTokenExpired(tokens)) {
        logger.debug('QBO tokens are expired');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error validating QBO tokens', error);
      return false;
    }
  }

  /**
   * Validate tokens and refresh if needed
   * This should be called before any QBO API request
   */
  static async validateAndRefreshIfNeeded(clerkUserId: string): Promise<boolean> {
    try {
      logger.debug('Validating QBO tokens before API call', { clerkUserId });
      
      const tokens = await this.getTokens(clerkUserId);
      if (!tokens) {
        logger.warn('No tokens found for user', { clerkUserId });
        return false;
      }

      // Check if tokens are expired or near expiry
      if (this.isTokenExpired(tokens)) {
        logger.info('Tokens are expired, attempting refresh', { clerkUserId });
        try {
          return await this.refreshAccessToken(clerkUserId);
        } catch (refreshError: any) {
          // If refresh fails on expired tokens, clear them for fresh OAuth
          logger.error('Failed to refresh expired tokens, clearing for re-authentication', refreshError);
          await this.clearTokens(clerkUserId);
          return false;
        }
      }

      if (this.isTokenNearExpiry(tokens)) {
        logger.info('Tokens near expiry, proactively refreshing', { clerkUserId });
        try {
          return await this.refreshAccessToken(clerkUserId);
        } catch (refreshError: any) {
          // If it's near expiry and refresh fails, we can still try using the existing token
          logger.warn('Failed to proactively refresh tokens, will use existing tokens', refreshError);
          return true; // Return true to try with existing tokens
        }
      }

      logger.debug('Tokens are valid', { clerkUserId });
      return true;
    } catch (error) {
      logger.error('Error validating/refreshing tokens', error);
      return false;
    }
  }

  /**
   * Refresh access token using refresh token with comprehensive error handling
   */
  static async refreshAccessToken(clerkUserId: string): Promise<boolean> {
    // Check if refresh is already in progress for this user
    const existingRefresh = this.refreshInProgress.get(clerkUserId);
    if (existingRefresh) {
      logger.debug('Token refresh already in progress, waiting for completion');
      return await existingRefresh;
    }

    // Start refresh process
    const refreshPromise = this.performTokenRefresh(clerkUserId);
    this.refreshInProgress.set(clerkUserId, refreshPromise);

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      this.refreshInProgress.delete(clerkUserId);
    }
  }

  /**
   * Perform the actual token refresh with retry logic and error handling
   */
  private static async performTokenRefresh(clerkUserId: string): Promise<boolean> {
    try {
      // Get current tokens
      const currentTokens = await this.getTokens(clerkUserId);
      if (!currentTokens || !currentTokens.refresh_token) {
        throw new OAuthTokenError(
          OAuthErrorType.INVALID_GRANT,
          'No valid refresh token found',
          null,
          false,
          true
        );
      }

      const config = this.getOAuthConfig();
      const attemptCount = this.refreshAttempts.get(clerkUserId) || 0;

      if (attemptCount >= this.MAX_REFRESH_ATTEMPTS) {
        logger.error(`Maximum refresh attempts (${this.MAX_REFRESH_ATTEMPTS}) exceeded for user ${clerkUserId}`);
        this.refreshAttempts.delete(clerkUserId);
        throw new OAuthTokenError(
          OAuthErrorType.INVALID_GRANT,
          'Maximum refresh attempts exceeded',
          null,
          false,
          true
        );
      }

      // Increment attempt count
      this.refreshAttempts.set(clerkUserId, attemptCount + 1);

      // Add exponential backoff delay
      if (attemptCount > 0) {
        const delay = this.REFRESH_BACKOFF_MS * Math.pow(2, attemptCount - 1);
        logger.debug(`Applying exponential backoff delay: ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      logger.debug(`Attempting token refresh (attempt ${attemptCount + 1}/${this.MAX_REFRESH_ATTEMPTS})`);

      // Prepare refresh request body as JSON for N8N endpoint
      const requestBody = {
        refresh_token: currentTokens.refresh_token,
        client_id: config.clientId
        // client_secret is added server-side by N8N proxy for security
      };

      // Add AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      let response: Response;
      try {
        response = await fetch(config.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Adaptive-Book-Hygiene/1.0.0'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        // Handle timeout or network errors
        if (error.name === 'AbortError') {
          logger.error('Token refresh request timed out');
        } else {
          logger.error('Network error during token refresh', error);
        }
        
        // Treat timeout/network errors as invalid grant - clear tokens and require re-auth
        logger.info('Clearing tokens due to refresh failure, re-authentication required');
        await this.deactivateExistingTokens(clerkUserId);
        
        throw new OAuthTokenError(
          OAuthErrorType.INVALID_GRANT,
          'Token refresh failed - re-authentication required',
          error,
          false,
          true
        );
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        await this.handleRefreshError(response, clerkUserId);
        return false;
      }

      const tokenData: TokenRefreshResponse = await response.json();

      // Update tokens in database
      const success = await this.updateRefreshedTokens(clerkUserId, tokenData, currentTokens);
      
      if (success) {
        // Reset attempt count on success
        this.refreshAttempts.delete(clerkUserId);
        logger.info('Token refresh completed successfully');
      }
      
      return success;

    } catch (error) {
      if (error instanceof OAuthTokenError) {
        logger.error('OAuth token refresh failed', {
          type: error.type,
          message: error.message,
          requiresReauth: error.requiresReauth,
          isRetryable: error.isRetryable
        });

        // Handle different error types
        if (error.requiresReauth) {
          await this.deactivateExistingTokens(clerkUserId);
        }

        if (!error.isRetryable) {
          this.refreshAttempts.delete(clerkUserId);
        }

        throw error;
      }

      logger.error('Unexpected error during token refresh', error);
      throw new OAuthTokenError(
        OAuthErrorType.UNKNOWN_ERROR,
        'Unexpected error during token refresh',
        error,
        true
      );
    }
  }

  /**
   * Handle refresh token errors with comprehensive OAuth error mapping
   */
  private static async handleRefreshError(response: Response, clerkUserId: string): Promise<void> {
    let errorBody: any;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { error: 'unknown_error', error_description: await response.text() };
    }

    // Handle N8N webhook error format
    let oauthError = errorBody.error;
    let errorDescription = errorBody.error_description;
    
    // Check if this is an N8N-wrapped error response
    if (errorBody.errorDescription === 'invalid_grant' || 
        errorBody.errorDetails?.rawErrorMessage?.[0]?.includes('invalid_grant')) {
      oauthError = 'invalid_grant';
      errorDescription = 'Incorrect Token type or clientID - tokens were created with a different app';
    }

    const errorType = this.mapOAuthError(oauthError || 'unknown_error');
    const isRetryable = this.isRetryableError(errorType, response.status);
    const requiresReauth = this.requiresReauthentication(errorType);

    logger.error('Token refresh failed', {
      status: response.status,
      error: oauthError,
      description: errorDescription,
      type: errorType,
      isRetryable,
      requiresReauth
    });

    // For invalid_grant errors, immediately clear tokens (no retry needed)
    if (errorType === OAuthErrorType.INVALID_GRANT) {
      logger.info('Invalid grant detected - clearing invalid tokens for re-authentication');
      await this.deactivateExistingTokens(clerkUserId);
    }

    throw new OAuthTokenError(
      errorType,
      errorDescription || oauthError || `HTTP ${response.status}: Token refresh failed`,
      errorBody,
      isRetryable,
      requiresReauth
    );
  }

  /**
   * Map OAuth error codes to internal error types
   */
  private static mapOAuthError(error: string): OAuthErrorType {
    const errorMap: Record<string, OAuthErrorType> = {
      'invalid_grant': OAuthErrorType.INVALID_GRANT,
      'invalid_request': OAuthErrorType.INVALID_REQUEST,
      'invalid_client': OAuthErrorType.INVALID_CLIENT,
      'unauthorized_client': OAuthErrorType.UNAUTHORIZED_CLIENT,
      'unsupported_grant_type': OAuthErrorType.UNSUPPORTED_GRANT_TYPE,
      'invalid_scope': OAuthErrorType.INVALID_SCOPE,
      'access_denied': OAuthErrorType.ACCESS_DENIED,
      'server_error': OAuthErrorType.SERVER_ERROR,
      'temporarily_unavailable': OAuthErrorType.TEMPORARILY_UNAVAILABLE,
      'expired_token': OAuthErrorType.EXPIRED_TOKEN
    };

    return errorMap[error.toLowerCase()] || OAuthErrorType.UNKNOWN_ERROR;
  }

  /**
   * Determine if an error is retryable
   */
  private static isRetryableError(errorType: OAuthErrorType, httpStatus: number): boolean {
    // Server errors are generally retryable
    if (httpStatus >= 500) {
      return true;
    }

    // Specific OAuth errors that are retryable
    const retryableErrors = [
      OAuthErrorType.SERVER_ERROR,
      OAuthErrorType.TEMPORARILY_UNAVAILABLE,
      OAuthErrorType.NETWORK_ERROR,
      OAuthErrorType.UNKNOWN_ERROR
    ];

    return retryableErrors.includes(errorType);
  }

  /**
   * Determine if an error requires re-authentication
   */
  private static requiresReauthentication(errorType: OAuthErrorType): boolean {
    const reauthErrors = [
      OAuthErrorType.INVALID_GRANT,
      OAuthErrorType.INVALID_CLIENT,
      OAuthErrorType.UNAUTHORIZED_CLIENT,
      OAuthErrorType.ACCESS_DENIED,
      OAuthErrorType.EXPIRED_TOKEN
    ];

    return reauthErrors.includes(errorType);
  }

  /**
   * Update tokens after successful refresh
   */
  private static async updateRefreshedTokens(
    clerkUserId: string,
    tokenData: TokenRefreshResponse,
    currentTokens: StoredQBOTokens
  ): Promise<boolean> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (tokenData.expires_in * 1000));

      const updateData: Partial<QBOTokens> = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString()
      };

      // Update refresh token if provided
      if (tokenData.refresh_token) {
        updateData.refresh_token = tokenData.refresh_token;
      }

      return await this.updateTokens(clerkUserId, updateData);
    } catch (error) {
      logger.error('Failed to update refreshed tokens', error);
      return false;
    }
  }

  /**
   * Get tokens and automatically refresh if needed
   */
  static async getValidTokens(clerkUserId: string): Promise<StoredQBOTokens | null> {
    try {
      const tokens = await this.getTokens(clerkUserId);
      if (!tokens) {
        return null;
      }

      // Check if tokens need refresh
      if (this.isTokenNearExpiry(tokens)) {
        logger.debug('Tokens are near expiry, attempting refresh');
        const refreshSuccess = await this.refreshAccessToken(clerkUserId);
        
        if (refreshSuccess) {
          // Get updated tokens
          return await this.getTokens(clerkUserId);
        } else {
          logger.warn('Token refresh failed, returning existing tokens');
          // Return existing tokens if they're not fully expired yet
          return this.isTokenExpired(tokens) ? null : tokens;
        }
      }

      return tokens;
    } catch (error) {
      logger.error('Error getting valid tokens', error);
      return null;
    }
  }

  /**
   * Revoke tokens (for logout or deactivation)
   */
  static async revokeTokens(clerkUserId: string): Promise<boolean> {
    try {
      const tokens = await this.getTokens(clerkUserId);
      if (!tokens || !tokens.refresh_token) {
        logger.debug('No tokens to revoke');
        return true;
      }

      const config = this.getOAuthConfig();
      
      // Revoke refresh token (client_secret handled by N8N proxy)
      const revokeBody = {
        token: tokens.refresh_token,
        client_id: config.clientId
        // client_secret added server-side by N8N proxy for security
      };

      try {
        const response = await fetch(config.revokeEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Adaptive-Book-Hygiene/1.0.0'
          },
          body: JSON.stringify(revokeBody)
        });

        if (!response.ok) {
          logger.warn('Token revocation failed', { status: response.status });
        } else {
          logger.info('Tokens revoked successfully');
        }
      } catch (error) {
        logger.warn('Failed to revoke tokens at OAuth provider', error);
      }

      // Always deactivate tokens locally
      return await this.deactivateExistingTokens(clerkUserId);
    } catch (error) {
      logger.error('Error revoking tokens', error);
      return false;
    }
  }
}