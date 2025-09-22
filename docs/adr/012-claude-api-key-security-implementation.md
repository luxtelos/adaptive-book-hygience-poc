# ADR-012: Claude API Key Security Implementation

Date: 2025-09-22  
Status: Proposed  
Related: ADR-004 (N8N Proxy Architecture)

## Context

During deployment to Netlify, we discovered that the Claude API key was being exposed in the production JavaScript bundle. This occurred because:

1. **Vite Environment Variable Embedding**: Vite automatically embeds ALL `VITE_*` prefixed environment variables into the frontend build at compile time
2. **Frontend API Key Usage**: The Claude API key was being included directly in frontend HTTP requests via the `x-api-key` header
3. **Security Scan Detection**: Netlify's security scanner detected the exposed API key and blocked deployment
4. **Temporary Bypass**: Used `SECRETS_SCAN_SMART_DETECTION_ENABLED=false` to allow deployment while implementing proper solution

## Decision

Implement a secure proxy-based architecture for Claude API key handling, following the same pattern successfully used for QuickBooks OAuth:

### 1. Remove API Key from Frontend Code
- **File**: `src/services/llm/ClaudeAdapter.ts:96`
- **Current**: `"x-api-key": this.config.apiKey,`
- **Target**: Remove this header entirely (proxy will add it)

### 2. Update API Key Configuration
- **File**: `src/services/llm/LLMServiceFactory.ts:63`  
- **Current**: `const claudeApiKey = import.meta.env.VITE_CLAUDE_API_KEY;`
- **Target**: `const claudeApiKey = 'handled-by-proxy';`

### 3. Proxy Server Implementation
- **Location**: Vite dev server proxy configuration (`vite.config.ts`)
- **Production**: External CORS proxy (similar to QBO proxy on Render)
- **Functionality**: Add `x-api-key` header server-side before forwarding to Anthropic API

### 4. Environment Variable Changes
- **Remove**: `VITE_CLAUDE_API_KEY` from `.env` (frontend accessible)
- **Add**: `CLAUDE_API_KEY` to proxy server environment (server-side only)

## Consequences

### Positive
- **Security**: API key never exposed in frontend JavaScript bundle
- **Consistency**: Follows same proven pattern as QuickBooks OAuth proxy
- **Deployment**: Passes Netlify security scans without bypass flags
- **Maintainability**: Single security pattern across all external API integrations

### Negative
- **Complexity**: Requires proxy server configuration changes
- **Dependency**: Frontend becomes dependent on proxy availability
- **Development**: Local development requires proper proxy setup

## Implementation Notes

### Current State (Temporary)
```typescript
// ClaudeAdapter.ts:96 - CURRENT (TEMPORARY)
headers: {
  // TODO: remove SECRETS_SCAN_SMART_DETECTION_ENABLED=false and revert to proxy
  "x-api-key": this.config.apiKey,
  "anthropic-version": this.apiVersion,
  "anthropic-dangerous-direct-browser-access": "true",
  "Content-Type": "application/json",
},

// LLMServiceFactory.ts:63 - CURRENT (TEMPORARY)
// TODO: remove SECRETS_SCAN_SMART_DETECTION_ENABLED=false and revert to proxy handling
const claudeApiKey = import.meta.env.VITE_CLAUDE_API_KEY;
```

### Target State (Secure)
```typescript
// ClaudeAdapter.ts:96 - TARGET
headers: {
  // API key added by proxy server
  "anthropic-version": this.apiVersion,
  "anthropic-dangerous-direct-browser-access": "true",
  "Content-Type": "application/json",
},

// LLMServiceFactory.ts:63 - TARGET  
const claudeApiKey = 'handled-by-proxy'; // Placeholder - actual key added by proxy
```

### Vite Proxy Configuration
```typescript
// vite.config.ts - TARGET
"/proxy-claude": {
  target: "https://api.anthropic.com",
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/proxy-claude/, '/v1'),
  configure: (proxy, options) => {
    proxy.on('proxyReq', (proxyReq, req, res) => {
      // Add API key header server-side
      proxyReq.setHeader('x-api-key', process.env.CLAUDE_API_KEY);
    });
  }
}
```

### Migration Steps
1. **Deploy proxy server** with CLAUDE_API_KEY environment variable
2. **Update frontend code** to remove API key headers and usage
3. **Remove VITE_CLAUDE_API_KEY** from environment variables
4. **Remove SECRETS_SCAN_SMART_DETECTION_ENABLED=false** from Netlify config
5. **Test end-to-end** functionality with proxy

### Validation Checklist
- [ ] API key not present in `dist/` build output
- [ ] Claude API requests work through proxy
- [ ] Netlify deployment passes without security bypass
- [ ] Local development works with Vite proxy
- [ ] Production works with external proxy server

## Notes

This ADR addresses the immediate security vulnerability while establishing a long-term secure architecture. The TODO comments in the code reference this ADR and the specific changes required.