/**
 * Parent Rewards — Balance, earned/spent, available rewards
 */

import { useEffect, useState } from 'react';
import { useParentChild } from '@/hooks/useParentChild';
import {
  getRewardSummary,
  getAvailableRewards,
  type RewardSummary,
  type BeaconReward,
} from '@/lib/parent-insights-dal';
import { Gift, Star, ShoppingBag } from 'lucide-react';

export default function ParentRewardsPage() {
  const { childId, childName } = useParentChild();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [rewards, setRewards] = useState<BeaconReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) { setLoading(false); return; }
    Promise.all([
      getRewardSummary(childId),
      getAvailableRewards(childId),
    ]).then(([s, r]) => {
      setSummary(s);
      setRewards(r);
      setLoading(false);
    });
  }, [childId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="rounded-2xl bg-muted h-32" />
        <div className="rounded-xl bg-muted h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Balance Hero */}
      <section className="rounded-2xl gradient-hero p-6 text-primary-foreground shadow-soft text-center space-y-2">
        <Gift className="h-8 w-8 mx-auto opacity-90" />
        <h2 className="font-display text-lg font-bold">{childName}'s Rewards</h2>
        {summary ? (
          <>
            <p className="font-display text-4xl font-extrabold">{summary.balance}</p>
            <p className="text-sm opacity-80">points available</p>
            <div className="flex justify-center gap-6 mt-3 text-xs opacity-70">
              <span>Earned: {summary.total_earned}</span>
              <span>Spent: {summary.total_spent}</span>
            </div>
          </>
        ) : (
          <p className="text-sm opacity-80">Rewards data will appear once the team sets it up.</p>
        )}
      </section>

      {/* Available Rewards */}
      {rewards.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Available Rewards
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {rewards.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
                <p className="text-2xl">{r.emoji || '🎁'}</p>
                <p className="text-xs font-semibold text-foreground truncate">{r.title}</p>
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-3 w-3 text-warning" />
                  <span className="text-xs font-bold text-muted-foreground">{r.point_cost}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Encouragement */}
      {!summary && rewards.length === 0 && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-card text-center">
          <p className="text-sm text-muted-foreground">
            Rewards will appear here once {childName}'s team activates the rewards program. 🌟
          </p>
        </section>
      )}
    </div>
  );
}
