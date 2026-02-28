
-- User roles for RBAC
CREATE TYPE public.app_role AS ENUM ('agency_admin', 'coach');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Only the user themselves or agency_admins can read roles
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Agency admins can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin'));

-- Evidence Packets table
CREATE TABLE public.evidence_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','pending_review','approved','needs_followup','rejected')),
  feedback_message text,
  followup_items jsonb DEFAULT '[]'::jsonb,
  lessons_completed jsonb DEFAULT '[]'::jsonb,
  quiz_scores jsonb DEFAULT '[]'::jsonb,
  reflections_submitted integer NOT NULL DEFAULT 0,
  behavior_logs_count integer NOT NULL DEFAULT 0,
  implementation_logs_count integer NOT NULL DEFAULT 0,
  frequency_logs_count integer NOT NULL DEFAULT 0,
  duration_logs_count integer NOT NULL DEFAULT 0,
  total_active_time_sec integer NOT NULL DEFAULT 0,
  pages_visited jsonb DEFAULT '[]'::jsonb,
  integrity_score integer NOT NULL DEFAULT 0,
  billing_eligible boolean NOT NULL DEFAULT false,
  flags_summary jsonb DEFAULT '{"high":0,"med":0,"low":0}'::jsonb
);

ALTER TABLE public.evidence_packets ENABLE ROW LEVEL SECURITY;

-- Coaches can read and insert their own packets
CREATE POLICY "Coaches can read own packets"
  ON public.evidence_packets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Coaches can insert own packets"
  ON public.evidence_packets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Agency admins can read all packets and update status
CREATE POLICY "Agency admins can read all packets"
  ON public.evidence_packets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "Agency admins can update packets"
  ON public.evidence_packets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin'));

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  daily_reminder boolean NOT NULL DEFAULT true,
  reminder_hour integer NOT NULL DEFAULT 18,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification prefs"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
