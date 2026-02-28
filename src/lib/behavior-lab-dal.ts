/**
 * Behavior Lab DAL — CRUD for games + attempts
 */

import { supabase } from '@/integrations/supabase/client';

export interface LabGame {
  id: string;
  scope: 'system' | 'agency';
  agency_id: string | null;
  title: string;
  short_description: string | null;
  game_key: string | null;
  stage: number;
  difficulty: 'easy' | 'medium' | 'hard';
  skill_tags: string[];
  est_seconds: number;
  status: 'active' | 'archived';
  content: any;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabAttempt {
  id: string;
  user_id: string;
  game_id: string;
  score_percent: number;
  xp_earned: number;
  streak_count: number;
  mistakes_summary: any[];
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// ─── Games ───────────────────────────────────────────────

export async function getGames(filters?: { status?: string; scope?: string }): Promise<LabGame[]> {
  let query = (supabase as any).from('behavior_lab_games').select('*').order('stage').order('title');
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.scope) query = query.eq('scope', filters.scope);
  const { data, error } = await query;
  if (error) { console.error('[Lab DAL] getGames:', error); return []; }
  return data || [];
}

export async function createGame(g: Partial<LabGame>): Promise<LabGame | null> {
  const { data, error } = await (supabase as any).from('behavior_lab_games').insert(g).select().single();
  if (error) { console.error('[Lab DAL] createGame:', error); return null; }
  return data;
}

export async function updateGame(id: string, updates: Partial<LabGame>): Promise<LabGame | null> {
  const { data, error } = await (supabase as any).from('behavior_lab_games').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) { console.error('[Lab DAL] updateGame:', error); return null; }
  return data;
}

// ─── Attempts ────────────────────────────────────────────

export async function getMyAttempts(userId: string): Promise<LabAttempt[]> {
  const { data, error } = await (supabase as any).from('behavior_lab_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.error('[Lab DAL] getMyAttempts:', error); return []; }
  return data || [];
}

export async function saveAttempt(a: Partial<LabAttempt>): Promise<LabAttempt | null> {
  const { data, error } = await (supabase as any).from('behavior_lab_attempts').insert(a).select().single();
  if (error) { console.error('[Lab DAL] saveAttempt:', error); return null; }
  return data;
}
