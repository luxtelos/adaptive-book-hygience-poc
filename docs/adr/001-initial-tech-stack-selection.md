# ADR-001: Initial Technology Stack Selection

Date: 2025-08-01  
Status: Implemented  
Commit: a26f0b7

## Context

The project needed a modern web application stack for building a financial assessment tool that integrates with QuickBooks Online. Initial requirements included user authentication, API integrations, and a reactive frontend.

## Decision

We selected the following technology stack:
- **Build Tool**: Migrate from Create React App to Vite for faster development and better performance
- **Authentication**: Clerk for user authentication management
- **Frontend Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS for utility-first styling

## Consequences

### Positive
- Vite provides significantly faster HMR and build times
- Clerk simplifies authentication with pre-built components
- TypeScript ensures type safety across the application
- Tailwind enables rapid UI development

### Negative
- Team needs to learn Vite configuration
- Clerk adds external dependency for critical auth flow

## Implementation Notes

The migration from CRA to Vite was completed in commit a26f0b7, with configuration refined in 712e8ee.