import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, ArrowRight, Library, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getReplacementBehaviors, type ReplacementBehavior } from '@/lib/dal';

const filterOptions = {
  function: [
    { value: 'all', label: 'All Functions' },
    { value: 'attention', label: 'Attention' },
    { value: 'escape', label: 'Escape' },
    { value: 'tangible', label: 'Tangible' },
    { value: 'sensory', label: 'Sensory' },
  ],
  ageBand: [
    { value: 'all', label: 'All Ages' },
    { value: 'early-childhood', label: 'Early Childhood' },
    { value: 'school-age', label: 'School Age' },
    { value: 'adolescent', label: 'Adolescent' },
  ],
  setting: [
    { value: 'all', label: 'All Settings' },
    { value: 'home', label: 'Home' },
    { value: 'school', label: 'School' },
    { value: 'community', label: 'Community' },
  ],
  commLevel: [
    { value: 'all', label: 'All Levels' },
    { value: 'pre-verbal', label: 'Pre-Verbal' },
    { value: 'emerging', label: 'Emerging' },
    { value: 'verbal', label: 'Verbal' },
  ],
};

export default function LibraryPage() {
  const [items, setItems] = useState<ReplacementBehavior[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ function: 'all', ageBand: 'all', setting: 'all', commLevel: 'all' });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    getReplacementBehaviors().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (search && !item.trigger.toLowerCase().includes(search.toLowerCase()) && !item.definition.toLowerCase().includes(search.toLowerCase())) return false;
      if (filters.function !== 'all' && item.function !== filters.function) return false;
      if (filters.ageBand !== 'all' && item.ageBand !== filters.ageBand) return false;
      if (filters.setting !== 'all' && item.setting !== filters.setting) return false;
      if (filters.commLevel !== 'all' && item.commLevel !== filters.commLevel) return false;
      return true;
    });
  }, [search, filters, items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Replacement Behaviors</h2>
        <p className="mt-1 text-sm text-muted-foreground">Browse strategies from your agency's library.</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 rounded-xl border px-3 text-sm font-medium transition-colors ${showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="animate-fade-in grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Select value={filters.function} onValueChange={(v) => setFilters(f => ({ ...f, function: v }))}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{filterOptions.function.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.ageBand} onValueChange={(v) => setFilters(f => ({ ...f, ageBand: v }))}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{filterOptions.ageBand.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.setting} onValueChange={(v) => setFilters(f => ({ ...f, setting: v }))}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{filterOptions.setting.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.commLevel} onValueChange={(v) => setFilters(f => ({ ...f, commLevel: v }))}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{filterOptions.commLevel.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const isOpen = expanded === item.id;
          return (
            <div key={item.id} className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : item.id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-foreground text-sm">{item.trigger}</h4>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold capitalize">{item.function}</span>
                    <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-bold capitalize">{item.setting}</span>
                    <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-bold capitalize">{item.commLevel}</span>
                  </div>
                </div>
                {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />}
              </button>
              {isOpen && (
                <div className="animate-fade-in border-t border-border p-4 space-y-4">
                  <div>
                    <h5 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Definition</h5>
                    <p className="text-sm text-foreground">{item.definition}</p>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">Teaching Steps</h5>
                    <ol className="space-y-1.5">{item.teachingSteps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="font-bold text-primary text-xs mt-0.5">{i + 1}.</span> {s}
                      </li>
                    ))}</ol>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Prompts</h5>
                    <ul className="space-y-1">{item.prompts.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {p}
                      </li>
                    ))}</ul>
                  </div>
                  <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                    <h5 className="text-[10px] font-semibold uppercase tracking-wide text-success mb-1">Reinforcement</h5>
                    <p className="text-sm text-foreground">{item.reinforcement}</p>
                  </div>
                  <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
                    <h5 className="text-[10px] font-semibold uppercase tracking-wide text-accent mb-1">Generalization</h5>
                    <p className="text-sm text-foreground">{item.generalization}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Library className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p>No results found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
