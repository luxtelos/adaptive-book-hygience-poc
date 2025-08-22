-- Function to delete tokens (permanent removal)
CREATE OR REPLACE FUNCTION public.delete_qbo_tokens(
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
    
    -- Delete tokens
    IF p_realm_id IS NULL THEN
        -- Delete all tokens for the user
        DELETE FROM public.qbo_tokens
        WHERE user_id = p_user_id;
    ELSE
        -- Delete specific realm tokens
        DELETE FROM public.qbo_tokens
        WHERE user_id = p_user_id
          AND realm_id = p_realm_id;
    END IF;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('Deleted %s token(s)', v_count),
        'count', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to anon role (for Clerk integration)
GRANT EXECUTE ON FUNCTION public.delete_qbo_tokens TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.delete_qbo_tokens IS 'Permanently deletes QBO tokens';