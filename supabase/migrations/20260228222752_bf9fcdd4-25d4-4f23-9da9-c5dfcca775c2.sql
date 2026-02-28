
-- ============================================================
-- Academy Module Assignments
-- ============================================================
CREATE TABLE public.academy_module_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  module_version_id uuid REFERENCES public.academy_module_versions(id),
  coach_user_id uuid NOT NULL,
  learner_id uuid,
  agency_id uuid,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'removed')),
  due_date date,
  reminder_cadence text CHECK (reminder_cadence IN ('daily', 'weekly', 'none')),
  note_to_coach text,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_module_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_assignments" ON public.academy_module_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_manage_assignments" ON public.academy_module_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "coach_read_own_assignments" ON public.academy_module_assignments
  FOR SELECT TO authenticated
  USING (coach_user_id = auth.uid());

CREATE POLICY "coach_update_own_assignments" ON public.academy_module_assignments
  FOR UPDATE TO authenticated
  USING (coach_user_id = auth.uid());

-- ============================================================
-- Academy Module Rules
-- ============================================================
CREATE TABLE public.academy_module_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  agency_id uuid,
  coach_user_id uuid,
  learner_id uuid,
  visibility text NOT NULL DEFAULT 'visible' CHECK (visibility IN ('visible', 'hidden')),
  requirement_override text CHECK (requirement_override IN ('default', 'required', 'recommended', 'optional')),
  min_translator_runs integer DEFAULT 0,
  min_lab_games_completed integer DEFAULT 0,
  min_modules_completed integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_module_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_rules" ON public.academy_module_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_manage_rules" ON public.academy_module_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "coach_read_own_rules" ON public.academy_module_rules
  FOR SELECT TO authenticated
  USING (
    coach_user_id = auth.uid()
    OR coach_user_id IS NULL
  );

-- ============================================================
-- Academy Module Progress
-- ============================================================
CREATE TABLE public.academy_module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  module_version_id uuid REFERENCES public.academy_module_versions(id),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  xp_earned integer DEFAULT 0,
  reflection_response text,
  practice_results jsonb DEFAULT '[]'::jsonb,
  screens_viewed text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.academy_module_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_progress" ON public.academy_module_progress
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_read_progress" ON public.academy_module_progress
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "coach_manage_own_progress" ON public.academy_module_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Behavior Lab Games
-- ============================================================
CREATE TABLE public.behavior_lab_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'system' CHECK (scope IN ('system', 'agency')),
  agency_id uuid,
  title text NOT NULL,
  short_description text,
  game_key text UNIQUE,
  stage integer NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 3),
  difficulty text NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  skill_tags text[] DEFAULT '{}',
  est_seconds integer NOT NULL DEFAULT 90,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.behavior_lab_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_games" ON public.behavior_lab_games
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_manage_games" ON public.behavior_lab_games
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'agency_admin')
    AND scope = 'agency'
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'agency_admin')
    AND scope = 'agency'
  );

CREATE POLICY "coach_read_active_games" ON public.behavior_lab_games
  FOR SELECT TO authenticated
  USING (status = 'active');

-- ============================================================
-- Behavior Lab Attempts
-- ============================================================
CREATE TABLE public.behavior_lab_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id uuid NOT NULL REFERENCES public.behavior_lab_games(id) ON DELETE CASCADE,
  score_percent integer NOT NULL DEFAULT 0,
  xp_earned integer NOT NULL DEFAULT 0,
  streak_count integer DEFAULT 0,
  mistakes_summary jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.behavior_lab_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_read_attempts" ON public.behavior_lab_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_admin_read_attempts" ON public.behavior_lab_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "coach_manage_own_attempts" ON public.behavior_lab_attempts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
