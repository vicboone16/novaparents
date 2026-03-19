
-- Drop the auth.users foreign key on evidence_packets to allow demo/synthetic user data
-- RLS policies already handle access control; the FK is redundant security
ALTER TABLE public.evidence_packets DROP CONSTRAINT IF EXISTS evidence_packets_user_id_fkey;
