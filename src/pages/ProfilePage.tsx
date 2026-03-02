import { useState, useEffect } from 'react';
import { getCurrentUser, signOut, checkHandshake, getMaskedBackendUrl, getMyClients, type ClientSummary } from '@/lib/dal';
import { User, Bell, Wrench, LogOut, CheckCircle2, XCircle, Star, Pencil, Ticket, Link2, Copy, Building2 } from 'lucide-react';
import { getMyTrainingProgress, type TrainingProgress } from '@/lib/parent-training-dal';
import { getMyAttempts } from '@/lib/behavior-lab-dal';
import { getDisplayName, updateDisplayName } from '@/lib/profile-dal';
import { getMyAgencyAccess, type AgencyAccess } from '@/lib/invite-dal';
import { RedeemCodeForm } from '@/components/RedeemCodeForm';
import { RedeemAgencyInviteCode } from '@/components/agency/RedeemAgencyInviteCode';
import { IndependentLearnerForm } from '@/components/IndependentLearnerForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [notifications, setNotifications] = useState(() => localStorage.getItem('bd_notifications') !== 'false');
  const [diagnostics, setDiagnostics] = useState<{
    appSlug: string | null; supabaseUrl: string; lastPing: string | null;
  }>({ appSlug: null, supabaseUrl: '', lastPing: null });
  const [showDiag, setShowDiag] = useState(false);
  const [copied, setCopied] = useState(false);
  const [agencyAccess, setAgencyAccess] = useState<AgencyAccess[]>([]);
  const [showRedeem, setShowRedeem] = useState(false);
  const [showAgencyRedeem, setShowAgencyRedeem] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const GROWTH_LEVELS = [
    { level: 1, name: 'Observer', xp: 0, emoji: '👀' },
    { level: 2, name: 'Behavior Detective', xp: 100, emoji: '🔍' },
    { level: 3, name: 'Reinforcement Reader', xp: 250, emoji: '📖' },
    { level: 4, name: 'Pattern Spotter', xp: 500, emoji: '🧩' },
    { level: 5, name: 'Confident Coach', xp: 1000, emoji: '🌟' },
  ];

  const currentLevel = [...GROWTH_LEVELS].reverse().find(l => totalXp >= l.xp) || GROWTH_LEVELS[0];
  const nextLevel = GROWTH_LEVELS.find(l => l.xp > totalXp);
  const levelProgress = nextLevel ? (totalXp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp) : 1;

  // Activate push notification reminders
  const { requestPermission } = useNotifications(notifications);

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      setUser(u);
      if (u) {
        Promise.all([getMyTrainingProgress(u.id), getMyAttempts(u.id)]).then(([prog, attempts]) => {
          const academyXp = prog.reduce((s, p) => s + (p.xp_earned || 0), 0);
          const labXp = attempts.reduce((s, a) => s + (a.xp_earned || 0), 0);
          setTotalXp(academyXp + labXp);
        });
        const name = await getDisplayName(u.id);
        if (name) setDisplayName(name);
      }
    });
    getMyClients().then(setClients);
    getMyAgencyAccess().then(setAgencyAccess);
  }, []);

  useEffect(() => {
    async function ping() {
      try {
        const { appSlug } = await checkHandshake();
        setDiagnostics({ appSlug, supabaseUrl: getMaskedBackendUrl(), lastPing: new Date().toLocaleString() });
      } catch {
        setDiagnostics(prev => ({ ...prev, lastPing: 'Failed' }));
      }
    }
    ping();
  }, []);

  async function toggleNotifications(val: boolean) {
    if (val) {
      await requestPermission();
    }
    setNotifications(val);
    localStorage.setItem('bd_notifications', String(val));
  }

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  async function handleSaveName() {
    if (!user || !nameInput.trim()) return;
    setSavingName(true);
    try {
      await updateDisplayName(user.id, nameInput);
      setDisplayName(nameInput.trim());
      setEditingName(false);
      toast({ title: 'Name updated', description: 'Your display name has been saved.' });
    } catch {
      toast({ title: 'Error', description: 'Could not save name. Try again.', variant: 'destructive' });
    }
    setSavingName(false);
  }

  const inviteCode = user?.id ? user.id.slice(0, 8).toUpperCase() : '...';

  function copyInvite() {
    navigator.clipboard.writeText(`Join my Coach training: ${window.location.origin}/invite?code=${inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-bold text-foreground">Profile</h2>

      {/* User Info */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-foreground truncate">
              {displayName || user?.email || 'Loading…'}
            </p>
            {displayName && <p className="text-xs text-muted-foreground truncate">{user?.email}</p>}
            <p className="text-sm text-muted-foreground">Coach Account</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setNameInput(displayName); setEditingName(true); }}
            className="shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {editingName && (
          <div className="flex gap-2 animate-fade-in">
            <Input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Your display name"
              maxLength={100}
              className="flex-1"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            />
            <Button size="sm" onClick={handleSaveName} disabled={savingName || !nameInput.trim()}>
              {savingName ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>Cancel</Button>
          </div>
        )}
      </div>

      {/* Growth Path */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          <h3 className="font-display font-bold text-foreground text-sm">Your Growth Path</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5"
                strokeDasharray={`${Math.min(levelProgress, 1) * 94.2} 94.2`}
                strokeLinecap="round" />
            </svg>
            <span className="text-lg">{currentLevel.emoji}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Level {currentLevel.level}: {currentLevel.name}</p>
            <p className="text-[10px] text-muted-foreground">{totalXp} XP earned</p>
            {nextLevel && (
              <p className="text-[10px] text-muted-foreground">{nextLevel.xp - totalXp} XP to {nextLevel.name}</p>
            )}
          </div>
        </div>
        <div className="space-y-1">
          {GROWTH_LEVELS.map(gl => (
            <div key={gl.level} className={`flex items-center gap-2 text-xs ${totalXp >= gl.xp ? 'text-foreground' : 'text-muted-foreground opacity-60'}`}>
              <span>{gl.emoji}</span>
              <span className="font-semibold">L{gl.level}</span>
              <span>{gl.name}</span>
              <span className="ml-auto text-[10px]">{gl.xp} XP</span>
              {totalXp >= gl.xp && <CheckCircle2 className="h-3 w-3 text-success" />}
            </div>
          ))}
        </div>
      </div>

      {/* Connect to Agency */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Connect to Agency</p>
          </div>
          {!showRedeem && (
            <Button size="sm" variant="outline" onClick={() => setShowRedeem(true)} className="gap-1 text-xs">
              <Ticket className="h-3.5 w-3.5" /> Enter Invite Code
            </Button>
          )}
        </div>

        {agencyAccess.length > 0 ? (
          <div className="space-y-2">
            {agencyAccess.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-sm text-foreground rounded-lg bg-card border border-border px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span className="text-sm font-medium">Connected</span>
                <span className="text-xs text-muted-foreground ml-auto">{a.role}</span>
              </div>
            ))}
          </div>
        ) : !showRedeem ? (
          <p className="text-xs text-muted-foreground">
            Have an invite code from your BCBA or agency? Tap "Enter Invite Code" to connect your account and see your learner's data.
          </p>
        ) : null}

      {showRedeem && (
          <RedeemCodeForm
            redeemedFrom="settings"
            onCancel={() => setShowRedeem(false)}
            onSuccess={() => {
              setShowRedeem(false);
              getMyAgencyAccess().then(setAgencyAccess);
              getMyClients().then(setClients);
              setTimeout(() => navigate('/'), 1500);
            }}
            compact
          />
        )}
      </div>

      {/* My Learners */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
        <h3 className="font-display font-bold text-foreground text-sm">My Learner(s)</h3>
        {clients.length > 0 && (
          <ul className="space-y-2">
            {clients.map(c => (
              <li key={c.id} className="flex items-center gap-2 text-sm text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                {c.first_name} {c.last_name}
              </li>
            ))}
          </ul>
        )}
        {clients.length === 0 && (
          <p className="text-xs text-muted-foreground mb-1">Your account is not linked to a learner yet.</p>
        )}
        <IndependentLearnerForm />
      </div>

      {/* Coach Email (read-only) */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
        <h3 className="font-display font-bold text-foreground text-sm">Coach Email</h3>
        <p className="text-xs text-muted-foreground">Share this email with your Agency or BCBA so they can link your account.</p>
        <div className="flex items-center gap-2">
          <Input
            value={user?.email || ''}
            readOnly
            className="flex-1 bg-muted/50 text-sm font-mono"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(user?.email || '');
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
              toast({ title: 'Copied!', description: 'Email copied to clipboard.' });
            }}
            className="shrink-0 gap-1"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-display font-bold text-foreground text-sm">Daily Reminders</p>
              <p className="text-xs text-muted-foreground">Get reminded to log behaviors & complete lessons at 6 PM</p>
            </div>
          </div>
          <Switch checked={notifications} onCheckedChange={toggleNotifications} />
        </div>
      </div>

      {/* Diagnostics */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <button onClick={() => setShowDiag(!showDiag)} className="w-full flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <span className="font-display font-bold text-foreground text-sm">Diagnostics</span>
          </div>
          <span className="text-xs text-muted-foreground">{showDiag ? 'Hide' : 'Show'}</span>
        </button>
        {showDiag && (
          <div className="border-t border-border p-4 space-y-2 animate-fade-in">
            <DiagRow label="app_slug" value={diagnostics.appSlug || '…'} ok={diagnostics.appSlug === 'novatrack'} />
            <DiagRow label="Backend" value={diagnostics.supabaseUrl || '…'} />
            <DiagRow label="Last Ping" value={diagnostics.lastPing || '…'} ok={diagnostics.lastPing !== 'Failed'} />
          </div>
        )}
      </div>

      {/* Join Agency with Code */}
      <Button variant="outline" className="w-full gap-2" onClick={() => setShowAgencyRedeem(true)}>
        <Building2 className="h-4 w-4" /> Join Agency with Code
      </Button>

      <RedeemAgencyInviteCode
        open={showAgencyRedeem}
        onOpenChange={setShowAgencyRedeem}
        onRedeemed={() => {
          getMyAgencyAccess().then(setAgencyAccess);
          getMyClients().then(setClients);
        }}
      />

      {/* Logout */}
      <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}

function DiagRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-foreground">{value}</span>
        {ok !== undefined && (ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />)}
      </div>
    </div>
  );
}
