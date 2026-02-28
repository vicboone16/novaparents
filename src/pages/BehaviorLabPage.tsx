/**
 * Behavior Lab™ — Coach/Parent View
 * ───────────────────────────────────
 * DB-backed game catalog, play games, track attempts + XP.
 */

import { useState, useEffect } from 'react';
import { Gamepad2, Flame, Star, Play, ArrowLeft, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/dal';
import { getGames, getMyAttempts, saveAttempt, type LabGame, type LabAttempt } from '@/lib/behavior-lab-dal';

const GROWTH_LEVELS = [
  { level: 1, name: 'Observer', xp: 0 },
  { level: 2, name: 'Behavior Detective', xp: 100 },
  { level: 3, name: 'Reinforcement Reader', xp: 250 },
  { level: 4, name: 'Pattern Spotter', xp: 500 },
  { level: 5, name: 'Confident Coach', xp: 1000 },
];

export default function BehaviorLabPage() {
  const [userId, setUserId] = useState('');
  const [games, setGames] = useState<LabGame[]>([]);
  const [attempts, setAttempts] = useState<LabAttempt[]>([]);
  const [activeGame, setActiveGame] = useState<LabGame | null>(null);
  const [gameState, setGameState] = useState<'intro' | 'play' | 'results'>('intro');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState(0);

  useEffect(() => {
    getCurrentUser().then(u => {
      if (u) {
        setUserId(u.id);
        getMyAttempts(u.id).then(setAttempts);
      }
    });
    getGames({ status: 'active' }).then(setGames);
  }, []);

  const totalXp = attempts.reduce((sum, a) => sum + a.xp_earned, 0);
  const currentLevel = [...GROWTH_LEVELS].reverse().find(l => totalXp >= l.xp) || GROWTH_LEVELS[0];

  // Simple streak: count unique days with attempts
  const todayStr = new Date().toISOString().slice(0, 10);
  const uniqueDays = new Set(attempts.map(a => a.created_at.slice(0, 10)));
  const hasToday = uniqueDays.has(todayStr);

  const questions: any[] = activeGame?.content?.questions || [];

  function startGame(game: LabGame) {
    setActiveGame(game);
    setGameState('intro');
    setAnswers({});
    setScore(0);
  }

  function handleAnswer(qIdx: number, aIdx: number) {
    setAnswers(prev => ({ ...prev, [qIdx]: aIdx }));
  }

  async function handleSubmit() {
    if (!activeGame || !userId) return;
    let correct = 0;
    questions.forEach((q: any, i: number) => {
      if (answers[i] === q.correctIndex) correct++;
    });
    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 100;
    const baseXp = activeGame.difficulty === 'easy' ? 10 : activeGame.difficulty === 'medium' ? 15 : 20;
    const xp = pct === 100 ? baseXp + 5 : baseXp;
    setScore(pct);

    const attempt = await saveAttempt({
      user_id: userId,
      game_id: activeGame.id,
      score_percent: pct,
      xp_earned: xp,
      completed_at: new Date().toISOString(),
    });
    if (attempt) setAttempts(prev => [attempt, ...prev]);
    setGameState('results');
  }

  // ─── Active game view ─────────────────────────────
  if (activeGame) {
    if (gameState === 'intro') {
      return (
        <div className="space-y-4 animate-fade-in">
          <button onClick={() => setActiveGame(null)} className="flex items-center gap-1 text-sm text-primary font-semibold">
            <ArrowLeft className="h-4 w-4" /> Back to Lab
          </button>
          <div className="rounded-2xl gradient-hero p-6 text-primary-foreground text-center space-y-3">
            <Gamepad2 className="h-10 w-10 mx-auto opacity-80" />
            <h3 className="font-display text-xl font-bold">{activeGame.title}</h3>
            <p className="text-sm text-primary-foreground/80">{activeGame.short_description}</p>
            <div className="flex items-center justify-center gap-3 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-bold ${
                activeGame.difficulty === 'easy' ? 'bg-primary-foreground/20' :
                activeGame.difficulty === 'medium' ? 'bg-primary-foreground/30' :
                'bg-primary-foreground/40'
              }`}>{activeGame.difficulty}</span>
              <span>~{activeGame.est_seconds}s</span>
            </div>
            {activeGame.skill_tags?.length > 0 && (
              <p className="text-[10px] text-primary-foreground/70">Skills: {activeGame.skill_tags.join(', ')}</p>
            )}
          </div>
          <Button onClick={() => setGameState('play')} className="w-full gap-1.5" disabled={questions.length === 0}>
            <Play className="h-4 w-4" /> {questions.length > 0 ? 'Start' : 'No questions available'}
          </Button>
        </div>
      );
    }

    if (gameState === 'play') {
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <button onClick={() => setActiveGame(null)} className="text-sm text-primary font-semibold flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Exit
            </button>
            <p className="text-xs text-muted-foreground">{Object.keys(answers).length}/{questions.length} answered</p>
          </div>

          {questions.map((q: any, qi: number) => (
            <div key={qi} className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
              <p className="text-sm font-semibold text-foreground">{qi + 1}. {q.question}</p>
              <div className="space-y-2">
                {(q.answers || []).map((a: string, ai: number) => (
                  <button
                    key={ai}
                    onClick={() => handleAnswer(qi, ai)}
                    className={`w-full text-left rounded-lg border p-3 text-sm transition-all ${
                      answers[qi] === ai
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <Button onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length} className="w-full gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Submit Answers
          </Button>
        </div>
      );
    }

    // Results
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="rounded-2xl border border-primary/20 bg-card p-6 text-center space-y-3">
          <CheckCircle2 className={`h-12 w-12 mx-auto ${score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-destructive'}`} />
          <h3 className="font-display text-2xl font-bold text-foreground">{score}%</h3>
          <p className="text-sm text-muted-foreground">
            You practiced: {activeGame.skill_tags?.join(', ')}
          </p>
          <p className="text-xs text-muted-foreground">
            You're building: {currentLevel.name}
          </p>
          {score >= 80 && (
            <p className="text-xs text-success font-semibold">Great work! 🌟</p>
          )}

          {/* Show rationales */}
          {questions.map((q: any, qi: number) => {
            const correct = answers[qi] === q.correctIndex;
            return (
              <div key={qi} className={`rounded-lg p-3 text-left text-xs ${correct ? 'bg-success/5' : 'bg-destructive/5'}`}>
                <p className="font-semibold text-foreground">{qi + 1}. {q.question}</p>
                {!correct && <p className="text-destructive mt-1">Not quite — {q.rationale || 'here\'s the pattern.'}</p>}
                {correct && <p className="text-success mt-1">✓ Correct</p>}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => startGame(activeGame)} className="flex-1 gap-1">
            <RotateCcw className="h-3.5 w-3.5" /> Try Again
          </Button>
          <Button onClick={() => setActiveGame(null)} className="flex-1 gap-1">
            <ArrowRight className="h-3.5 w-3.5" /> Back to Lab
          </Button>
        </div>
      </div>
    );
  }

  // ─── Lab home ──────────────────────────────────────
  const stage1 = games.filter(g => g.stage === 1);
  const stage2 = games.filter(g => g.stage === 2);
  const stage3 = games.filter(g => g.stage === 3);

  return (
    <div className="space-y-5 animate-fade-in">
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
              {uniqueDays.size} <Flame className="h-4 w-4" />
            </p>
            <p className="text-[10px] opacity-80">Days Active</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold">{attempts.length}</p>
            <p className="text-[10px] opacity-80">Attempts</p>
          </div>
          <div>
            <p className="font-display text-sm font-bold">L{currentLevel.level}</p>
            <p className="text-[10px] opacity-80">{currentLevel.name}</p>
          </div>
        </div>
      </div>

      {games.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Gamepad2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No games available yet. Games will appear here once created by your support team.</p>
        </div>
      )}

      {/* Stage sections */}
      {[
        { label: 'Foundations', games: stage1, stage: 1 },
        { label: 'Skill Building', games: stage2, stage: 2 },
        { label: 'Advanced Coaching Mode', games: stage3, stage: 3 },
      ].filter(s => s.games.length > 0).map(section => (
        <div key={section.stage}>
          <h3 className="font-display text-sm font-bold text-foreground mb-2">{section.label}</h3>
          <div className="space-y-2">
            {section.games.map(game => {
              const gameAttempts = attempts.filter(a => a.game_id === game.id);
              const best = gameAttempts.length > 0 ? Math.max(...gameAttempts.map(a => a.score_percent)) : null;

              return (
                <button
                  key={game.id}
                  onClick={() => startGame(game)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary/30 hover:shadow-soft transition-all text-left"
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
                    <p className="text-[10px] text-muted-foreground truncate">{game.short_description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        game.difficulty === 'easy' ? 'bg-success/10 text-success' :
                        game.difficulty === 'medium' ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      }`}>{game.difficulty}</span>
                      <span className="text-[10px] text-muted-foreground">{game.est_seconds}s</span>
                      {best !== null && (
                        <span className="text-[10px] text-muted-foreground">Best: {best}%</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
