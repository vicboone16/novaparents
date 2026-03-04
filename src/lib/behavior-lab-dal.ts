/**
 * Behavior Lab DAL — CRUD for games + attempts
 * All operations routed through novatrack-proxy to Nova Core.
 */

import { proxyQuery } from '@/lib/dal';

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
  try {
    const eq_filters: Array<{ col: string; val: unknown }> = [];
    if (filters?.status) eq_filters.push({ col: 'status', val: filters.status });
    if (filters?.scope) eq_filters.push({ col: 'scope', val: filters.scope });

    const data = await proxyQuery({
      table: 'behavior_lab_games',
      operation: 'select',
      eq_filters,
      order: [{ col: 'stage', ascending: true }, { col: 'title', ascending: true }],
    });
    return data || [];
  } catch (err) { console.error('[Lab DAL] getGames:', err); return []; }
}

export async function createGame(g: Partial<LabGame>): Promise<LabGame | null> {
  try {
    const data = await proxyQuery({
      table: 'behavior_lab_games',
      operation: 'insert',
      data: g as Record<string, unknown>,
      single: true,
    });
    return data;
  } catch (err) { console.error('[Lab DAL] createGame:', err); return null; }
}

export async function updateGame(id: string, updates: Partial<LabGame>): Promise<LabGame | null> {
  try {
    const data = await proxyQuery({
      table: 'behavior_lab_games',
      operation: 'update',
      eq_filters: [{ col: 'id', val: id }],
      data: { ...updates, updated_at: new Date().toISOString() },
    });
    return data?.[0] || null;
  } catch (err) { console.error('[Lab DAL] updateGame:', err); return null; }
}

// ─── Attempts ────────────────────────────────────────────

export async function getMyAttempts(userId: string): Promise<LabAttempt[]> {
  try {
    const data = await proxyQuery({
      table: 'behavior_lab_attempts',
      operation: 'select',
      eq_filters: [{ col: 'user_id', val: userId }],
      order: [{ col: 'created_at', ascending: false }],
    });
    return data || [];
  } catch (err) { console.error('[Lab DAL] getMyAttempts:', err); return []; }
}

export async function saveAttempt(a: Partial<LabAttempt>): Promise<LabAttempt | null> {
  try {
    const data = await proxyQuery({
      table: 'behavior_lab_attempts',
      operation: 'insert',
      data: a as Record<string, unknown>,
      single: true,
    });
    return data;
  } catch (err) { console.error('[Lab DAL] saveAttempt:', err); return null; }
}
