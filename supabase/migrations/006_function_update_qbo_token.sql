-- Function to update tokens (for refresh)
CREATE OR REPLACE FUNCTION public.update_qbo_token(
    p_user_id TEXT,
    p_realm_id TEXT,
    p_access_token TEXT,
    p_refresh_token TEXT DEFAULT NULL,
    p_expires_in INTEGER DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Validate required parameters
    IF p_user_id IS NULL OR p_realm_id IS NULL OR p_access_token IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Missing required parameters'
        );
    END IF;
    
    -- Update token
    UPDATE public.qbo_tokens
    SET access_token = p_access_token,
        refresh_token = COALESCE(p_refresh_token, refresh_token),
        expires_in = COALESCE(p_expires_in, expires_in),
        expires_at = CASE 
            WHEN p_expires_in IS NOT NULL 
            THEN NOW() + (p_expires_in || ' seconds')::INTERVAL
            ELSE expires_at
        END,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND realm_id = p_realm_id
      AND is_active = true
    RETURNING to_json(qbo_tokens.*) INTO v_result;
    
    -- Handle no rows updated
    IF v_result IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No active token found to update'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', v_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to anon role (for Clerk integration)
GRANT EXECUTE ON FUNCTION public.update_qbo_token TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_qbo_token IS 'Updates existing active token (for refresh)';