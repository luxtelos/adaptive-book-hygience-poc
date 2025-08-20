# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting significant architectural decisions made throughout the project's development.

## What is an ADR?

An Architecture Decision Record captures an important architectural decision made along with its context and consequences. ADRs help future developers understand why certain decisions were made.

## ADR Index

| ADR | Date | Status | Title | Key Decision |
|-----|------|--------|-------|--------------|
| [001](001-initial-tech-stack-selection.md) | 2025-08-01 | ✅ Implemented | Initial Tech Stack Selection | Vite, React 18, TypeScript, Clerk, Tailwind CSS |
| [002](002-supabase-database-integration.md) | 2025-08-05 | ✅ Implemented | Supabase Database Integration | PostgreSQL with REST API for persistence |
| [003](003-quickbooks-oauth-implementation.md) | 2025-08-05 | ✅ Implemented | QuickBooks OAuth Implementation | OAuth 2.0 with proxy-based token management |
| [004](004-n8n-proxy-architecture.md) | 2025-08-09 | ✅ Implemented | N8N Proxy Architecture | Secure proxy for OAuth secrets and API calls |
| [005](005-oauth-security-enhancements.md) | 2025-08-12 | ✅ Implemented | OAuth Security Enhancements | CSRF protection with secure state generation |
| [006](006-oauth-callback-loop-resolution.md) | 2025-08-14 | ✅ Implemented | OAuth Callback Loop Resolution | Remove problematic retry mechanism |
| [007](007-token-refresh-timeout-protection.md) | 2025-08-20 | ✅ Implemented | Token Refresh Timeout | 10-second timeout with automatic cleanup |
| [008](008-qbo-token-storage-atomic-operations.md) | 2025-08-20 | ✅ Implemented | Atomic Token Storage | PostgreSQL RPC functions for race-free operations |
| [009](009-clerk-supabase-rls-integration.md) | Future | 📋 Proposed | Clerk-Supabase RLS Integration | Enable RLS with Clerk JWT validation |

## ADR Template

When creating a new ADR, use this template:

```markdown
# ADR-XXX: [Title]

Date: YYYY-MM-DD  
Status: [Proposed | Implemented | Deprecated]  
Commit: [git commit hash if applicable]

## Context
[What is the issue that we're seeing that is motivating this decision?]

## Decision
[What is the change that we're proposing and/or doing?]

## Consequences

### Positive
[What becomes easier or better?]

### Negative
[What becomes harder or worse?]

## Implementation Notes
[Technical details, code examples, migration steps]
```

## Evolution Timeline

### Phase 1: Foundation (August 1-5, 2025)
- Migrated from CRA to Vite
- Integrated Clerk authentication
- Connected Supabase database
- Initial QuickBooks OAuth implementation

### Phase 2: Security & Stability (August 9-14, 2025)
- Deployed N8N proxy for secure token handling
- Enhanced OAuth with CSRF protection
- Fixed callback infinite loops
- Standardized API endpoints

### Phase 3: Performance & Reliability (August 20, 2025)
- Implemented atomic token operations
- Added timeout protection
- Eliminated race conditions
- Achieved production stability

### Phase 4: Future Enhancements (Planned)
- Clerk-Supabase RLS integration
- Advanced fraud detection
- ML-based pattern recognition
- Industry-specific compliance