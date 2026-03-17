
-- Frequency log entries
CREATE TABLE public.frequency_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  learner_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  behavior text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  period text DEFAULT '1 hour',
  setting text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.frequency_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own frequency logs"
  ON public.frequency_logs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agency admins read frequency logs"
  ON public.frequency_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'agency_admin'::app_role));

CREATE POLICY "Super admins all frequency logs"
  ON public.frequency_logs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Duration log entries
CREATE TABLE public.duration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  learner_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  behavior text NOT NULL,
  duration_min numeric NOT NULL DEFAULT 0,
  setting text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.duration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own duration logs"
  ON public.duration_logs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agency admins read duration logs"
  ON public.duration_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'agency_admin'::app_role));

CREATE POLICY "Super admins all duration logs"
  ON public.duration_logs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Indexes
CREATE INDEX idx_frequency_logs_user ON public.frequency_logs(user_id);
CREATE INDEX idx_frequency_logs_learner ON public.frequency_logs(learner_id);
CREATE INDEX idx_duration_logs_user ON public.duration_logs(user_id);
CREATE INDEX idx_duration_logs_learner ON public.duration_logs(learner_id);
