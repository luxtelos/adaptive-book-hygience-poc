# ADR-007: Token Refresh Timeout Protection

Date: 2025-08-20  
Status: Implemented  
Commit: 2194cf5

## Context

Token refresh operations could hang indefinitely, causing poor user experience. Users with expired tokens experienced long waits without feedback.

## Decision

Implement 10-second timeout protection for token refresh:
- AbortController with 10-second timeout
- Automatic token cleanup on timeout
- Redirect to re-authentication
- Clear user feedback

## Consequences

### Positive
- Predictable timeout behavior
- Automatic recovery from hung requests
- Better user experience
- Clear path to resolution

### Negative
- May timeout on slow connections
- Requires re-authentication on timeout

## Implementation Notes

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(refreshUrl, {
    signal: controller.signal,
    // ... other options
  });
} finally {
  clearTimeout(timeoutId);
}
```

Implemented in commits 2194cf5 and 2369d9a.