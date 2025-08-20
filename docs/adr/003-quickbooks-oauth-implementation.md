# ADR-003: QuickBooks OAuth 2.0 Implementation

Date: 2025-08-05  
Status: Implemented  
Commit: 7ce4e61

## Context

Integration with QuickBooks Online required implementing OAuth 2.0 for secure API access. This involved handling authorization flow, token management, and refresh mechanisms.

## Decision

Implement QuickBooks OAuth 2.0 with:
- Client-side authorization flow initiation
- Server-side token exchange via N8N proxy
- Token storage in Supabase
- Automatic refresh mechanism

## Consequences

### Positive
- Secure access to QuickBooks financial data
- Tokens never exposed to frontend
- Automatic refresh ensures continuous access

### Negative
- Complex multi-step authentication flow
- Dependency on N8N proxy for security
- Token management complexity

## Implementation Notes

- Initial implementation in 7ce4e61
- Fixed integration issues in ee2e7c7
- Security improvements added in 39013ab (CSRF protection, state validation)
- Callback loop fixed in 402f04f