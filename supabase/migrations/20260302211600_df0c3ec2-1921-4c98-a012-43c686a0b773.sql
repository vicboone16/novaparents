
-- 1. Create SECURITY DEFINER function for agency invite code redemption
CREATE OR REPLACE FUNCTION public.redeem_agency_invite_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite agency_invite_codes%ROWTYPE;
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _invite
  FROM agency_invite_codes
  WHERE code = upper(trim(_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_not_found');
  END IF;

  IF NOT _invite.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_inactive');
  END IF;

  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_expired');
  END IF;

  IF _invite.uses >= _invite.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_maxed');
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_agency_access
    WHERE user_id = _user_id
      AND agency_id = _invite.agency_id
      AND client_id IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_linked');
  END IF;

  INSERT INTO user_agency_access (user_id, agency_id, role, redeemed_from)
  VALUES (_user_id, _invite.agency_id, COALESCE(_invite.role, 'staff'), 'agency_code');

  UPDATE agency_invite_codes
  SET uses = uses + 1
  WHERE id = _invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'agency_id', _invite.agency_id,
    'role', _invite.role
  );
END;
$$;

-- 2. Drop overly broad SELECT policies on invite code tables
DROP POLICY IF EXISTS "authenticated_validate_codes" ON public.invite_codes;
DROP POLICY IF EXISTS "authenticated_read_agency_codes" ON public.agency_invite_codes;
