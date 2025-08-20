# QBO Token 409 Conflict Fix - Deployment Guide

## Overview
This deployment resolves the 409 Conflict errors when storing QuickBooks OAuth tokens by implementing atomic database operations through PostgreSQL RPC functions.

## Deployment Steps

### Step 1: Deploy Database Changes (Supabase Dashboard)

1. Navigate to Supabase SQL Editor
2. Run the migration script from `supabase/migrations/002_qbo_token_rpc_functions.sql`
3. Verify functions are created:
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname IN ('store_qbo_token', 'get_qbo_token', 'deactivate_qbo_tokens', 'delete_qbo_tokens', 'update_qbo_token');
   ```

### Step 2: Deploy Application Code

1. The following files have been updated:
   - `src/services/qboTokenService.ts` - Uses RPC functions instead of direct table operations
   - `docs/adr/001-qbo-token-storage-atomic-operations.md` - Architecture decision record
   - `docs/adr/002-clerk-supabase-rls-integration.md` - Future enhancement plan

2. Commit and deploy:
   ```bash
   git add -A
   git commit -m "fix: implement atomic QBO token storage using RPC functions to prevent 409 conflicts"
   git push origin main
   ```

### Step 3: Verify Deployment

Run the test script to verify RPC functions work:
```bash
node test-qbo-token-rpc.js
```

Expected output:
```
✅ Token stored successfully
✅ Token retrieved
✅ Token updated
✅ Token replaced atomically
✅ Tokens deactivated
✅ Tokens deleted
```

### Step 4: Monitor Production

1. Check for 409 errors in Supabase logs:
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM http_logs 
   WHERE status_code = 409 
   AND path LIKE '%qbo_tokens%'
   ORDER BY timestamp DESC;
   ```

2. Monitor application logs for successful token storage

### Step 5: Cleanup (After Stability Confirmed)

After 1-2 days of stable operation:
1. Remove test files:
   - `test-qbo-token-rpc.js`
   - Any other test scripts

2. Archive old migration files if needed

## Rollback Plan

If issues occur, rollback by:

1. Revert code changes:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. Keep RPC functions (they don't affect existing functionality)

3. Or completely remove RPC functions:
   ```sql
   DROP FUNCTION IF EXISTS public.store_qbo_token;
   DROP FUNCTION IF EXISTS public.get_qbo_token;
   DROP FUNCTION IF EXISTS public.deactivate_qbo_tokens;
   DROP FUNCTION IF EXISTS public.delete_qbo_tokens;
   DROP FUNCTION IF EXISTS public.update_qbo_token;
   
   -- Re-enable RLS if needed
   ALTER TABLE public.qbo_tokens ENABLE ROW LEVEL SECURITY;
   ```

## Key Changes Summary

### Before (Non-Atomic)
- Multiple HTTP requests for deactivate + insert
- Race conditions causing 409 conflicts
- Complex retry logic in application

### After (Atomic)
- Single RPC call handles delete + insert atomically
- No race conditions possible
- Simplified application code
- Better performance

## Success Metrics

- ✅ Zero 409 Conflict errors in production
- ✅ Successful OAuth flow completion rate > 99%
- ✅ Token refresh continues working
- ✅ Old tokens properly deleted on re-authentication

## Support

If issues arise:
1. Check Supabase logs for RPC function errors
2. Verify user has valid Clerk session before token operations
3. Ensure environment variables are set correctly