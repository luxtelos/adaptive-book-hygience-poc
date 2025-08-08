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
}

export interface StoredQBOTokens extends QBOTokens {
  id: string;
  user_id: string;
  is_active: boolean;
}

/**
 * Service for managing QuickBooks OAuth tokens in Supabase
 */
export class QBOTokenService {
  private static readonly TABLE_NAME = 'qbo_tokens';
  
  /**
   * Store QBO tokens for a user (encrypted in database)
   */
  static async storeTokens(clerkUserId: string, tokens: QBOTokens): Promise<boolean> {
    try {
      logger.debug('Storing QBO tokens for user', { clerkUserId, realmId: tokens.realm_id });
      
      // First, deactivate any existing tokens for this user
      await this.deactivateExistingTokens(clerkUserId);
      
      const tokenData = {
        user_id: clerkUserId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        realm_id: tokens.realm_id,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in || 3600,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from(this.TABLE_NAME)
        .insert([tokenData]);

      if (error) {
        logger.error('Failed to store QBO tokens', error);
        return false;
      }

      logger.info('QBO tokens stored successfully');
      return true;
    } catch (error) {
      logger.error('Unexpected error storing QBO tokens', error);
      return false;
    }
  }

  /**
   * Retrieve active QBO tokens for a user
   */
  static async getTokens(clerkUserId: string): Promise<StoredQBOTokens | null> {
    try {
      logger.debug('Retrieving QBO tokens for user', { clerkUserId });

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', clerkUserId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        logger.error('Failed to retrieve QBO tokens', error);
        return null;
      }

      if (!data || data.length === 0) {
        logger.debug('No active QBO tokens found for user');
        return null;
      }

      const tokens = data[0] as StoredQBOTokens;
      logger.debug('Retrieved QBO tokens', { realmId: tokens.realm_id });
      return tokens;
    } catch (error) {
      logger.error('Unexpected error retrieving QBO tokens', error);
      return null;
    }
  }

  /**
   * Update existing tokens (for token refresh)
   */
  static async updateTokens(clerkUserId: string, tokens: Partial<QBOTokens>): Promise<boolean> {
    try {
      logger.debug('Updating QBO tokens for user', { clerkUserId });

      const updateData = {
        ...tokens,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update(updateData)
        .eq('user_id', clerkUserId)
        .eq('is_active', true);

      if (error) {
        logger.error('Failed to update QBO tokens', error);
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
   * Deactivate all tokens for a user (on logout or new connection)
   */
  static async deactivateExistingTokens(clerkUserId: string): Promise<boolean> {
    try {
      logger.debug('Deactivating existing QBO tokens for user', { clerkUserId });

      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', clerkUserId)
        .eq('is_active', true);

      if (error) {
        logger.error('Failed to deactivate existing QBO tokens', error);
        return false;
      }

      logger.info('Existing QBO tokens deactivated successfully');
      return true;
    } catch (error) {
      logger.error('Unexpected error deactivating QBO tokens', error);
      return false;
    }
  }

  /**
   * Clear all QBO data for a user (called on logout)
   */
  static async clearUserData(clerkUserId: string): Promise<boolean> {
    try {
      logger.debug('Clearing all QBO data for user', { clerkUserId });
      
      // Deactivate tokens
      const success = await this.deactivateExistingTokens(clerkUserId);
      
      if (success) {
        logger.info('All QBO data cleared for user');
      }
      
      return success;
    } catch (error) {
      logger.error('Unexpected error clearing QBO data', error);
      return false;
    }
  }

  /**
   * Validate if tokens are still functional (basic check)
   */
  static async validateTokens(tokens: StoredQBOTokens): Promise<boolean> {
    try {
      // Basic validation - check if tokens exist and have required fields
      if (!tokens.access_token || !tokens.realm_id) {
        return false;
      }

      // Check if tokens are expired (basic time check)
      if (tokens.expires_in) {
        const createdAt = new Date(tokens.created_at || tokens.updated_at || '');
        const expiryTime = createdAt.getTime() + (tokens.expires_in * 1000);
        const now = Date.now();
        
        if (now >= expiryTime) {
          logger.debug('QBO tokens appear to be expired');
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error validating QBO tokens', error);
      return false;
    }
  }
}