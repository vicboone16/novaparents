-- Bind the compute_snapshot_scores trigger to evidence_packets table
-- This ensures billing scores are recomputed server-side on every insert/update
CREATE TRIGGER compute_snapshot_scores_trigger
  BEFORE INSERT OR UPDATE ON public.evidence_packets
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_snapshot_scores();