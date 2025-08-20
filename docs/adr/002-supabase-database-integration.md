# ADR-002: Supabase Database Integration

Date: 2025-08-05  
Status: Implemented  
Commit: 049aead

## Context

The application needed persistent storage for user data, assessments, and OAuth tokens. We needed a solution that could integrate well with our authentication system and provide real-time capabilities.

## Decision

Adopt Supabase as the primary database solution:
- PostgreSQL database with REST API
- Built-in authentication (though we use Clerk)
- Row Level Security (RLS) capabilities
- Real-time subscriptions support

## Consequences

### Positive
- Managed PostgreSQL removes database administration overhead
- REST API simplifies frontend integration
- Built-in security features enhance data protection
- Scalable solution with generous free tier

### Negative
- RLS doesn't integrate natively with Clerk authentication
- Requires careful token management for security
- Additional complexity in managing two auth systems

## Implementation Notes

Initial integration completed in 049aead. Connected Supabase with code improvements suggested by Copilot. Later refined in 4dc9013 with proper user management tables.