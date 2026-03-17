
-- Enhance compute_snapshot_scores to cross-reference academy_module_progress
-- This prevents client-side inflation of lesson completion counts

CREATE OR REPLACE FUNCTION public.compute_snapshot_scores()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _lessons_count int;
  _server_completed_count int;
  _completion_score numeric;
  _time_score numeric;
  _interaction_score numeric;
  _logging_score numeric;
  _integrity_score numeric;
  _flag_high int;
  _flag_med int;
  _flag_low int;
  _deduction numeric;
  _total_score int;
  _total_lessons int := 11;
  _min_lesson_time int := 60;
  _billing_threshold int := 60;
BEGIN
  -- 1. Lesson Completion (30%) — count of lessons_completed array
  _lessons_count := COALESCE(jsonb_array_length(COALESCE(NEW.lessons_completed, '[]'::jsonb)), 0);

  -- Cross-reference: cap lesson count to server-verified completions from academy_module_progress
  SELECT COUNT(*) INTO _server_completed_count
  FROM public.academy_module_progress
  WHERE user_id = NEW.user_id
    AND status = 'completed';

  -- Use the LESSER of client-claimed vs server-verified lesson counts
  IF _server_completed_count < _lessons_count THEN
    _lessons_count := _server_completed_count;
    -- Add a high-severity flag for the discrepancy
    NEW.flags_summary := jsonb_set(
      COALESCE(NEW.flags_summary, '{"high":0,"med":0,"low":0}'::jsonb),
      '{high}',
      to_jsonb(COALESCE((NEW.flags_summary->>'high')::int, 0) + 1)
    );
  END IF;

  _completion_score := LEAST(100, (_lessons_count::numeric / _total_lessons) * 100);

  -- 2. Time Investment (20%) — avg time per completed lesson vs 2x minimum
  IF _lessons_count > 0 THEN
    _time_score := LEAST(100, ((NEW.total_active_time_sec::numeric / _lessons_count) / (_min_lesson_time * 2)) * 100);
  ELSE
    _time_score := 0;
  END IF;

  -- 3. Reflections & Interactions (20%)
  DECLARE
    _quiz_count int;
    _interaction_total int;
    _interaction_ratio numeric;
  BEGIN
    _quiz_count := COALESCE(jsonb_array_length(COALESCE(NEW.quiz_scores, '[]'::jsonb)), 0);
    _interaction_total := NEW.reflections_submitted + _quiz_count;
    IF _lessons_count > 0 THEN
      _interaction_ratio := _interaction_total::numeric / _lessons_count;
    ELSE
      _interaction_ratio := 0;
    END IF;
    _interaction_score := LEAST(100, _interaction_ratio * 100);
  END;

  -- 4. Behavior Logging (15%) — 10+ logs = full score
  _logging_score := LEAST(100, ((NEW.behavior_logs_count + NEW.implementation_logs_count)::numeric / 10) * 100);

  -- 5. Integrity (15%) — deductions from flags_summary
  _flag_high := COALESCE((NEW.flags_summary->>'high')::int, 0);
  _flag_med := COALESCE((NEW.flags_summary->>'med')::int, 0);
  _flag_low := COALESCE((NEW.flags_summary->>'low')::int, 0);
  _deduction := (_flag_high * 25) + (_flag_med * 10) + (_flag_low * 3);
  _integrity_score := GREATEST(0, 100 - _deduction);

  -- Weighted total
  _total_score := ROUND(
    _completion_score * 0.30 +
    _time_score * 0.20 +
    _interaction_score * 0.20 +
    _logging_score * 0.15 +
    _integrity_score * 0.15
  );

  -- Override client-submitted values
  NEW.integrity_score := _total_score;
  NEW.billing_eligible := (_total_score >= _billing_threshold);

  RETURN NEW;
END;
$function$;
