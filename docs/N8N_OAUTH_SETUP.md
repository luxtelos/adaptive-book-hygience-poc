# N8N OAuth Setup for QuickBooks Integration

## Problem Diagnosis

The error "undefined didn't connect" with `properties.credentials.oauth2.clientId='undefined'` indicates that the N8N webhook handling the OAuth callback doesn't have the QuickBooks client credentials configured.

## Root Cause

When QuickBooks redirects back to your N8N webhook after user authorization, N8N needs to exchange the authorization code for access tokens. This requires:
1. **Client ID** - Your QuickBooks app ID
2. **Client Secret** - Your QuickBooks app secret
3. **Redirect URI** - Must match exactly what's registered in QuickBooks

The N8N instance at `https://n8n-1-102-1-c1zi.onrender.com` needs these credentials configured as environment variables.

## Solution

### Step 1: Configure N8N Environment Variables

Add these environment variables to your N8N instance (on Render):

```bash
QBO_CLIENT_ID=ABihRfqBbMGUAAGmiNPjFCWXXbc7NOgCRmDOSwu6pbCGH6KaZm
QBO_CLIENT_SECRET=<your-quickbooks-client-secret>
FRONTEND_URL=http://localhost:3000  # or your production URL
```

### Step 2: Import the OAuth Callback Handler Workflow

1. Log into your N8N instance
2. Import the workflow from `n8n-oauth-callback-handler.json`
3. Activate the workflow
4. Verify the webhook URL matches: `/webhook/115c6828-fb49-4a60-aa8d-e6eb5346f24d`

### Step 3: Verify QuickBooks App Configuration

In your QuickBooks Developer Dashboard:

1. Go to your app settings for "book-hygiene" (App ID: 45c674e7-a754-4017-ac2b-f4029525171e)
2. Under OAuth 2.0 settings, ensure the Redirect URI is exactly:
   ```
   https://n8n-1-102-1-c1zi.onrender.com/webhook/115c6828-fb49-4a60-aa8d-e6eb5346f24d
   ```
3. Verify the app is in the correct environment (Development vs Production)

### Step 4: Import Supporting Workflows

Also import these workflows to N8N:
- `n8n-oauth-token-refresh.json` - For token refresh operations
- `n8n-oauth-token-revoke.json` - For token revocation

Update their webhook paths in N8N and then update your `.env` file accordingly:
```bash
VITE_N8N_OAUTH_TOKEN_ENDPOINT=https://n8n-1-102-1-c1zi.onrender.com/webhook/oauth/token/refresh
VITE_N8N_OAUTH_REVOKE_ENDPOINT=https://n8n-1-102-1-c1zi.onrender.com/webhook/oauth/token/revoke
```

## OAuth Flow Explained

1. **User clicks "Connect to QuickBooks"** in your React app
2. **React redirects to QuickBooks** with:
   - Client ID: `ABihRfqBbMGUAAGmiNPjFCWXXbc7NOgCRmDOSwu6pbCGH6KaZm`
   - Redirect URI: `https://n8n-1-102-1-c1zi.onrender.com/webhook/115c6828-fb49-4a60-aa8d-e6eb5346f24d`
   - State: Random CSRF token

3. **User authorizes in QuickBooks**
4. **QuickBooks redirects to N8N webhook** with:
   - Authorization code
   - State (for CSRF validation)
   - Realm ID (QuickBooks company ID)

5. **N8N webhook exchanges code for tokens**:
   - Uses Client ID + Client Secret for authentication
   - Sends POST request to QuickBooks token endpoint
   - Receives access token and refresh token

6. **N8N redirects back to React app** with tokens in URL parameters
7. **React app stores tokens** in Supabase for future use

## Security Notes

- **Client Secret** should NEVER be in frontend code (React)
- **Client Secret** must be configured in N8N backend only
- **CSRF Protection** using state parameter prevents attacks
- **Tokens are encrypted** when stored in Supabase
- **Token refresh** happens automatically before expiry

## Testing

1. Clear browser cookies/cache
2. Go to http://localhost:3000
3. Complete the agent form
4. Click "Connect to QuickBooks"
5. Authorize in QuickBooks
6. Should redirect back with tokens

## Common Issues

### "undefined didn't connect"
- N8N doesn't have QBO_CLIENT_ID configured
- Check N8N environment variables

### "invalid_client" error
- Client ID/Secret mismatch
- Wrong environment (sandbox vs production)

### "redirect_uri_mismatch" error
- Redirect URI in QuickBooks app doesn't match exactly
- Check for trailing slashes, protocol (http vs https)

### Tokens not storing
- Check Supabase connection
- Verify `expires_at` column exists in `qbo_tokens` table

## Support

For N8N logs, check:
- Render dashboard → Services → n8n-1-102-1 → Logs
- N8N Executions tab for workflow runs

For QuickBooks OAuth issues:
- Check QuickBooks Developer Dashboard audit logs
- Verify app status (not suspended/disabled)