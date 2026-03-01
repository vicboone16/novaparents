-- 1. invite_codes table
CREATE TABLE IF NOT EXISTS public.invite_codes (
  invite_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  max_uses integer NOT NULL DEFAULT 1,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  permissions jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_by uuid,
  revoked_at timestamp with time zone,
  app_context text DEFAULT 'novatrack_teacher',
  role_slug text DEFAULT 'staff',
  invite_scope text DEFAULT 'student',
  group_id uuid
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_codes" ON public.invite_codes
  FOR ALL USING (has_role(auth.uid(), 'agency_admin'))
  WITH CHECK (has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "super_admin_all_codes" ON public.invite_codes
  FOR ALL USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "authenticated_validate_codes" ON public.invite_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. user_agency_access table
CREATE TABLE IF NOT EXISTS public.user_agency_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  client_id uuid,
  role text NOT NULL DEFAULT 'staff',
  linked_via_invite_id uuid REFERENCES public.invite_codes(invite_id),
  redeemed_at timestamp with time zone DEFAULT now(),
  redeemed_from text DEFAULT 'signup',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, agency_id, client_id)
);

ALTER TABLE public.user_agency_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_access" ON public.user_agency_access
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_access" ON public.user_agency_access
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_read_access" ON public.user_agency_access
  FOR SELECT USING (has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "super_admin_all_access" ON public.user_agency_access
  FOR ALL USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- 3. Atomic redeem function
CREATE OR REPLACE FUNCTION public.redeem_invite_code(
  _code text,
  _redeemed_from text DEFAULT 'signup'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite invite_codes%ROWTYPE;
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _invite
  FROM invite_codes
  WHERE code = upper(trim(_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_not_found');
  END IF;

  IF _invite.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_revoked');
  END IF;

  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_expired');
  END IF;

  IF _invite.uses_count >= _invite.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_maxed');
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_agency_access
    WHERE user_id = _user_id
      AND agency_id = _invite.agency_id
      AND COALESCE(client_id, '00000000-0000-0000-0000-000000000000') =
          COALESCE(_invite.client_id, '00000000-0000-0000-0000-000000000000')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_linked');
  END IF;

  INSERT INTO user_agency_access (user_id, agency_id, client_id, role, linked_via_invite_id, redeemed_from)
  VALUES (_user_id, _invite.agency_id, _invite.client_id, COALESCE(_invite.role_slug, 'staff'), _invite.invite_id, _redeemed_from);

  UPDATE invite_codes
  SET uses_count = uses_count + 1
  WHERE invite_id = _invite.invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'agency_id', _invite.agency_id,
    'client_id', _invite.client_id,
    'role', _invite.role_slug
  );
END;
$$;