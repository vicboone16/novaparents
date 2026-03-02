CREATE TABLE public.agency_invite_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin',
  max_uses integer NOT NULL DEFAULT 1,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_invite_codes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can validate codes
CREATE POLICY "authenticated_read_agency_codes" ON public.agency_invite_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Agency admins can manage codes
CREATE POLICY "agency_admin_manage_agency_codes" ON public.agency_invite_codes
  FOR ALL USING (has_role(auth.uid(), 'agency_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'agency_admin'::app_role));

-- Super admins can manage all codes
CREATE POLICY "super_admin_all_agency_codes" ON public.agency_invite_codes
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));