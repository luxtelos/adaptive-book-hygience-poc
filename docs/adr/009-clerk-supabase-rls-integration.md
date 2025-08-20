# ADR-009: Future Clerk-Supabase RLS Integration

Date: 2025-08-20  
Status: Proposed  
Original: ADR-002

## Context

Currently using Clerk for authentication and Supabase for database, but Row Level Security (RLS) cannot validate Clerk JWTs. This requires disabling RLS on critical tables, creating a security gap.

## Decision

Future integration path when Supabase supports custom JWT validation:
- Enable RLS on all tables
- Validate Clerk JWTs at database level
- Remove need for application-level security
- Implement proper multi-tenancy

## Consequences

### Positive
- Database-level security enforcement
- Reduced application complexity
- Better multi-tenant isolation
- Compliance with security best practices

### Negative
- Requires Supabase feature development
- Migration complexity
- Testing overhead

## Implementation Notes

Waiting for Supabase support for:
1. Custom JWT validation hooks
2. External auth provider integration
3. Dynamic RLS policies with custom claims

Current workaround uses RPC functions with manual user validation.