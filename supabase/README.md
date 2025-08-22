# Supabase Local Development Setup

This directory contains the configuration for running Supabase locally.

## Project Information
- **Project ID**: lwdjpwkrvafwrlizcroj
- **Project Name**: adaptive-book-hygience-poc

## Prerequisites
1. Install Docker Desktop (required for local Supabase)
2. Install Supabase CLI: `npm install` (already added to devDependencies)

## Setup Commands

### 1. Link to Remote Project
```bash
npx supabase link --project-ref lwdjpwkrvafwrlizcroj
```

### 2. Pull Remote Schema
```bash
npx supabase db pull
```

### 3. Start Local Supabase
```bash
npx supabase start
```

### 4. Stop Local Supabase
```bash
npx supabase stop
```

### 5. Reset Local Database
```bash
npx supabase db reset
```

## Local Development URLs
After running `supabase start`, you'll have access to:
- **API URL**: http://localhost:54321
- **DB URL**: postgresql://postgres:postgres@localhost:54322/postgres
- **Studio URL**: http://localhost:54323
- **Inbucket URL**: http://localhost:54324 (email testing)

## Migrations
- Migrations are stored in `supabase/migrations/`
- Follow the naming convention: `[timestamp]_[description].sql`
- Example: `20250107000001_create_qbo_tokens_table.sql`

## Environment Variables
The project uses Clerk for authentication, so the Supabase auth is not used.
Make sure your `.env` file includes the necessary Supabase variables for the client:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Notes
- Row Level Security (RLS) is NOT enabled on tables because authentication is handled by Clerk
- Access control should be implemented at the application level using Clerk's user IDs