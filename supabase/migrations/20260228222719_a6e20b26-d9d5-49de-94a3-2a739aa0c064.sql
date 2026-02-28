
-- ============================================================
-- Academy Modules
-- ============================================================
CREATE TABLE public.academy_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'system' CHECK (scope IN ('system', 'agency')),
  agency_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  audience text NOT NULL DEFAULT 'coach' CHECK (audience IN ('coach', 'staff', 'mixed')),
  canonical_key text,
  title text NOT NULL,
  short_description text,
  est_minutes integer NOT NULL DEFAULT 5,
  skill_tags text[] DEFAULT '{}',
  suggested_tool text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "super_admin_all_modules" ON public.academy_modules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Agency admins can manage their agency modules
CREATE POLICY "agency_admin_select_modules" ON public.academy_modules
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'agency_admin')
    AND (scope = 'system' OR agency_id IS NOT NULL)
  );

CREATE POLICY "agency_admin_insert_modules" ON public.academy_modules
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'agency_admin')
    AND scope = 'agency'
  );

CREATE POLICY "agency_admin_update_modules" ON public.academy_modules
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'agency_admin')
    AND scope = 'agency'
  );

-- Coaches can read active system + their assigned modules
CREATE POLICY "coach_read_active_modules" ON public.academy_modules
  FOR SELECT TO authenticated
  USING (status = 'active');

-- ============================================================
-- Academy Module Versions
-- ============================================================
CREATE TABLE public.academy_module_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  version_num integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_id, version_num)
);

ALTER TABLE public.academy_module_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_versions" ON public.academy_module_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_manage_versions" ON public.academy_module_versions
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'agency_admin')
    AND EXISTS (
      SELECT 1 FROM public.academy_modules m
      WHERE m.id = module_id AND m.scope = 'agency'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'agency_admin')
    AND EXISTS (
      SELECT 1 FROM public.academy_modules m
      WHERE m.id = module_id AND m.scope = 'agency'
    )
  );

CREATE POLICY "coach_read_published_versions" ON public.academy_module_versions
  FOR SELECT TO authenticated
  USING (status = 'published');

-- ============================================================
-- Academy Paths
-- ============================================================
CREATE TABLE public.academy_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  path_type text NOT NULL DEFAULT 'system_default' CHECK (path_type IN ('system_default', 'agency', 'coach', 'learner')),
  agency_id uuid,
  target_coach_id uuid,
  target_learner_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_paths" ON public.academy_paths
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_manage_paths" ON public.academy_paths
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "coach_read_paths" ON public.academy_paths
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (
      path_type = 'system_default'
      OR target_coach_id = auth.uid()
    )
  );

-- ============================================================
-- Academy Path Modules (join table)
-- ============================================================
CREATE TABLE public.academy_path_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES public.academy_paths(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  requirement text NOT NULL DEFAULT 'recommended' CHECK (requirement IN ('required', 'recommended', 'optional')),
  prereq_module_id uuid REFERENCES public.academy_modules(id),
  unlocks_tool text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_path_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_path_modules" ON public.academy_path_modules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_manage_path_modules" ON public.academy_path_modules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "coach_read_path_modules" ON public.academy_path_modules
  FOR SELECT TO authenticated
  USING (true);
