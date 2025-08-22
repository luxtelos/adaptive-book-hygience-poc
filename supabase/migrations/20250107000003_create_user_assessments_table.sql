-- Migration: Create user_assessments table
-- Description: Table to store user assessment form data
-- Created: 2025-01-07

-- Create the user_assessments table
CREATE TABLE IF NOT EXISTS user_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT NOT NULL,
  business_type TEXT NOT NULL,
  monthly_revenue TEXT,
  current_software TEXT,
  bookkeeping_challenges TEXT,
  urgency_level TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_user_assessments_user_id ON user_assessments(user_id);
CREATE INDEX idx_user_assessments_email ON user_assessments(email);
CREATE INDEX idx_user_assessments_status ON user_assessments(status);
CREATE INDEX idx_user_assessments_created_at ON user_assessments(created_at DESC);

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_user_assessments_updated_at BEFORE UPDATE ON user_assessments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_assessments IS 'Stores user assessment form submissions';
COMMENT ON COLUMN user_assessments.user_id IS 'Clerk user ID';
COMMENT ON COLUMN user_assessments.first_name IS 'Contact first name';
COMMENT ON COLUMN user_assessments.last_name IS 'Contact last name';
COMMENT ON COLUMN user_assessments.email IS 'Contact email';
COMMENT ON COLUMN user_assessments.phone IS 'Contact phone number';
COMMENT ON COLUMN user_assessments.company IS 'Company name';
COMMENT ON COLUMN user_assessments.business_type IS 'Type of business';
COMMENT ON COLUMN user_assessments.monthly_revenue IS 'Monthly revenue range';
COMMENT ON COLUMN user_assessments.current_software IS 'Current bookkeeping software';
COMMENT ON COLUMN user_assessments.bookkeeping_challenges IS 'Current bookkeeping challenges';
COMMENT ON COLUMN user_assessments.urgency_level IS 'Urgency level for assistance';
COMMENT ON COLUMN user_assessments.status IS 'Assessment status (pending, completed, etc.)';