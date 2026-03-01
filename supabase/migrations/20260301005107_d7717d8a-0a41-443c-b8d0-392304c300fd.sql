
-- Streak tracking table
CREATE TABLE public.user_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Users can read and manage their own streak
CREATE POLICY "users_manage_own_streak" ON public.user_streaks
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Agency admins can view streaks
CREATE POLICY "agency_admin_read_streaks" ON public.user_streaks
  FOR SELECT USING (has_role(auth.uid(), 'agency_admin'::app_role));

-- Super admins full access
CREATE POLICY "super_admin_all_streaks" ON public.user_streaks
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
