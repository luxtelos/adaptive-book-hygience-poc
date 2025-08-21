-- File: 008_function_store_qbo_token_with_admin.sql
-- Purpose: Replace store_qbo_token to handle admin changes with deletion

DROP FUNCTION IF EXISTS public.store_qbo_token;

CREATE OR REPLACE FUNCTION public.store_qbo_token(
    p_user_id TEXT,
    p_access_token TEXT,
    p_refresh_token TEXT,
    p_realm_id TEXT,
    p_expires_in INTEGER
) RETURNS JSON AS $$
DECLARE
    v_existing RECORD;
    v_result JSON;
    v_admin_changed BOOLEAN := false;
BEGIN
    SELECT * INTO v_existing
    FROM public.qbo_tokens
    WHERE realm_id = p_realm_id AND is_active = true;
    
    IF v_existing.id IS NOT NULL AND v_existing.user_id != p_user_id THEN
        v_admin_changed := true;
        
        INSERT INTO public.qbo_admin_changes (
            realm_id, previous_user_id, new_user_id
        ) VALUES (
            p_realm_id, v_existing.user_id, p_user_id
        );
        
        DELETE FROM public.qbo_tokens
        WHERE realm_id = p_realm_id AND user_id = v_existing.user_id;
    END IF;
    
    DELETE FROM public.qbo_tokens
    WHERE user_id = p_user_id AND realm_id = p_realm_id;
    
    INSERT INTO public.qbo_tokens (
        user_id, access_token, refresh_token, realm_id,
        expires_in, expires_at, is_active
    ) VALUES (
        p_user_id, p_access_token, p_refresh_token, p_realm_id,
        p_expires_in, NOW() + (p_expires_in || ' seconds')::INTERVAL,
        true
    ) RETURNING to_json(qbo_tokens.*) INTO v_result;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', v_result,
        'admin_changed', v_admin_changed,
        'previous_user', CASE WHEN v_admin_changed THEN v_existing.user_id ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.store_qbo_token TO anon;