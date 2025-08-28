-- Function to atomically store QBO token (delete existing, insert new)
CREATE OR REPLACE FUNCTION public.store_qbo_token(
    p_user_id TEXT,
    p_access_token TEXT,
    p_refresh_token TEXT,
    p_realm_id TEXT,
    p_expires_in INTEGER
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Validate required parameters
    IF p_user_id IS NULL OR p_access_token IS NULL OR p_realm_id IS NULL THEN
        RAISE EXCEPTION 'Missing required parameters';
    END IF;
    
    -- Delete existing tokens for this user/realm
    DELETE FROM public.qbo_tokens
    WHERE user_id = p_user_id 
      AND realm_id = p_realm_id;
    
    -- Insert new token
    INSERT INTO public.qbo_tokens (
        user_id, 
        access_token, 
        refresh_token, 
        realm_id,
        expires_in, 
        expires_at, 
        is_active, 
        token_type,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id, 
        p_access_token, 
        p_refresh_token, 
        p_realm_id,
        p_expires_in, 
        NOW() + (p_expires_in || ' seconds')::INTERVAL, 
        true, 
        'Bearer',
        NOW(),
        NOW()
    )
    RETURNING to_json(qbo_tokens.*) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to anon role (for Clerk integration)
GRANT EXECUTE ON FUNCTION public.store_qbo_token TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.store_qbo_token IS 'Atomically stores QBO token (deletes existing, inserts new)';