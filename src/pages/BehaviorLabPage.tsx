/**
 * Behavior Lab™ — Local-Only Home Screen
 * Daily Drills · Skill Packs · Challenge Mode · Your Progress
 */

import { useState, useMemo, useEffect } from 'react';
import { Gamepad2, Flame, Play, ArrowRight, CheckCircle2, Lock, Zap, Timer } from 'lucide-react';
import { LAB_GAMES, SKILL_PACKS, GROWTH_LEVELS, DAILY_DRILL_POOL, MASTERY_SKILLS, getGrowthLevel, getNextLevel } from '@/lib/lab';
import {
  getLocalAttempts, getTotalXp, getStreakDays, getBestScore, getSkillMastery,
  getUniqueGamesCompleted, getAvgScore, getStreakDaysWithin, getRecentGameIds,
  getMastery, hasActiveStreak,
} from '@/lib/lab/lab-store';
import type { LabGameConfig, SkillPackDef } from '@/lib/lab/lab-types';
import LabGameEngine from '@/components/lab/LabGameEngine';
import SkillPackDetail from '@/components/lab/SkillPackDetail';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

// ─── Stage 2 Unlock: check Academy Module 1 + Translator runs ───
function useStage2AcademyCheck(): { academyModule1Done: boolean; translatorRuns: number } {
  const [academyModule1Done, setAcademyModule1Done] = useState(false);
  const [translatorRuns, setTranslatorRuns] = useState(0);

  useEffect(() => {
    // Check localStorage for translator run count
    try {
      const runs = parseInt(localStorage.getItem('bd_translator_runs') || '0', 10);
      setTranslatorRuns(runs);
    } catch { /* ignore */ }

    // Check Academy Module 1 completion via Supabase
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find the module with canonical_key = 'foundations_behavior_job'
        const { data: modules } = await supabase
          .from('academy_modules')
          .select('id')
          .eq('canonical_key', 'foundations_behavior_job')
          .limit(1);

        if (!modules || modules.length === 0) return;

        const { data: progress } = await supabase
          .from('academy_module_progress')
          .select('status')
          .eq('user_id', user.id)
          .eq('module_id', modules[0].id)
          .eq('status', 'completed')
          .limit(1);

        if (progress && progress.length > 0) {
          setAcademyModule1Done(true);
        }
      } catch { /* ignore - stage 2 stays locked */ }
    })();
  }, []);

  return { academyModule1Done, translatorRuns };
}

// ─── Stage Gating ───────────────────────
function useUnlockState() {
  const attempts = getLocalAttempts();
  const uniqueGames = getUniqueGamesCompleted();
  const { academyModule1Done, translatorRuns } = useStage2AcademyCheck();

  // Stage 2: Academy Module 1 completed OR (3+ games + 1 translator run)
  const stage2 = academyModule1Done || (uniqueGames >= 3 && translatorRuns >= 1);

  // Stage 3: 5 streak days within 10 days + 15 unique games + avg 70%+ over 8+ attempts
  const streakWithin = getStreakDaysWithin(10);
  const avgScore = getAvgScore(8);
  const stage3 = streakWithin >= 5 && uniqueGames >= 15 && avgScore >= 70;

  return { stage2, stage3, uniqueGames, streakWithin, avgScore, academyModule1Done, translatorRuns };
}

export default function BehaviorLabPage() {
  const [activeGame, setActiveGame] = useState<LabGameConfig | null>(null);
  const [activePack, setActivePack] = useState<SkillPackDef | null>(null);
  const [showUnlockSheet, setShowUnlockSheet] = useState<'stage2' | 'stage3' | null>(null);
  const unlocks = useUnlockState();

  const totalXp = getTotalXp();
  const streak = getStreakDays();
  const attempts = getLocalAttempts();
  const level = getGrowthLevel(totalXp);
  const next = getNextLevel(totalXp);
  const mastery = getMastery();

  // Daily drills: 3 games from the pool, avoiding recent plays, preferring weak skills
  const dailyDrills = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const seed = today.split('-').reduce((s, n) => s + parseInt(n), 0);
    const recentIds = getRecentGameIds(2);
    const pool = DAILY_DRILL_POOL
      .map(id => LAB_GAMES.find(g => g.id === id)!)
      .filter(Boolean)
      .filter(g => !recentIds.includes(g.id));

    const sorted = [...pool].sort((a, b) => {
      const ma = Math.max(...a.skill_tags.map(t => mastery[t] || 0), 0);
      const mb = Math.max(...b.skill_tags.map(t => mastery[t] || 0), 0);
      if (ma !== mb) return ma - mb;
      return hashStr(a.id + today + seed) - hashStr(b.id + today + seed);
    });

    if (sorted.length < 3) {
      const full = DAILY_DRILL_POOL.map(id => LAB_GAMES.find(g => g.id === id)!).filter(Boolean);
      const extra = full.filter(g => !sorted.find(s => s.id === g.id));
      sorted.push(...extra);
    }
    return sorted.slice(0, 3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNext() {
    if (!activeGame) return;
    const available = LAB_GAMES.filter(g =>
      g.stage === 1 || (g.stage === 2 && unlocks.stage2) || (g.stage === 3 && unlocks.stage3)
    );
    const idx = available.findIndex(g => g.id === activeGame.id);
    setActiveGame(available[(idx + 1) % available.length]);
  }

  // ─── Active game ──────────────────────
  if (activeGame) {
    return (
      <LabGameEngine
        game={activeGame}
        onBack={() => {
          setActiveGame(null);
          // If came from a pack, go back to pack view (activePack stays set)
        }}
        onNext={handleNext}
      />
    );
  }

  // ─── Skill Pack Detail ────────────────
  if (activePack) {
    const locked = (activePack.locked_until_stage === 2 && !unlocks.stage2) ||
      (activePack.locked_until_stage === 3 && !unlocks.stage3);
    return (
      <SkillPackDetail
        pack={activePack}
        locked={locked}
        onPlay={(game) => setActiveGame(game)}
        onBack={() => setActivePack(null)}
        onShowUnlock={() => setShowUnlockSheet(activePack.locked_until_stage === 3 ? 'stage3' : 'stage2')}
      />
    );
  }

  // ─── Lab Home ─────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Gamepad2 className="h-6 w-6 text-primary" /> Behavior Lab™
        </h1>
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
            <p className="text-[10px] opacity-80">Games</p>
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

      {/* ─── Daily Drills ─────────────────── */}
      <Section title="Daily Drills" subtitle="3 games picked for you today">
        <div className="space-y-2">
          {dailyDrills.map(game => (
            <GameCard key={game.id} game={game} onPlay={() => setActiveGame(game)} />
          ))}
        </div>
      </Section>

      {/* ─── Skill Packs ─────────────────── */}
      <Section title="Skill Packs" subtitle="Organized by skill area">
        <div className="space-y-2">
          {SKILL_PACKS.map(pack => {
            const locked = (pack.locked_until_stage === 2 && !unlocks.stage2) ||
              (pack.locked_until_stage === 3 && !unlocks.stage3);
            const packGames = pack.game_ids.map(id => LAB_GAMES.find(g => g.id === id)!).filter(Boolean);
            const packMastery = getSkillMastery(packGames.flatMap(g => g.skill_tags));

            return (
              <button
                key={pack.id}
                onClick={() => {
                  if (locked) {
                    setShowUnlockSheet(pack.locked_until_stage === 3 ? 'stage3' : 'stage2');
                  } else {
                    setActivePack(pack);
                  }
                }}
                className={`w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  locked
                    ? 'border-border bg-muted/20 opacity-70'
                    : 'border-border bg-card shadow-card hover:border-primary/30 hover:shadow-soft'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  locked ? 'bg-muted' : 'bg-primary/10'
                }`}>
                  {locked ? (
                    <Lock className="h-4.5 w-4.5 text-muted-foreground" />
                  ) : (
                    <Zap className="h-4.5 w-4.5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{pack.title}</p>
                  <p className="text-[10px] text-muted-foreground">{pack.subtitle} · {packGames.length} games</p>
                  {!locked && packMastery > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${packMastery}%` }} />
                      </div>
                    </div>
                  )}
                  {locked && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">Tap to see how to unlock</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </Section>

      {/* ─── Challenge Mode ──────────────── */}
      <Section title="Challenge Mode" subtitle="Timed fluency practice">
        {unlocks.stage3 ? (
          <GameCard
            game={LAB_GAMES.find(g => g.id === 'micro_scenario_drills_30s')!}
            onPlay={() => setActiveGame(LAB_GAMES.find(g => g.id === 'micro_scenario_drills_30s')!)}
          />
        ) : (
          <button
            onClick={() => setShowUnlockSheet('stage3')}
            className="w-full rounded-xl border border-border bg-muted/20 p-5 text-center transition-all hover:bg-muted/30"
          >
            <Lock className="h-7 w-7 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-foreground">Advanced Coaching Mode</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Unlocks with consistent practice</p>
          </button>
        )}
      </Section>

      {/* ─── Your Progress ───────────────── */}
      <Section title="Your Progress" subtitle="Growth path + skill mastery">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2.5 mb-3">
          {GROWTH_LEVELS.map((gl) => {
            const isCurrent = gl.level === level.level;
            const isReached = totalXp >= gl.xp;
            return (
              <div key={gl.level} className={`flex items-center gap-3 ${isCurrent ? '' : 'opacity-50'}`}>
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

        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
          <p className="text-xs font-semibold text-foreground mb-1">Skill Mastery</p>
          {MASTERY_SKILLS.map(skill => {
            const val = Math.round((mastery[skill.key] || 0) * 100);
            if (val === 0) return null;
            return (
              <div key={skill.key} className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground w-24 truncate">{skill.label}</p>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            );
          })}
          {Object.keys(mastery).length === 0 && (
            <p className="text-[10px] text-muted-foreground">Play games to build skill mastery.</p>
          )}
        </div>
      </Section>

      {/* ─── Unlock Requirements Sheet ───── */}
      <Dialog open={!!showUnlockSheet} onOpenChange={() => setShowUnlockSheet(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {showUnlockSheet === 'stage3' ? 'Advanced Coaching Mode' : 'Skill Building'}
            </DialogTitle>
          </DialogHeader>
          {showUnlockSheet === 'stage2' && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Unlock Skill Building drills by completing <strong>Nova Academy Module 1</strong>, or by completing <strong>3 games + 1 Translator run</strong>.</p>
              <UnlockProgress label="Academy Module 1" current={unlocks.academyModule1Done ? 1 : 0} target={1} />
              <p className="text-[10px] text-center text-muted-foreground">— or —</p>
              <UnlockProgress label="Games completed" current={unlocks.uniqueGames} target={3} />
              <UnlockProgress label="Translator runs" current={unlocks.translatorRuns} target={1} />
            </div>
          )}
          {showUnlockSheet === 'stage3' && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Consistent practice unlocks Advanced Coaching Mode.</p>
              <UnlockProgress label="Unique games" current={unlocks.uniqueGames} target={15} />
              <UnlockProgress label="Active days (last 10)" current={unlocks.streakWithin} target={5} />
              <UnlockProgress label="Avg score (8+ games)" current={unlocks.avgScore} target={70} suffix="%" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ──────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2">
        <h2 className="font-display text-sm font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
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
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Timer className="h-2.5 w-2.5" /> ~{Math.ceil(game.est_seconds / 60)}m
          </span>
          {best !== null && (
            <span className="text-[10px] text-muted-foreground">Best: {best}%</span>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function UnlockProgress({ label, current, target, suffix = '' }: {
  label: string; current: number; target: number; suffix?: string;
}) {
  const pct = Math.min(100, (current / target) * 100);
  const done = current >= target;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className={done ? 'text-success font-semibold' : ''}>
          {current}{suffix} / {target}{suffix} {done && '✓'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
