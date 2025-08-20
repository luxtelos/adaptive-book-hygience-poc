# ADR-004: N8N Proxy for OAuth Security

Date: 2025-08-09  
Status: Implemented  
Commit: 4e9e4ff

## Context

QuickBooks OAuth requires client secrets which cannot be safely stored in frontend applications. We needed a secure proxy solution to handle OAuth token exchange and API calls.

## Decision

Deploy N8N workflow automation platform as a proxy:
- Handles OAuth token exchange with client secret
- Proxies API calls to QuickBooks
- Manages token refresh operations
- Provides webhook endpoints for data processing

## Consequences

### Positive
- Client secrets never exposed to frontend
- Centralized token management
- Visual workflow debugging
- Built-in error handling and retries

### Negative
- Additional infrastructure dependency
- Network latency from proxy layer
- N8N-specific configuration complexity

## Implementation Notes

- Initial end-to-end workflow in 4e9e4ff
- Enhanced webhook data ingestion in 65f88f9
- JSON endpoint format standardized in 402f04f