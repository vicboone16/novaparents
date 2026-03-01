/**
 * Skill Pack Detail View
 * Shows all games in a pack with individual progress. Lets users pick which game to play.
 */

import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Play, Timer, Zap } from 'lucide-react';
import { LAB_GAMES } from '@/lib/lab';
import { getBestScore, getGameAttemptCount, getSkillMastery } from '@/lib/lab/lab-store';
import type { LabGameConfig, SkillPackDef } from '@/lib/lab/lab-types';

interface Props {
  pack: SkillPackDef;
  locked: boolean;
  onPlay: (game: LabGameConfig) => void;
  onBack: () => void;
  onShowUnlock: () => void;
}

export default function SkillPackDetail({ pack, locked, onPlay, onBack, onShowUnlock }: Props) {
  const packGames = pack.game_ids
    .map(id => LAB_GAMES.find(g => g.id === id)!)
    .filter(Boolean);
  const packMastery = getSkillMastery(packGames.flatMap(g => g.skill_tags));

  if (locked) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to Lab
        </button>
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
          <h2 className="font-display text-lg font-bold text-foreground">{pack.title}</h2>
          <p className="text-sm text-muted-foreground">{pack.subtitle}</p>
          <button
            onClick={onShowUnlock}
            className="mt-2 text-xs text-primary font-semibold hover:underline"
          >
            See how to unlock →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary font-semibold">
        <ArrowLeft className="h-4 w-4" /> Back to Lab
      </button>

      {/* Pack header */}
      <div className="rounded-2xl gradient-hero p-5 text-primary-foreground space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold">{pack.title}</h2>
        </div>
        <p className="text-sm text-primary-foreground/80">{pack.subtitle}</p>
        <div className="flex items-center gap-3 text-xs text-primary-foreground/60">
          <span>{packGames.length} games</span>
          {packMastery > 0 && <span>Mastery: {packMastery}%</span>}
        </div>
        {packMastery > 0 && (
          <div className="h-1.5 rounded-full bg-primary-foreground/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-foreground/60 transition-all"
              style={{ width: `${packMastery}%` }}
            />
          </div>
        )}
      </div>

      {/* Game list */}
      <div className="space-y-2">
        {packGames.map(game => {
          const best = getBestScore(game.id);
          const attempts = getGameAttemptCount(game.id);
          return (
            <button
              key={game.id}
              onClick={() => onPlay(game)}
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
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                  {attempts > 0 && (
                    <span className="text-[10px] text-muted-foreground">{attempts} plays</span>
                  )}
                </div>
                {game.skill_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {game.skill_tags.map(tag => (
                      <span key={tag} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
