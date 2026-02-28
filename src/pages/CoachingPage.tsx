import { useState } from 'react';
import { Lightbulb, Search, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

const coachingItems = [
  {
    id: '1',
    trigger: 'My client hits when frustrated',
    why: 'Hitting is often a way to communicate "I\'m overwhelmed" or "I need space." It serves as an escape or attention function.',
    replacements: [
      'Teach a "break" card or gesture they can use instead',
      'Practice deep breathing together when calm',
      'Use a feelings chart to label emotions before they escalate',
    ],
    tips: 'Stay calm and neutral. Say "I can see you\'re upset. Let\'s use your break card." Avoid lengthy explanations in the moment.',
  },
  {
    id: '2',
    trigger: 'My client refuses to follow directions',
    why: 'Refusal often indicates the task feels too hard, too boring, or the client wants control. It\'s usually an escape or control function.',
    replacements: [
      'Offer limited choices: "Do you want to start with this or that?"',
      'Break the task into smaller, achievable steps',
      'Use first/then language: "First shoes, then playground"',
    ],
    tips: 'Avoid power struggles. Give two acceptable choices. Praise any attempt to comply, even partial efforts.',
  },
  {
    id: '3',
    trigger: 'My client has meltdowns during transitions',
    why: 'Transitions require shifting attention and giving up a preferred activity. This is hard for many children, especially those who struggle with flexibility.',
    replacements: [
      'Use a visual timer or countdown: "5 more minutes, then we clean up"',
      'Create a transition routine (song, visual cue)',
      'Offer a transition object to carry to the next activity',
    ],
    tips: 'Warn ahead of time. Stay consistent. Once the transition starts, follow through with warmth but firmness.',
  },
  {
    id: '4',
    trigger: 'My client screams or cries to get what they want',
    why: 'This is often an attention or tangible function. The client has learned that screaming works to get a response or item.',
    replacements: [
      'Teach requesting words or signs: "Say \'help please\'"',
      'Model calm asking and reinforce it heavily',
      'Ignore screaming (when safe) and respond to calm requests',
    ],
    tips: 'Be patient. Extinction bursts happen — behavior may get worse before it gets better. Stay the course and reinforce calm communication.',
  },
];

export default function CoachingPage() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = coachingItems.filter((item) =>
    item.trigger.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          "What Do I Do When…"
        </h2>
        <p className="mt-1 text-muted-foreground">
          Coaching tips and replacement behaviors from your agency's library.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search situations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const isOpen = expanded === item.id;
          return (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden transition-all"
            >
              <button
                onClick={() => setExpanded(isOpen ? null : item.id)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Lightbulb className="h-5 w-5 text-accent" />
                </div>
                <span className="flex-1 font-display font-bold text-foreground">
                  {item.trigger}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <div className="animate-fade-in border-t border-border p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Why This Happens
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed">{item.why}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
                      Try These Instead
                    </h4>
                    <ul className="space-y-2">
                      {item.replacements.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-warning mb-1">
                      Pro Tip
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed">{item.tips}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p>No coaching tips found for that search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
