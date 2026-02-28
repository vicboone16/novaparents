/**
 * CoachBot™ Slide-Up Panel
 * ────────────────────────
 * 50% height slide-up with tool launcher grid.
 * Each tool has its own sub-panel when selected.
 */

import { useState } from 'react';
import { X, Sparkles, HelpCircle, Search, Shield, MessageSquare, BookOpen, Repeat, Eye, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FunctionFinderTool } from './tools/FunctionFinder';
import { RealTimeRescueTool } from './tools/RealTimeRescue';
import { ScriptGeneratorTool } from './tools/ScriptGenerator';
import { PatternSpotterTool } from './tools/PatternSpotter';
import { ReflectWithMeTool } from './tools/ReflectWithMe';
import { BehaviorLoopTool } from './tools/BehaviorLoop';

type ToolKey = 'translate' | 'reinforce' | 'function-finder' | 'rescue' | 'script' | 'pattern' | 'reflect' | 'loop' | null;

interface Props {
  open: boolean;
  onClose: () => void;
}

const tools: { key: ToolKey; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'translate', label: 'Translate the Behavior™', icon: Sparkles, description: 'ABC → function ranking + replacement skills' },
  { key: 'reinforce', label: 'Reinforcement Check™', icon: HelpCircle, description: 'Did your response reinforce it?' },
  { key: 'function-finder', label: 'Function Finder™', icon: Search, description: 'Guided yes/no → primary function' },
  { key: 'rescue', label: 'Real-Time Rescue™', icon: Shield, description: 'Calm scripts & de-escalation now' },
  { key: 'script', label: 'Script Generator™', icon: MessageSquare, description: 'Custom scripts by function + age' },
  { key: 'pattern', label: 'Pattern Spotter™', icon: Eye, description: 'Analyze your saved log patterns' },
  { key: 'reflect', label: 'Reflect With Me™', icon: BookOpen, description: 'Post-session guided reflection' },
  { key: 'loop', label: 'The Behavior Loop™', icon: Repeat, description: 'Interactive: who was reinforced?' },
];

export function CoachBotPanel({ open, onClose }: Props) {
  const [activeTool, setActiveTool] = useState<ToolKey>(null);

  if (!open) return null;

  function handleSelectTool(key: ToolKey) {
    if (key === 'translate' || key === 'reinforce') {
      // These live in Toolkit tabs — navigate there
      onClose();
      window.location.href = key === 'translate' ? '/toolkit?tab=translator' : '/toolkit?tab=reinforcing';
      return;
    }
    setActiveTool(key);
  }

  function handleBack() {
    setActiveTool(null);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] rounded-t-2xl border-t border-border bg-card shadow-xl animate-slide-up overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            {activeTool && (
              <button onClick={handleBack} className="mr-1 p-1 rounded-lg hover:bg-muted">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-hero">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-sm">CoachBot™</h3>
              <p className="text-[10px] text-muted-foreground">{activeTool ? tools.find(t => t.key === activeTool)?.label : 'Need a second brain?'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!activeTool ? (
            <div className="grid grid-cols-2 gap-2">
              {tools.map(t => (
                <button
                  key={t.key}
                  onClick={() => handleSelectTool(t.key)}
                  className="flex flex-col items-start gap-1.5 rounded-xl border border-border bg-muted/20 p-3 text-left hover:bg-muted/40 hover:border-primary/30 transition-all"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <t.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{t.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="animate-fade-in">
              {activeTool === 'function-finder' && <FunctionFinderTool />}
              {activeTool === 'rescue' && <RealTimeRescueTool />}
              {activeTool === 'script' && <ScriptGeneratorTool />}
              {activeTool === 'pattern' && <PatternSpotterTool />}
              {activeTool === 'reflect' && <ReflectWithMeTool />}
              {activeTool === 'loop' && <BehaviorLoopTool />}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
