# Documentation Structure

## Core Documentation

### Architecture & Specifications
- **[TECHNICAL_SPECIFICATION.md](TECHNICAL_SPECIFICATION.md)** - Complete system technical specification with architecture, API documentation, security model, and implementation guidelines
- **[TECH_STACK_ARCHITECTURE.md](TECH_STACK_ARCHITECTURE.md)** - Technology stack overview and component architecture
- **[qbo-integration-architecture-updated.md](qbo-integration-architecture-updated.md)** - Updated QuickBooks integration architecture

### Architecture Decision Records (ADRs)

Chronological record of architectural decisions:

- **[ADR-001: Initial Tech Stack Selection](adr/001-initial-tech-stack-selection.md)** - ✅ 2025-08-01: Vite, React, TypeScript, Clerk
- **[ADR-002: Supabase Database Integration](adr/002-supabase-database-integration.md)** - ✅ 2025-08-05: PostgreSQL with REST API
- **[ADR-003: QuickBooks OAuth Implementation](adr/003-quickbooks-oauth-implementation.md)** - ✅ 2025-08-05: OAuth 2.0 flow design
- **[ADR-004: N8N Proxy Architecture](adr/004-n8n-proxy-architecture.md)** - ✅ 2025-08-09: Secure token management proxy
- **[ADR-005: OAuth Security Enhancements](adr/005-oauth-security-enhancements.md)** - ✅ 2025-08-12: CSRF protection & state validation
- **[ADR-006: OAuth Callback Loop Resolution](adr/006-oauth-callback-loop-resolution.md)** - ✅ 2025-08-14: Fix infinite recursion
- **[ADR-007: Token Refresh Timeout](adr/007-token-refresh-timeout-protection.md)** - ✅ 2025-08-20: 10-second timeout protection
- **[ADR-008: Atomic Token Storage](adr/008-qbo-token-storage-atomic-operations.md)** - ✅ 2025-08-20: RPC functions for atomicity
- **[ADR-009: Clerk-Supabase RLS](adr/009-clerk-supabase-rls-integration.md)** - 📋 PROPOSED: Future RLS integration

### Implementation Guides
- **[QBO_TOKEN_409_FIX_DEPLOYMENT.md](QBO_TOKEN_409_FIX_DEPLOYMENT.md)** - Deployment guide for atomic token storage solution
- **[N8N_OAUTH_SETUP.md](N8N_OAUTH_SETUP.md)** - N8N proxy OAuth configuration guide
- **[NETLIFY_DEPLOYMENT_GUIDE.md](NETLIFY_DEPLOYMENT_GUIDE.md)** - Frontend deployment on Netlify
- **[SUPABASE_PODMAN_SETUP.md](SUPABASE_PODMAN_SETUP.md)** - Local Supabase development setup

### Data & Integration Specifications
- **[QBO_DATA_MAPPING_SPECIFICATION.md](QBO_DATA_MAPPING_SPECIFICATION.md)** - QuickBooks data structure and mapping
- **[perplexity-llm-integration-architecture.md](perplexity-llm-integration-architecture.md)** - AI/LLM integration architecture

### Development Resources
- **[DESIGN_SYSTEM_UI_COMPONENTS.md](DESIGN_SYSTEM_UI_COMPONENTS.md)** - UI component design system
- **[REUSABLE_COMPONENT_TEMPLATE.md](REUSABLE_COMPONENT_TEMPLATE.md)** - React component templates

## Project Status

### ✅ Completed Features
- QuickBooks OAuth 2.0 integration
- Atomic token storage (no 409 conflicts)
- 5-pillar financial assessment framework
- AI-powered analysis with Perplexity
- Dual report generation (business & technical)
- Rate limiting (450 req/min)
- Automatic token refresh with timeout protection

### 🚧 In Progress
- Performance optimizations
- Enhanced error recovery flows

### 📋 Planned
- Clerk-Supabase RLS integration (see ADR-002)
- Advanced fraud detection
- Industry-specific compliance rules
- ML pattern recognition

## Quick Links

### Development
- **Start Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Deploy**: Push to main branch (auto-deploy via Netlify)

### Configuration
- **Environment Variables**: See TECHNICAL_SPECIFICATION.md
- **Supabase RPC Functions**: See ADR-001 for token management
- **N8N Proxy**: See N8N_OAUTH_SETUP.md

### Troubleshooting
- **409 Conflicts**: Resolved - see QBO_TOKEN_409_FIX_DEPLOYMENT.md
- **OAuth Issues**: Check TECHNICAL_SPECIFICATION.md Critical Issues section
- **Token Refresh**: Automatic with 10-second timeout protection

## Archived Documentation

Obsolete documentation has been moved to the `archived/` folder for historical reference.