/**
 * Behavior Lab™ — Local-Only Home Screen
 * Daily Drills · Skill Packs · Challenge Mode · Your Progress
 */

import { useState, useMemo } from 'react';
import { Gamepad2, Flame, Star, Play, ArrowRight, CheckCircle2, Lock, BarChart3 } from 'lucide-react';
import { LAB_GAMES, SKILL_PACKS, GROWTH_LEVELS, getGrowthLevel, getNextLevel } from '@/lib/lab';
import { getLocalAttempts, getTotalXp, getStreakDays, getBestScore, getSkillMastery } from '@/lib/lab/lab-store';
import type { LabGameConfig } from '@/lib/lab/lab-types';
import LabGameEngine from '@/components/lab/LabGameEngine';

// ─── Unlock logic ───────────────────────
function useUnlockState() {
  const attempts = getLocalAttempts();
  const uniqueGames = new Set(attempts.map(a => a.game_id)).size;
  // Stage 2 unlock: 3+ unique games completed
  const stage2 = uniqueGames >= 3;
  // Stage 3 unlock: 10+ unique games + 500+ XP
  const totalXp = getTotalXp();
  const stage3 = uniqueGames >= 10 && totalXp >= 500;
  return { stage2, stage3 };
}

export default function BehaviorLabPage() {
  const [activeGame, setActiveGame] = useState<LabGameConfig | null>(null);
  const unlocks = useUnlockState();

  const totalXp = getTotalXp();
  const streak = getStreakDays();
  const attempts = getLocalAttempts();
  const level = getGrowthLevel(totalXp);
  const next = getNextLevel(totalXp);

  // Daily drills: pick 3 unlocked games pseudo-randomly seeded by date
  const dailyDrills = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const seed = today.split('-').reduce((s, n) => s + parseInt(n), 0);
    const available = LAB_GAMES.filter(g =>
      g.stage === 1 || (g.stage === 2 && unlocks.stage2) || (g.stage === 3 && unlocks.stage3)
    );
    const shuffled = [...available].sort((a, b) => {
      const ha = hashStr(a.id + today + seed) % 1000;
      const hb = hashStr(b.id + today + seed) % 1000;
      return ha - hb;
    });
    return shuffled.slice(0, 3);
  }, [unlocks.stage2, unlocks.stage3]);

  // Next drill after current
  function handleNext() {
    if (!activeGame) return;
    const available = LAB_GAMES.filter(g =>
      g.stage === 1 || (g.stage === 2 && unlocks.stage2) || (g.stage === 3 && unlocks.stage3)
    );
    const idx = available.findIndex(g => g.id === activeGame.id);
    const next = available[(idx + 1) % available.length];
    setActiveGame(next);
  }

  // ─── Active game ──────────────────────
  if (activeGame) {
    return (
      <LabGameEngine
        game={activeGame}
        onBack={() => setActiveGame(null)}
        onNext={handleNext}
      />
    );
  }

  // ─── Lab Home ─────────────────────────
  const stage1Games = LAB_GAMES.filter(g => g.stage === 1);
  const stage2Games = LAB_GAMES.filter(g => g.stage === 2);
  const stage3Games = LAB_GAMES.filter(g => g.stage === 3);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Gamepad2 className="h-6 w-6 text-primary" /> Behavior Lab™
        </h2>
        <p className="text-sm text-muted-foreground">Short drills. Big learning.</p>
      </div>

      {/* Stats bar */}
      <div className="rounded-2xl gradient-hero p-4 text-primary-foreground">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="font-display text-xl font-bold">{totalXp}</p>
            <p className="text-[10px] opacity-80">XP</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold flex items-center justify-center gap-1">
              {streak} <Flame className="h-4 w-4" />
            </p>
            <p className="text-[10px] opacity-80">Streak</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold">{attempts.length}</p>
            <p className="text-[10px] opacity-80">Attempts</p>
          </div>
          <div>
            <p className="text-lg">{level.emoji}</p>
            <p className="text-[10px] opacity-80 font-semibold">{level.name}</p>
          </div>
        </div>
        {next && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] opacity-70">
              <span>Next: {next.emoji} {next.name}</span>
              <span>{totalXp}/{next.xp} XP</span>
            </div>
            <div className="h-1.5 rounded-full bg-primary-foreground/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-foreground/60 transition-all"
                style={{ width: `${Math.min(100, (totalXp / next.xp) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Daily Drills */}
      <Section title="Daily Drills" subtitle="3 quick games for today">
        <div className="space-y-2">
          {dailyDrills.map(game => (
            <GameCard key={game.id} game={game} onPlay={() => setActiveGame(game)} />
          ))}
        </div>
      </Section>

      {/* Skill Packs */}
      <Section title="Skill Packs" subtitle="Organized by skill area">
        <div className="grid grid-cols-2 gap-2">
          {SKILL_PACKS.map(pack => {
            const locked = (pack.stage === 2 && !unlocks.stage2) || (pack.stage === 3 && !unlocks.stage3);
            const mastery = getSkillMastery(pack.tags);
            const packGames = LAB_GAMES.filter(g => g.skill_tags.some(t => pack.tags.includes(t)));
            return (
              <button
                key={pack.id}
                onClick={() => {
                  if (!locked && packGames.length > 0) setActiveGame(packGames[0]);
                }}
                disabled={locked}
                className={`rounded-xl border p-3 text-left transition-all ${
                  locked
                    ? 'border-border bg-muted/30 opacity-60'
                    : 'border-border bg-card shadow-card hover:border-primary/30 hover:shadow-soft'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-foreground">{pack.label}</p>
                  {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <p className="text-[10px] text-muted-foreground">{packGames.length} games</p>
                {!locked && mastery > 0 && (
                  <div className="mt-2">
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${mastery}%` }} />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{mastery}% mastery</p>
                  </div>
                )}
                {locked && (
                  <p className="text-[9px] text-muted-foreground mt-1">Unlock by practice</p>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Stage sections */}
      <Section title="Foundations" subtitle="Stage 1 · Core skills">
        <div className="space-y-2">
          {stage1Games.map(game => (
            <GameCard key={game.id} game={game} onPlay={() => setActiveGame(game)} />
          ))}
        </div>
      </Section>

      <Section title="Skill Building" subtitle={unlocks.stage2 ? 'Stage 2 · Unlocked' : 'Stage 2 · Complete 3 games to unlock'}>
        {unlocks.stage2 ? (
          <div className="space-y-2">
            {stage2Games.map(game => (
              <GameCard key={game.id} game={game} onPlay={() => setActiveGame(game)} />
            ))}
          </div>
        ) : (
          <LockedSection message="Complete 3 different games to unlock Skill Building." />
        )}
      </Section>

      <Section title="Advanced Coaching" subtitle={unlocks.stage3 ? 'Stage 3 · Unlocked' : 'Stage 3 · Consistent practice unlocks this'}>
        {unlocks.stage3 ? (
          <div className="space-y-2">
            {stage3Games.map(game => (
              <GameCard key={game.id} game={game} onPlay={() => setActiveGame(game)} />
            ))}
          </div>
        ) : (
          <LockedSection message="Keep practicing to unlock Advanced Coaching Mode." />
        )}
      </Section>

      {/* Your Progress */}
      <Section title="Your Progress" subtitle="Growth path">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
          {GROWTH_LEVELS.map((gl) => {
            const isCurrent = gl.level === level.level;
            const isReached = totalXp >= gl.xp;
            return (
              <div key={gl.level} className={`flex items-center gap-3 ${isCurrent ? '' : 'opacity-60'}`}>
                <span className="text-lg">{gl.emoji}</span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                    L{gl.level} · {gl.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{gl.xp}+ XP</p>
                </div>
                {isReached && <CheckCircle2 className="h-4 w-4 text-success" />}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ─── Sub-components ──────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function GameCard({ game, onPlay }: { game: LabGameConfig; onPlay: () => void }) {
  const best = getBestScore(game.id);
  return (
    <button
      onClick={onPlay}
      className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-card hover:border-primary/30 hover:shadow-soft transition-all text-left"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        best !== null && best >= 80 ? 'bg-success/10' : 'bg-primary/10'
      }`}>
        {best !== null && best >= 80 ? (
          <CheckCircle2 className="h-5 w-5 text-success" />
        ) : (
          <Play className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{game.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="flex gap-0.5">
            {Array.from({ length: game.difficulty_dots }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-primary/40" />
            ))}
          </span>
          <span className="text-[10px] text-muted-foreground">~{Math.ceil(game.est_seconds / 60)}m</span>
          {best !== null && (
            <span className="text-[10px] text-muted-foreground">Best: {best}%</span>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function LockedSection({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-6 text-center">
      <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

// Simple string hash for daily drill seeding
function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
