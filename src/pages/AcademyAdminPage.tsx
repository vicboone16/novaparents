/**
 * Academy Admin Page
 * ──────────────────
 * 4 tabs: Modules, Paths, Assignments, Rules
 * Visible only to super_admin / agency_admin / supervisor
 */

import { useState, useEffect } from 'react';
import { BookOpen, Route, UserCheck, Shield, Plus, Pencil, Copy, Archive, Eye, Search, ChevronRight, ArrowLeft, Wrench } from 'lucide-react';
import { AdminPathBuilder } from '@/components/AdminPathBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUserRole } from '@/hooks/useUserRole';
import { getCurrentUser } from '@/lib/dal';
import {
  getModules, createModule, updateModule,
  getVersions, createVersion, updateVersion,
  getPaths, createPath, updatePath, getPathModules, setPathModules,
  getAssignments, createAssignment, updateAssignment,
  getRules, createRule, updateRule, deleteRule,
  type AcademyModule, type ModuleVersion, type AcademyPath, type PathModule,
  type ModuleAssignment, type ModuleRule,
} from '@/lib/academy-dal';

type Tab = 'modules' | 'paths' | 'assignments' | 'rules';

export default function AcademyAdminPage() {
  const { role, isSuperAdmin } = useUserRole();
  const [tab, setTab] = useState<Tab>('modules');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setUserId(u.id); });
  }, []);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'modules', label: 'Modules', icon: BookOpen },
    { key: 'paths', label: 'Paths', icon: Route },
    { key: 'assignments', label: 'Assignments', icon: UserCheck },
    { key: 'rules', label: 'Rules', icon: Shield },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Academy Admin</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage modules, paths, assignments, and rules.</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              tab === t.key
                ? 'bg-primary text-primary-foreground shadow-soft'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === 'modules' && <ModulesTab userId={userId} isSuperAdmin={isSuperAdmin} />}
        {tab === 'paths' && <PathsTab userId={userId} isSuperAdmin={isSuperAdmin} />}
        {tab === 'assignments' && <AssignmentsTab userId={userId} />}
        {tab === 'rules' && <RulesTab userId={userId} />}
      </div>
    </div>
  );
}

// ─── Modules Tab ─────────────────────────────────────────

function ModulesTab({ userId, isSuperAdmin }: { userId: string; isSuperAdmin: boolean }) {
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingModule, setEditingModule] = useState<AcademyModule | null>(null);
  const [versionsModule, setVersionsModule] = useState<AcademyModule | null>(null);

  useEffect(() => { loadModules(); }, [scopeFilter, statusFilter]);

  async function loadModules() {
    const filters: any = {};
    if (scopeFilter) filters.scope = scopeFilter;
    if (statusFilter) filters.status = statusFilter;
    const data = await getModules(filters);
    setModules(data);
  }

  const filtered = modules.filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.skill_tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Search modules…" value={search} onChange={e => setSearch(e.target.value)} className="text-sm" />
        </div>
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Scope" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scopes</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="agency">Agency</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Create Module
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No modules found. Create your first module to get started.</p>
        )}
        {filtered.map(mod => (
          <div key={mod.id} className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${mod.scope === 'system' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                  {mod.scope}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${mod.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {mod.status}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{mod.short_description}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground">{mod.est_minutes} min</span>
                <span className="text-[10px] text-muted-foreground">• {mod.audience}</span>
                {mod.skill_tags?.map(tag => (
                  <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setEditingModule(mod)} className="h-8 w-8 p-0">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={async () => {
                await createModule({ ...mod, id: undefined, title: `${mod.title} (Copy)`, created_by: userId } as any);
                loadModules();
              }} className="h-8 w-8 p-0">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setVersionsModule(mod)} className="h-8 w-8 p-0">
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={async () => {
                await updateModule(mod.id, { status: mod.status === 'active' ? 'archived' : 'active' });
                loadModules();
              }} className="h-8 w-8 p-0">
                <Archive className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit dialog */}
      <ModuleFormDialog
        open={showCreate || !!editingModule}
        module={editingModule}
        userId={userId}
        onClose={() => { setShowCreate(false); setEditingModule(null); }}
        onSaved={() => { setShowCreate(false); setEditingModule(null); loadModules(); }}
      />

      {/* Versions dialog */}
      {versionsModule && (
        <VersionsDialog
          module={versionsModule}
          userId={userId}
          onClose={() => setVersionsModule(null)}
        />
      )}
    </div>
  );
}

// ─── Module Form Dialog ──────────────────────────────────

function ModuleFormDialog({ open, module, userId, onClose, onSaved }: {
  open: boolean; module: AcademyModule | null; userId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'system' | 'agency'>('system');
  const [audience, setAudience] = useState<'coach' | 'staff' | 'mixed'>('coach');
  const [estMinutes, setEstMinutes] = useState(5);
  const [tags, setTags] = useState('');
  const [suggestedTool, setSuggestedTool] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (module) {
      setTitle(module.title);
      setDescription(module.short_description || '');
      setScope(module.scope);
      setAudience(module.audience);
      setEstMinutes(module.est_minutes);
      setTags(module.skill_tags?.join(', ') || '');
      setSuggestedTool(module.suggested_tool || '');
    } else {
      setTitle(''); setDescription(''); setScope('system'); setAudience('coach');
      setEstMinutes(5); setTags(''); setSuggestedTool('');
    }
  }, [module, open]);

  async function handleSave() {
    setSaving(true);
    const payload = {
      title,
      short_description: description,
      scope,
      audience,
      est_minutes: estMinutes,
      skill_tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      suggested_tool: suggestedTool || null,
      created_by: userId,
    };
    if (module) {
      await updateModule(module.id, payload);
    } else {
      await createModule(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{module ? 'Edit Module' : 'Create Module'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Select value={scope} onValueChange={v => setScope(v as 'system' | 'agency')}>
              <SelectTrigger><SelectValue placeholder="Scope" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={audience} onValueChange={v => setAudience(v as 'coach' | 'staff' | 'mixed')}>
              <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Est. minutes" value={estMinutes} onChange={e => setEstMinutes(Number(e.target.value))} />
            <Select value={suggestedTool} onValueChange={setSuggestedTool}>
              <SelectTrigger><SelectValue placeholder="Suggested tool" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="translator">Translator</SelectItem>
                <SelectItem value="reinforcement_check">Reinforcement Check</SelectItem>
                <SelectItem value="function_finder">Function Finder</SelectItem>
                <SelectItem value="data_log">Data Log</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Skill tags (comma-separated)" value={tags} onChange={e => setTags(e.target.value)} />
          <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full">
            {saving ? 'Saving…' : module ? 'Update Module' : 'Create Module'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Versions Dialog ─────────────────────────────────────

function VersionsDialog({ module, userId, onClose }: {
  module: AcademyModule; userId: string; onClose: () => void;
}) {
  const [versions, setVersions] = useState<ModuleVersion[]>([]);
  const [editingContent, setEditingContent] = useState<ModuleVersion | null>(null);
  const [contentJson, setContentJson] = useState('');

  useEffect(() => { loadVersions(); }, [module.id]);

  async function loadVersions() {
    setVersions(await getVersions(module.id));
  }

  async function handleCreateDraft() {
    const maxNum = versions.length > 0 ? Math.max(...versions.map(v => v.version_num)) : 0;
    await createVersion({
      module_id: module.id,
      version_num: maxNum + 1,
      status: 'draft',
      content: { screens: [], misconceptions: [], practice: [], reflection: '', close: { label: 'Continue', tool: '' } },
      created_by: userId,
    });
    loadVersions();
  }

  async function handlePublish(v: ModuleVersion) {
    await updateVersion(v.id, { status: 'published' });
    loadVersions();
  }

  async function handleSaveContent() {
    if (!editingContent) return;
    try {
      const parsed = JSON.parse(contentJson);
      await updateVersion(editingContent.id, { content: parsed });
      setEditingContent(null);
      loadVersions();
    } catch {
      alert('Invalid JSON');
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Versions: {module.title}</DialogTitle>
        </DialogHeader>

        {editingContent ? (
          <div className="space-y-3">
            <button onClick={() => setEditingContent(null)} className="text-sm text-primary flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to versions
            </button>
            <p className="text-xs text-muted-foreground">Version {editingContent.version_num} — Edit content JSON</p>
            <Textarea
              value={contentJson}
              onChange={e => setContentJson(e.target.value)}
              rows={20}
              className="font-mono text-xs"
            />
            <Button onClick={handleSaveContent} className="w-full">Save Content</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button size="sm" onClick={handleCreateDraft} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> New Draft
            </Button>
            {versions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No versions yet. Create a draft to start building content.</p>
            )}
            {versions.map(v => (
              <div key={v.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">v{v.version_num}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      v.status === 'published' ? 'bg-success/10 text-success' :
                      v.status === 'draft' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{new Date(v.updated_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingContent(v);
                    setContentJson(JSON.stringify(v.content, null, 2));
                  }} className="text-xs">
                    Edit Content
                  </Button>
                  {v.status === 'draft' && (
                    <Button variant="outline" size="sm" onClick={() => handlePublish(v)} className="text-xs">
                      Publish
                    </Button>
                  )}
                  {v.status !== 'archived' && (
                    <Button variant="ghost" size="sm" onClick={async () => {
                      await updateVersion(v.id, { status: 'archived' });
                      loadVersions();
                    }} className="text-xs">
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Paths Tab ───────────────────────────────────────────

function PathsTab({ userId, isSuperAdmin }: { userId: string; isSuperAdmin: boolean }) {
  const [paths, setPaths] = useState<AcademyPath[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPath, setEditingPath] = useState<AcademyPath | null>(null);
  const [buildingPath, setBuildingPath] = useState<AcademyPath | null>(null);

  useEffect(() => { loadPaths(); }, []);
  async function loadPaths() { setPaths(await getPaths()); }

  if (buildingPath) {
    return (
      <AdminPathBuilder
        pathId={buildingPath.id}
        pathTitle={buildingPath.title}
        onClose={() => setBuildingPath(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage learning paths and module ordering.</p>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Create Path
        </Button>
      </div>

      {paths.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No paths created yet.</p>
      )}

      {paths.map(p => (
        <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{p.title}</p>
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">{p.path_type}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                {p.status}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{new Date(p.updated_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setBuildingPath(p)} className="text-xs gap-1">
              <Wrench className="h-3 w-3" /> Build
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditingPath(p)} className="text-xs">Edit</Button>
            <Button variant="ghost" size="sm" onClick={async () => {
              await updatePath(p.id, { status: p.status === 'active' ? 'archived' : 'active' });
              loadPaths();
            }} className="text-xs">
              {p.status === 'active' ? 'Archive' : 'Activate'}
            </Button>
          </div>
        </div>
      ))}

      <PathFormDialog
        open={showCreate || !!editingPath}
        path={editingPath}
        userId={userId}
        onClose={() => { setShowCreate(false); setEditingPath(null); }}
        onSaved={() => { setShowCreate(false); setEditingPath(null); loadPaths(); }}
      />
    </div>
  );
}

function PathFormDialog({ open, path, userId, onClose, onSaved }: {
  open: boolean; path: AcademyPath | null; userId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [pathType, setPathType] = useState('system_default');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (path) { setTitle(path.title); setPathType(path.path_type); }
    else { setTitle(''); setPathType('system_default'); }
  }, [path, open]);

  async function handleSave() {
    setSaving(true);
    if (path) {
      await updatePath(path.id, { title, path_type: pathType as any });
    } else {
      await createPath({ title, path_type: pathType as any, created_by: userId });
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{path ? 'Edit Path' : 'Create Path'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Path title" value={title} onChange={e => setTitle(e.target.value)} />
          <Select value={pathType} onValueChange={setPathType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="system_default">System Default</SelectItem>
              <SelectItem value="agency">Agency</SelectItem>
              <SelectItem value="coach">Coach</SelectItem>
              <SelectItem value="learner">Learner</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full">
            {saving ? 'Saving…' : 'Save Path'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assignments Tab ─────────────────────────────────────

function AssignmentsTab({ userId }: { userId: string }) {
  const [assignments, setAssignments] = useState<ModuleAssignment[]>([]);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => {
    getAssignments().then(setAssignments);
    getModules({ status: 'active' }).then(setModules);
  }, []);

  async function reload() {
    setAssignments(await getAssignments());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Assign modules to coaches.</p>
        <Button size="sm" onClick={() => setShowAssign(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Assign Module
        </Button>
      </div>

      {assignments.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No assignments yet.</p>
      )}

      {assignments.map(a => {
        const mod = modules.find(m => m.id === a.module_id);
        return (
          <div key={a.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{mod?.title || 'Unknown Module'}</p>
                <p className="text-[10px] text-muted-foreground">Coach: {a.coach_user_id.slice(0, 8)}… • {a.status}</p>
                {a.due_date && <p className="text-[10px] text-muted-foreground">Due: {a.due_date}</p>}
                {a.note_to_coach && <p className="text-[10px] text-muted-foreground italic mt-1">"{a.note_to_coach}"</p>}
              </div>
              <div className="flex gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  a.status === 'completed' ? 'bg-success/10 text-success' :
                  a.status === 'assigned' ? 'bg-primary/10 text-primary' :
                  a.status === 'in_progress' ? 'bg-warning/10 text-warning' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {a.status}
                </span>
                {a.status !== 'removed' && (
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await updateAssignment(a.id, { status: 'removed' });
                    reload();
                  }} className="text-xs text-destructive">Remove</Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <AssignDialog
        open={showAssign}
        modules={modules}
        userId={userId}
        onClose={() => setShowAssign(false)}
        onSaved={() => { setShowAssign(false); reload(); }}
      />
    </div>
  );
}

function AssignDialog({ open, modules, userId, onClose, onSaved }: {
  open: boolean; modules: AcademyModule[]; userId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [coachId, setCoachId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAssign() {
    if (!coachId || !moduleId) return;
    setSaving(true);
    await createAssignment({
      module_id: moduleId,
      coach_user_id: coachId,
      assigned_by: userId,
      due_date: dueDate || null,
      note_to_coach: note || null,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign Module</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Coach User ID" value={coachId} onChange={e => setCoachId(e.target.value)} />
          <Select value={moduleId} onValueChange={setModuleId}>
            <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
            <SelectContent>
              {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" placeholder="Due date (optional)" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <Textarea placeholder="Supportive note to coach (optional)" value={note} onChange={e => setNote(e.target.value)} rows={2} />
          <Button onClick={handleAssign} disabled={saving || !coachId || !moduleId} className="w-full">
            {saving ? 'Assigning…' : 'Assign'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Rules Tab ───────────────────────────────────────────

function RulesTab({ userId }: { userId: string }) {
  const [rules, setRules] = useState<ModuleRule[]>([]);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    getRules().then(setRules);
    getModules().then(setModules);
  }, []);

  async function reload() { setRules(await getRules()); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Visibility and requirement rules.</p>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Create Rule
        </Button>
      </div>

      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No rules configured.</p>
      )}

      {rules.map(r => {
        const mod = modules.find(m => m.id === r.module_id);
        const scope = r.learner_id ? 'Learner' : r.coach_user_id ? 'Coach' : r.agency_id ? 'Agency' : 'Global';
        return (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{mod?.title || 'Unknown'}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{scope}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Visibility: {r.visibility} • Override: {r.requirement_override || 'default'}
                {r.min_modules_completed > 0 && ` • Min modules: ${r.min_modules_completed}`}
                {r.min_translator_runs > 0 && ` • Min translator: ${r.min_translator_runs}`}
                {r.min_lab_games_completed > 0 && ` • Min games: ${r.min_lab_games_completed}`}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={async () => { await deleteRule(r.id); reload(); }} className="text-xs text-destructive">
              Delete
            </Button>
          </div>
        );
      })}

      <RuleFormDialog
        open={showCreate}
        modules={modules}
        userId={userId}
        onClose={() => setShowCreate(false)}
        onSaved={() => { setShowCreate(false); reload(); }}
      />
    </div>
  );
}

function RuleFormDialog({ open, modules, userId, onClose, onSaved }: {
  open: boolean; modules: AcademyModule[]; userId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [moduleId, setModuleId] = useState('');
  const [visibility, setVisibility] = useState('visible');
  const [reqOverride, setReqOverride] = useState('default');
  const [minModules, setMinModules] = useState(0);
  const [minTranslator, setMinTranslator] = useState(0);
  const [minGames, setMinGames] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!moduleId) return;
    setSaving(true);
    await createRule({
      module_id: moduleId,
      visibility: visibility as any,
      requirement_override: reqOverride,
      min_modules_completed: minModules,
      min_translator_runs: minTranslator,
      min_lab_games_completed: minGames,
      created_by: userId,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Rule</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={moduleId} onValueChange={setModuleId}>
            <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
            <SelectContent>
              {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reqOverride} onValueChange={setReqOverride}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="required">Required</SelectItem>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="optional">Optional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground">Min modules</label>
              <Input type="number" value={minModules} onChange={e => setMinModules(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Min translator</label>
              <Input type="number" value={minTranslator} onChange={e => setMinTranslator(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Min games</label>
              <Input type="number" value={minGames} onChange={e => setMinGames(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !moduleId} className="w-full">
            {saving ? 'Saving…' : 'Create Rule'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
