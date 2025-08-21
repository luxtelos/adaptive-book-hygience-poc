# ADR-010: QuickBooks Single Admin Enforcement

## Date
2024-01-22

## Status
Accepted

## Context
QuickBooks OAuth allows only one admin per company for an OAuth app. When a new user becomes admin via "Assign new admin" during OAuth flow, the previous admin's tokens are automatically revoked by QuickBooks. Our application wasn't handling this scenario properly, leading to:
- Multiple users having tokens for the same company in our database
- `invalid_grant` errors when the previous admin tried to refresh their tokens
- 401 authentication errors when making API calls with revoked tokens

## Decision
Implement strict single-admin enforcement at the database level:
1. Add unique constraint on `realm_id` for active tokens
2. When a new admin connects, atomically delete all previous tokens for that company
3. Track admin changes in an audit log table
4. Handle token absence gracefully in the application

## Implementation Details

### Database Changes
- Added unique index `idx_qbo_tokens_unique_company` on `realm_id` where `is_active = true`
- Created `qbo_admin_changes` table to audit admin transitions
- Modified `store_qbo_token` RPC function to:
  - Check for existing admin
  - Delete previous admin's tokens if different user
  - Delete current user's old tokens (clean slate)
  - Insert new token atomically

### Application Changes
- Token service logs admin changes when detected
- No tokens found = user must re-authenticate (no `invalid_grant` errors)
- Clean error messages guide users to reconnect

## Consequences

### Positive
- Database enforces QuickBooks' single-admin limitation
- No orphaned tokens accumulating
- Clear audit trail of admin changes
- Cleaner error handling (no tokens vs invalid tokens)

### Negative
- Previous admin loses access immediately when new admin connects
- No notification system for displaced admin (future enhancement)

### Neutral
- Tokens are completely deleted rather than deactivated
- Each OAuth results in exactly one active token per company

## Alternatives Considered
1. **Keep inactive tokens**: Would accumulate orphaned data
2. **Try to refresh before deleting**: Would fail with `invalid_grant` anyway
3. **Multiple admins via app logic**: QuickBooks API doesn't support this

## References
- QuickBooks OAuth Documentation: Single admin per app limitation
- ADR-008: QBO Token Storage Atomic Operations