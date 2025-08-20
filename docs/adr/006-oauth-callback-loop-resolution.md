# ADR-006: OAuth Callback Infinite Loop Resolution

Date: 2025-08-14  
Status: Implemented  
Commit: 402f04f

## Context

OAuth callback component had a setTimeout retry mechanism that caused infinite recursion when Clerk user wasn't available (e.g., in incognito mode). This led to browser crashes and poor user experience.

## Decision

Remove problematic retry mechanism and implement proper error handling:
- Eliminate setTimeout-based retries
- Add explicit error states
- Provide clear user feedback
- Handle missing Clerk user gracefully

## Consequences

### Positive
- No more infinite loops or browser crashes
- Clear error messages for users
- Predictable callback behavior
- Better incognito mode support

### Negative
- No automatic retry on transient failures
- Users must manually retry on errors

## Implementation Notes

Key changes in OAuthCallBack.tsx:
- Removed `setTimeout(() => handleCallback(), 1000)`
- Added proper error boundaries
- Implemented user-friendly error messages
- Fixed in commit 402f04f