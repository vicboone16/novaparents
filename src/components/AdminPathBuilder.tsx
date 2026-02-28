/**
 * Admin Path Builder — Drag/drop (via up/down) module ordering
 * Updates academy_path_modules sort_order, requirement, prereq_module_id
 */

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, GripVertical, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getModules, getPathModules, setPathModules,
  type AcademyModule, type PathModule,
} from '@/lib/academy-dal';

interface Props {
  pathId: string;
  pathTitle: string;
  onClose: () => void;
}

interface BuilderItem {
  module_id: string;
  requirement: 'required' | 'recommended' | 'optional';
  prereq_module_id: string | null;
  unlocks_tool: string | null;
}

export function AdminPathBuilder({ pathId, pathTitle, onClose }: Props) {
  const [allModules, setAllModules] = useState<AcademyModule[]>([]);
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addModuleId, setAddModuleId] = useState('');

  useEffect(() => {
    Promise.all([
      getModules({ status: 'active' }),
      getPathModules(pathId),
    ]).then(([mods, pms]) => {
      setAllModules(mods);
      setItems(pms.sort((a, b) => a.sort_order - b.sort_order).map(pm => ({
        module_id: pm.module_id,
        requirement: pm.requirement,
        prereq_module_id: pm.prereq_module_id,
        unlocks_tool: pm.unlocks_tool,
      })));
    });
  }, [pathId]);

  const usedIds = new Set(items.map(i => i.module_id));
  const availableModules = allModules.filter(m => !usedIds.has(m.id));

  function moveUp(idx: number) {
    if (idx <= 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setItems(next);
    setSaved(false);
  }

  function moveDown(idx: number) {
    if (idx >= items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setItems(next);
    setSaved(false);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
    setSaved(false);
  }

  function addModule() {
    if (!addModuleId) return;
    setItems([...items, {
      module_id: addModuleId,
      requirement: 'recommended',
      prereq_module_id: null,
      unlocks_tool: null,
    }]);
    setAddModuleId('');
    setSaved(false);
  }

  function updateItem(idx: number, updates: Partial<BuilderItem>) {
    setItems(items.map((item, i) => i === idx ? { ...item, ...updates } : item));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const rows = items.map((item, i) => ({
      module_id: item.module_id,
      sort_order: i,
      requirement: item.requirement,
      prereq_module_id: item.prereq_module_id,
      unlocks_tool: item.unlocks_tool,
    }));
    await setPathModules(pathId, rows);
    setSaving(false);
    setSaved(true);
  }

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setItems(next);
    setDragIdx(idx);
    setSaved(false);
  }

  function handleDragEnd() {
    setDragIdx(null);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-primary font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to Paths
        </button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Order'}
        </Button>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-foreground">Path Builder: {pathTitle}</h3>
        <p className="text-xs text-muted-foreground mt-1">Drag modules to reorder, or use arrows. Set requirement and prerequisites.</p>
      </div>

      {/* Module list */}
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No modules in this path. Add modules below.</p>
        )}
        {items.map((item, idx) => {
          const mod = allModules.find(m => m.id === item.module_id);
          return (
            <div
              key={`${item.module_id}-${idx}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`rounded-xl border bg-card p-3 shadow-card flex items-start gap-2 transition-all ${
                dragIdx === idx ? 'border-primary ring-1 ring-primary opacity-70' : 'border-border'
              }`}
            >
              <div className="flex flex-col items-center gap-0.5 pt-1 cursor-grab">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground font-bold">{idx + 1}</span>
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm font-semibold text-foreground">{mod?.title || 'Unknown'}</p>
                <p className="text-[10px] text-muted-foreground">{mod?.short_description}</p>

                <div className="flex gap-2 flex-wrap">
                  <Select value={item.requirement} onValueChange={v => updateItem(idx, { requirement: v as any })}>
                    <SelectTrigger className="h-7 text-[10px] w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">Required</SelectItem>
                      <SelectItem value="recommended">Recommended</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={item.prereq_module_id || 'none'}
                    onValueChange={v => updateItem(idx, { prereq_module_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger className="h-7 text-[10px] w-[140px]"><SelectValue placeholder="Prereq" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No prereq</SelectItem>
                      {items.filter((_, i) => i < idx).map(prev => {
                        const prevMod = allModules.find(m => m.id === prev.module_id);
                        return <SelectItem key={prev.module_id} value={prev.module_id}>{prevMod?.title || prev.module_id.slice(0, 8)}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => moveUp(idx)} disabled={idx === 0} className="h-6 w-6 p-0">
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => moveDown(idx)} disabled={idx === items.length - 1} className="h-6 w-6 p-0">
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-6 w-6 p-0 text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add module */}
      <div className="flex gap-2">
        <Select value={addModuleId} onValueChange={setAddModuleId}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Add a module…" /></SelectTrigger>
          <SelectContent>
            {availableModules.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={addModule} disabled={!addModuleId} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}
