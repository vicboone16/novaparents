/**
 * Behavior Lab Admin Page
 * ────────────────────────
 * Game management: create, edit, archive, content JSON editing.
 * Visible only to super_admin / agency_admin / supervisor.
 */

import { useState, useEffect } from 'react';
import { Gamepad2, Plus, Pencil, Archive, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCurrentUser } from '@/lib/dal';
import { getGames, createGame, updateGame, type LabGame } from '@/lib/behavior-lab-dal';
import { seedBehaviorLabGames } from '@/lib/behavior-lab-seeds';

export default function BehaviorLabAdminPage() {
  const [userId, setUserId] = useState('');
  const [games, setGames] = useState<LabGame[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingGame, setEditingGame] = useState<LabGame | null>(null);
  const [editingContent, setEditingContent] = useState<LabGame | null>(null);
  const [contentJson, setContentJson] = useState('');

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setUserId(u.id); });
    loadGames();
  }, []);

  async function loadGames() { setGames(await getGames()); }

  const filtered = games.filter(g =>
    !search || g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.skill_tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleSaveContent() {
    if (!editingContent) return;
    try {
      const parsed = JSON.parse(contentJson);
      await updateGame(editingContent.id, { content: parsed });
      setEditingContent(null);
      loadGames();
    } catch { alert('Invalid JSON'); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-primary" /> Behavior Lab Admin
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage games, content, and difficulty settings.</p>
      </div>

      {editingContent ? (
        <div className="space-y-3">
          <button onClick={() => setEditingContent(null)} className="text-sm text-primary flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to games
          </button>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-2">{editingContent.title} — Content Editor</p>
            <Textarea
              value={contentJson}
              onChange={e => setContentJson(e.target.value)}
              rows={20}
              className="font-mono text-xs"
            />
            <Button onClick={handleSaveContent} className="w-full mt-3">Save Content</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Input placeholder="Search games…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[150px] text-sm" />
            <Button size="sm" variant="outline" onClick={async () => {
              const count = await seedBehaviorLabGames();
              alert(`Seeded ${count} games`);
              loadGames();
            }} className="gap-1 text-xs">
              Seed 12 Games
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Create Game
            </Button>
          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No games found.</p>
          )}

          <div className="space-y-2">
            {filtered.map(g => (
              <div key={g.id} className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{g.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      g.difficulty === 'easy' ? 'bg-success/10 text-success' :
                      g.difficulty === 'medium' ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>{g.difficulty}</span>
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">Stage {g.stage}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${g.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {g.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{g.short_description}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {g.skill_tags?.map(tag => (
                      <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{tag}</span>
                    ))}
                    <span className="text-[10px] text-muted-foreground">{g.est_seconds}s</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setEditingGame(g)} className="h-8 w-8 p-0">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingContent(g);
                    setContentJson(JSON.stringify(g.content, null, 2));
                  }} className="h-8 w-8 p-0 text-primary">
                    <Gamepad2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await updateGame(g.id, { status: g.status === 'active' ? 'archived' : 'active' });
                    loadGames();
                  }} className="h-8 w-8 p-0">
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <GameFormDialog
        open={showCreate || !!editingGame}
        game={editingGame}
        userId={userId}
        onClose={() => { setShowCreate(false); setEditingGame(null); }}
        onSaved={() => { setShowCreate(false); setEditingGame(null); loadGames(); }}
      />
    </div>
  );
}

function GameFormDialog({ open, game, userId, onClose, onSaved }: {
  open: boolean; game: LabGame | null; userId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [stage, setStage] = useState(1);
  const [tags, setTags] = useState('');
  const [estSeconds, setEstSeconds] = useState(90);
  const [scope, setScope] = useState<'system' | 'agency'>('system');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (game) {
      setTitle(game.title); setDescription(game.short_description || '');
      setDifficulty(game.difficulty); setStage(game.stage);
      setTags(game.skill_tags?.join(', ') || ''); setEstSeconds(game.est_seconds);
      setScope(game.scope);
    } else {
      setTitle(''); setDescription(''); setDifficulty('easy'); setStage(1);
      setTags(''); setEstSeconds(90); setScope('system');
    }
  }, [game, open]);

  async function handleSave() {
    setSaving(true);
    const payload = {
      title,
      short_description: description,
      difficulty,
      stage,
      skill_tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      est_seconds: estSeconds,
      scope,
      created_by: userId,
      content: game?.content || {
        questions: [],
        examples: [],
        misconceptions: [],
      },
    };
    if (game) {
      await updateGame(game.id, payload);
    } else {
      await createGame(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{game ? 'Edit Game' : 'Create Game'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          <div className="grid grid-cols-3 gap-3">
            <Select value={difficulty} onValueChange={v => setDifficulty(v as 'easy' | 'medium' | 'hard')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Stage" value={stage} onChange={e => setStage(Number(e.target.value))} />
            <Input type="number" placeholder="Seconds" value={estSeconds} onChange={e => setEstSeconds(Number(e.target.value))} />
          </div>
          <Select value={scope} onValueChange={v => setScope(v as 'system' | 'agency')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="agency">Agency</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Skill tags (comma-separated)" value={tags} onChange={e => setTags(e.target.value)} />
          <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full">
            {saving ? 'Saving…' : game ? 'Update Game' : 'Create Game'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
