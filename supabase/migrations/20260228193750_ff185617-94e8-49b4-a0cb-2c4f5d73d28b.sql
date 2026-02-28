
-- Fix app_handshake: drop restrictive policy, add permissive one
DROP POLICY IF EXISTS "Anyone can read handshake" ON public.app_handshake;
CREATE POLICY "Anyone can read handshake"
  ON public.app_handshake
  FOR SELECT
  TO anon, authenticated
  USING (true);
