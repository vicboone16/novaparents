/**
 * Script Generator™
 * ─────────────────
 * Inputs: function + age band + communication level
 * Outputs: short script, expanded script, visual cue suggestion
 */

import { useState } from 'react';
import { MessageSquare, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FUNCTION_LABELS, type BehaviorFunction } from '@/lib/analysis';

type AgeBand = 'early-childhood' | 'school-age' | 'adolescent';
type CommLevel = 'pre-verbal' | 'emerging' | 'verbal';

interface ScriptSet {
  short: string;
  expanded: string;
  visualCue: string;
}

const scripts: Record<BehaviorFunction, Record<AgeBand, Record<CommLevel, ScriptSet>>> = {
  attention: {
    'early-childhood': {
      'pre-verbal': { short: '"I see you. Wait." (hold up hand)', expanded: 'Get down to their level. Make brief eye contact. Hold up your hand as a "wait" signal. Return attention within 10 seconds when calm.', visualCue: 'Use a "wait" hand card or a visual timer showing when you\'ll be available.' },
      'emerging': { short: '"Say my name and I\'ll look."', expanded: 'Model: "Say mama." Wait 3 seconds. When they use any approximation, immediately give attention. "You said my name! Here I am!"', visualCue: 'Picture card showing a child tapping an adult\'s arm or saying "mama."' },
      'verbal': { short: '"Use your words: Excuse me, can I talk to you?"', expanded: 'Practice the phrase during calm times. When they interrupt, prompt: "What do you say?" Wait. Respond immediately to the appropriate request.', visualCue: 'Cue card: "Excuse me" with a picture of a raised hand.' },
    },
    'school-age': {
      'pre-verbal': { short: 'Teach a tap signal + wait.', expanded: 'Show them to tap your arm once. Hold up a finger for "one moment." Respond within 15 seconds.', visualCue: '"Tap and wait" social story.' },
      'emerging': { short: '"Say: Can I talk to you?"', expanded: 'Model the full phrase. Accept approximations. Give immediate, warm attention when they try.', visualCue: 'Desk card with "Can I talk to you?" prompt.' },
      'verbal': { short: '"Raise your hand/say excuse me. I\'ll come to you."', expanded: 'Be consistent: only respond to appropriate bids. Set up check-in times (every 15 min). "I always come back."', visualCue: 'Visual schedule showing "check-in" times.' },
    },
    'adolescent': {
      'pre-verbal': { short: 'Use a signal system (text, knock, light).', expanded: 'Agree on a signal: they knock or text when they need you. Respond within a set time.', visualCue: 'Written agreement: "When you need me, text 👋 and I\'ll come within 5 min."' },
      'emerging': { short: '"Text me or come find me. I want to hear from you."', expanded: 'Set up daily check-in time. Reinforce every appropriate bid for attention.', visualCue: 'Shared calendar with check-in blocks.' },
      'verbal': { short: '"I want to talk. Let\'s pick a time that works for both of us."', expanded: 'Validate their need: "Your thoughts matter to me." Set up nightly or daily conversations. Respond to calm requests with genuine engagement.', visualCue: 'Family meeting schedule or "talk time" card on fridge.' },
    },
  },
  escape: {
    'early-childhood': {
      'pre-verbal': { short: '"First this, then play." (show visual)', expanded: 'Use a first/then board. Make the task small. Guide through hand-over-hand if needed. Celebrate completion.', visualCue: 'First/then board with velcro pictures.' },
      'emerging': { short: '"Say: help please."', expanded: 'When they start to resist, prompt "help" before they escalate. Honor the request: simplify the task.', visualCue: '"Help" picture card or sign language visual.' },
      'verbal': { short: '"This is hard. Say: Can I have a break?"', expanded: 'Teach the exact phrase. When they use it, give a 2-min break with a timer. After break, return to a simpler version.', visualCue: '"Break" card they can hand you.' },
    },
    'school-age': {
      'pre-verbal': { short: 'Break card + timer visual.', expanded: 'Provide a "break" card. Accept it every time. Set a timer for break length. Return to modified task.', visualCue: 'Laminated break card + sand timer.' },
      'emerging': { short: '"Say: I need help or I need a break."', expanded: 'Practice both phrases. Respond to either. Help = simplify. Break = 3 min then try again.', visualCue: 'Desk strip: "I need help" | "I need a break" with pictures.' },
      'verbal': { short: '"What part is hard? Let\'s break it down."', expanded: 'Ask which part feels hard. Offer to do the first one together. Use a checklist so they can see progress.', visualCue: 'Task checklist with checkboxes.' },
    },
    'adolescent': {
      'pre-verbal': { short: 'Signal card + negotiated break.', expanded: 'Create a discrete signal. When used, offer a 5-min break. Return to adapted work.', visualCue: 'Colored card system or phone signal.' },
      'emerging': { short: '"Tell me what would make this easier."', expanded: 'Open a dialogue. Offer modifications. "Would you rather do half now and half later?"', visualCue: 'Options menu on a card.' },
      'verbal': { short: '"I hear you. What if we do it this way instead?"', expanded: 'Acknowledge the difficulty. Offer genuine choice in how, when, or how much. Reinforce engagement.', visualCue: 'Written contract: "I will do X by Y time."' },
    },
  },
  tangible: {
    'early-childhood': {
      'pre-verbal': { short: '"Point to what you want." (model pointing)', expanded: 'Hold up two choices. Wait for them to reach, point, or look. Give immediately when they communicate.', visualCue: 'Choice board with 2-4 pictures of preferred items.' },
      'emerging': { short: '"Say: I want ___."', expanded: 'Model the phrase with the item visible. Accept any approximation. Give the item right away.', visualCue: '"I want" sentence strip with velcro pictures.' },
      'verbal': { short: '"Ask nicely: Can I have ___ please?"', expanded: 'Prompt the full request. If they whine/grab, calmly wait. Give enthusiastically when asked properly.', visualCue: 'Visual reminder: "Ask, don\'t grab" with pictures.' },
    },
    'school-age': {
      'pre-verbal': { short: 'Use a request card/picture exchange.', expanded: 'Provide picture cards for common items. Reinforce every exchange.', visualCue: 'PECS-style request board.' },
      'emerging': { short: '"Use your words: Can I have a turn?"', expanded: 'Model turn-taking language. Use a visual timer for turns.', visualCue: 'Turn-taking timer + "my turn" card.' },
      'verbal': { short: '"You can have it after ___. First/then."', expanded: '"First finish your work, then you can have 15 min of screen time." Show the schedule. Be consistent.', visualCue: 'First/then schedule on fridge or desk.' },
    },
    'adolescent': {
      'pre-verbal': { short: 'Token/point system for earned access.', expanded: 'Set up a simple earning system. Visual tracker for progress.', visualCue: 'Points chart or app tracker.' },
      'emerging': { short: '"Let\'s make a deal. What\'s fair?"', expanded: 'Negotiate a reasonable agreement. Write it down. Honor it consistently.', visualCue: 'Written agreement both sign.' },
      'verbal': { short: '"I respect that you want it. Here\'s how to earn it."', expanded: 'Be clear about expectations. Create a transparent earning system. Follow through every time.', visualCue: 'Earning chart or contract posted visibly.' },
    },
  },
  sensory: {
    'early-childhood': {
      'pre-verbal': { short: '"Let\'s try this instead." (offer sensory tool)', expanded: 'Identify the sensation they\'re seeking. Offer a safe alternative: chewy, swing, squeeze ball.', visualCue: 'Sensory menu with pictures: "I need to chew / squeeze / move."' },
      'emerging': { short: '"Say: I need a squeeze/swing/chewy."', expanded: 'Teach them to request the sensory input. Have tools readily available.', visualCue: 'Sensory choice board with real photos.' },
      'verbal': { short: '"Your body needs something. What would help?"', expanded: 'Help them identify the feeling: "Is your body fast or slow? Do you need to move or be still?" Offer matching tools.', visualCue: 'Feelings + body state chart: "My body feels ___. I need ___."' },
    },
    'school-age': {
      'pre-verbal': { short: 'Offer sensory tools proactively every 20 min.', expanded: 'Schedule sensory breaks. Provide fidgets, movement, or calm space without requiring a request.', visualCue: 'Visual timer for sensory breaks.' },
      'emerging': { short: '"Tell me: I need a body break."', expanded: 'Practice the phrase. When they use it, immediately provide the break. No questions.', visualCue: '"Body break" card at desk.' },
      'verbal': { short: '"Check in with your body. What does it need right now?"', expanded: 'Teach interoception: "Is your body wiggly, tight, slow, or fast?" Match to a strategy.', visualCue: 'Body check-in chart with strategies for each state.' },
    },
    'adolescent': {
      'pre-verbal': { short: 'Self-regulation kit available at all times.', expanded: 'Earbuds, fidget, gum, stress ball in a discrete pouch. No need to ask.', visualCue: 'Personal regulation kit (zippered pouch).' },
      'emerging': { short: '"I need a break" signal → immediate access.', expanded: 'Agree on a signal. When used, 5-min break with sensory tools. No negotiation.', visualCue: 'Discrete signal card or hand signal.' },
      'verbal': { short: '"What helps you regulate? Let\'s build your toolkit."', expanded: 'Collaborate on a personalized regulation menu. Review weekly. Adjust based on what works.', visualCue: 'Personal regulation menu card they design.' },
    },
  },
};

export function ScriptGeneratorTool() {
  const [fn, setFn] = useState<BehaviorFunction | ''>('');
  const [age, setAge] = useState<AgeBand | ''>('');
  const [comm, setComm] = useState<CommLevel | ''>('');
  const [copied, setCopied] = useState<string | null>(null);

  const result = fn && age && comm ? scripts[fn]?.[age]?.[comm] : null;

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-accent/5 border border-accent/20 p-3">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-4 w-4 text-accent" />
          <h4 className="font-display font-bold text-foreground text-sm">Script Generator™</h4>
        </div>
        <p className="text-[10px] text-muted-foreground">Get a ready-to-use script based on function, age, and communication level.</p>
      </div>

      <div className="grid gap-3">
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Function</label>
          <Select value={fn} onValueChange={v => setFn(v as BehaviorFunction)}>
            <SelectTrigger><SelectValue placeholder="Select function" /></SelectTrigger>
            <SelectContent>
              {(Object.entries(FUNCTION_LABELS) as [BehaviorFunction, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Age Band</label>
          <Select value={age} onValueChange={v => setAge(v as AgeBand)}>
            <SelectTrigger><SelectValue placeholder="Select age" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="early-childhood">Early Childhood (2-5)</SelectItem>
              <SelectItem value="school-age">School Age (6-12)</SelectItem>
              <SelectItem value="adolescent">Adolescent (13+)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Communication Level</label>
          <Select value={comm} onValueChange={v => setComm(v as CommLevel)}>
            <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pre-verbal">Pre-verbal</SelectItem>
              <SelectItem value="emerging">Emerging</SelectItem>
              <SelectItem value="verbal">Verbal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {result && (
        <div className="space-y-3 animate-fade-in">
          <ScriptCard
            title="🎯 Quick Script"
            content={result.short}
            onCopy={() => copy(result.short, 'short')}
            copied={copied === 'short'}
          />
          <ScriptCard
            title="📝 Expanded Script"
            content={result.expanded}
            onCopy={() => copy(result.expanded, 'expanded')}
            copied={copied === 'expanded'}
          />
          <ScriptCard
            title="👁️ Visual Support Suggestion"
            content={result.visualCue}
            onCopy={() => copy(result.visualCue, 'visual')}
            copied={copied === 'visual'}
          />
        </div>
      )}
    </div>
  );
}

function ScriptCard({ title, content, onCopy, copied }: { title: string; content: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
        <button onClick={onCopy} className="text-[10px] text-primary flex items-center gap-0.5">
          {copied ? <><CheckCircle2 className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <p className="text-sm text-foreground">{content}</p>
    </div>
  );
}
