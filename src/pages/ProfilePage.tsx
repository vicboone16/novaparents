import { useState, useEffect } from 'react';
import { getCurrentUser, signOut, checkHandshake, getMaskedBackendUrl, getMyClients, type ClientSummary } from '@/lib/dal';
import { User, Bell, Wrench, LogOut, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [notifications, setNotifications] = useState(() => localStorage.getItem('bd_notifications') !== 'false');
  const [diagnostics, setDiagnostics] = useState<{
    appSlug: string | null; supabaseUrl: string; lastPing: string | null;
  }>({ appSlug: null, supabaseUrl: '', lastPing: null });
  const [showDiag, setShowDiag] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentUser().then(setUser);
    getMyClients().then(setClients);
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

  function toggleNotifications(val: boolean) {
    setNotifications(val);
    localStorage.setItem('bd_notifications', String(val));
  }

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  // Simulated invite code (would come from backend in production)
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
      <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-foreground truncate">{user?.email || 'Loading…'}</p>
          <p className="text-sm text-muted-foreground">Coach Account</p>
        </div>
      </div>

      {/* Invite Code */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">Your Invite Code</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-sm font-mono text-foreground">{inviteCode}</code>
          <Button size="sm" variant="outline" onClick={copyInvite} className="gap-1">
            <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* My Learners */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="font-display font-bold text-foreground mb-3 text-sm">My Learner(s)</h3>
        {clients.length > 0 ? (
          <ul className="space-y-2">
            {clients.map(c => (
              <li key={c.id} className="flex items-center gap-2 text-sm text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                {c.first_name} {c.last_name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Your assigned Learners will appear here once connected.</p>
        )}
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-display font-bold text-foreground text-sm">Notifications</p>
            <p className="text-xs text-muted-foreground">Reminders & tips</p>
          </div>
        </div>
        <Switch checked={notifications} onCheckedChange={toggleNotifications} />
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
