# ADR-008: Atomic Token Storage Operations

Date: 2025-08-20  
Status: Implemented  
Commit: f7bfd24

## Context

Token storage operations suffered from race conditions causing 409 Conflict errors. The constraint `idx_qbo_tokens_unique_active` prevented multiple active tokens, but non-atomic delete-then-insert operations created conflicts.

## Decision

Implement atomic database operations using PostgreSQL RPC functions:
- Single transaction for delete-and-insert
- Server-side execution prevents race conditions
- Consistent error handling
- Simplified client code

## Consequences

### Positive
- Eliminates 409 conflict errors
- Guaranteed data consistency
- Improved performance (single round trip)
- Cleaner application code

### Negative
- Requires database function deployment
- Less portable (PostgreSQL-specific)
- RLS limitations with RPC functions

## Implementation Notes

Core RPC function:
```sql
CREATE OR REPLACE FUNCTION store_qbo_token(
  p_user_id text,
  p_clerk_user_id text,
  p_access_token text,
  p_refresh_token text,
  p_realm_id text,
  p_expires_at timestamptz
) RETURNS json AS $$
BEGIN
  -- Atomic delete and insert
  DELETE FROM qbo_tokens WHERE user_id = p_user_id;
  INSERT INTO qbo_tokens (...) VALUES (...);
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

Full implementation with 5 RPC functions completed in f7bfd24.