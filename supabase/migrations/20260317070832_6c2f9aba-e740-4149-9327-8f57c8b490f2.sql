
-- ABC log entries
CREATE TABLE public.abc_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  learner_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time text,
  behavior text NOT NULL,
  antecedent text,
  consequence text,
  intensity integer NOT NULL DEFAULT 3,
  setting text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.abc_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own abc logs"
  ON public.abc_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agency admins read abc logs"
  ON public.abc_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'agency_admin'::app_role));

CREATE POLICY "Super admins all abc logs"
  ON public.abc_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_abc_logs_user ON public.abc_logs(user_id);
CREATE INDEX idx_abc_logs_learner ON public.abc_logs(learner_id);

-- Implementation log entries
CREATE TABLE public.implementation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  learner_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  strategy text NOT NULL,
  context text,
  outcome text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.implementation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own implementation logs"
  ON public.implementation_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agency admins read implementation logs"
  ON public.implementation_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'agency_admin'::app_role));

CREATE POLICY "Super admins all implementation logs"
  ON public.implementation_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_implementation_logs_user ON public.implementation_logs(user_id);
CREATE INDEX idx_implementation_logs_learner ON public.implementation_logs(learner_id);
