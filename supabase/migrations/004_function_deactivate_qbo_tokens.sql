-- Function to deactivate tokens (for logout or cleanup)
CREATE OR REPLACE FUNCTION public.deactivate_qbo_tokens(
    p_user_id TEXT,
    p_realm_id TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Validate user_id parameter
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User ID is required'
        );
    END IF;
    
    -- Deactivate tokens
    IF p_realm_id IS NULL THEN
        -- Deactivate all tokens for the user
        UPDATE public.qbo_tokens
        SET is_active = false,
            updated_at = NOW()
        WHERE user_id = p_user_id
          AND is_active = true;
    ELSE
        -- Deactivate specific realm tokens
        UPDATE public.qbo_tokens
        SET is_active = false,
            updated_at = NOW()
        WHERE user_id = p_user_id
          AND realm_id = p_realm_id
          AND is_active = true;
    END IF;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('Deactivated %s token(s)', v_count),
        'count', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to anon role (for Clerk integration)
GRANT EXECUTE ON FUNCTION public.deactivate_qbo_tokens TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.deactivate_qbo_tokens IS 'Deactivates tokens without deleting them';