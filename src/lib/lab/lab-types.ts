/**
 * Behavior Lab™ — Local Types
 * No DB. All types for game configs, attempts, and local state.
 */

export interface LabGameConfig {
  id: string;
  title: string;
  stage: 1 | 2 | 3;
  difficulty: 'easy' | 'easy-med' | 'med' | 'hard';
  difficulty_dots: number;
  skill_tags: string[];
  est_seconds: number;
  goal: string;
  micro_tip: string;
  screens: {
    intro: { headline: string; body: string; cta?: string };
    results: { buttons: string[] };
  };
  /** Actual question / scenario content for the game engine */
  questions: LabQuestion[];
}

export interface LabQuestion {
  /** The scenario or prompt text */
  scenario: string;
  /** The prompt question (if different from scenario) */
  prompt?: string;
  /** Answer options */
  options: string[];
  /** The correct answer (exact string match against options) */
  answer: string;
  /** Explanation shown after answering */
  explain: string;
  /** For primary+secondary games, secondary answer */
  secondary_answer?: string;
  /** For reorder games, the correct order */
  correct_order?: string[];
  /** For drag-match games, the bucket each card belongs to */
  bucket?: string;
  /** For ABC builder: which part this is (A/B/C) */
  part?: 'A' | 'B' | 'C';
}

export interface LabAttemptLocal {
  game_id: string;
  started_at: string;
  completed_at: string;
  score_percent: number;
  xp_earned: number;
  skill_tags: string[];
  difficulty: string;
  mistakes_summary: { question: string; given: string; correct: string }[];
  streak_count: number;
}

export const GROWTH_LEVELS = [
  { level: 1, name: 'Observer', xp: 0, emoji: '👀' },
  { level: 2, name: 'Behavior Detective', xp: 101, emoji: '🔍' },
  { level: 3, name: 'Reinforcement Reader', xp: 251, emoji: '📖' },
  { level: 4, name: 'Pattern Spotter', xp: 501, emoji: '🧩' },
  { level: 5, name: 'Confident Coach', xp: 901, emoji: '🌟' },
] as const;

export const SKILL_PACKS: { id: string; label: string; tags: string[]; stage: 1 | 2 | 3 }[] = [
  { id: 'functions', label: 'Functions', tags: ['functions'], stage: 1 },
  { id: 'reinforcement', label: 'Reinforcement', tags: ['reinforcement', 'consequences'], stage: 1 },
  { id: 'abc', label: 'ABC', tags: ['abc', 'behavior_loop'], stage: 1 },
  { id: 'scripts_coaching', label: 'Scripts & Coaching', tags: ['scripts', 'de_escalation', 'tone', 'coaching', 'coach_regulation', 'antecedents', 'consequences', 'fundamentals', 'habit'], stage: 1 },
  { id: 'replacement', label: 'Replacement Skills', tags: ['replacement_skills', 'reinforcement_planning'], stage: 2 },
  { id: 'data', label: 'Data Skills', tags: ['data', 'measurement', 'intensity'], stage: 2 },
  { id: 'supports', label: 'Supports & Tools', tags: ['supports', 'prompting', 'generalization', 'retention', 'maintenance'], stage: 2 },
];

export function calculateXp(scorePercent: number): number {
  let xp = 10; // base
  if (scorePercent >= 80) xp += 10;
  if (scorePercent === 100) xp += 10;
  return xp;
}

export function getGrowthLevel(totalXp: number) {
  return [...GROWTH_LEVELS].reverse().find(l => totalXp >= l.xp) || GROWTH_LEVELS[0];
}

export function getNextLevel(totalXp: number) {
  return GROWTH_LEVELS.find(l => l.xp > totalXp) || null;
}
