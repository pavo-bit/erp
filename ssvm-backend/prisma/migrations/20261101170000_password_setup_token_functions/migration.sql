-- SECURITY DEFINER helper for public password-setup token consumption.
CREATE OR REPLACE FUNCTION auth_find_password_setup_token(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row password_setup_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM password_setup_tokens WHERE "tokenHash" = p_token_hash LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION auth_find_password_setup_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_find_password_setup_token(text) TO ssvm_app, ssvm_app_group;