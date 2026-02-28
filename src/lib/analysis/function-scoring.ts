/**
 * Behavior Function Scoring Engine
 * ─────────────────────────────────
 * Deterministic scoring — no AI. Ranks the four functions
 * (attention, escape, tangible, sensory) based on structured
 * toggle inputs and keyword matching in free-text fields.
 *
 * Scoring is transparent and auditable.
 */

export type BehaviorFunction = 'attention' | 'escape' | 'tangible' | 'sensory';

export interface StructuredToggles {
  attentionGiven: boolean;
  demandRemoved: boolean;
  accessProvided: boolean;
  sensoryChange: boolean;
}

export interface FunctionInput {
  antecedent: string;
  antecedentCategory: string;
  behavior: string;
  behaviorCategory: string;
  consequence: string;
  consequenceCategory: string;
  toggles: StructuredToggles;
}

export interface FunctionRanking {
  function: BehaviorFunction;
  score: number;
  confidence: 'high' | 'moderate' | 'low';
  label: string;
}

export interface FunctionResult {
  rankings: FunctionRanking[];
  topFunction: BehaviorFunction;
  suggestedResponse: string[];
  explanation: string;
}

// ─── Keyword banks ───────────────────────────────────────

const ATTENTION_ANTECEDENT = /\b(alone|ignored|busy|phone|sibling|not.?looking|turned.?away|talking.?to|left.?room)\b/i;
const ATTENTION_BEHAVIOR = /\b(call|yell|scream|cry|whine|tug|tap|follow|cling|act.?out|tantrum|hit|throw|loud)\b/i;
const ATTENTION_CONSEQUENCE = /\b(look|talk|comfort|hug|pick.?up|respond|attention|came.?over|said|told)\b/i;

const ESCAPE_ANTECEDENT = /\b(demand|task|homework|chore|clean|brush|bath|transition|asked.?to|told.?to|time.?to|instruction|worksheet|work)\b/i;
const ESCAPE_BEHAVIOR = /\b(run|leave|hide|refuse|say.?no|drop|push.?away|cry|scream|tantrum|flop|fall|shut.?down|elope)\b/i;
const ESCAPE_CONSEQUENCE = /\b(stop|removed|didn.?t.?have.?to|break|let.?go|gave.?up|left.?alone|postpone|delay|excuse)\b/i;

const TANGIBLE_ANTECEDENT = /\b(denied|told.?no|can.?t.?have|taken.?away|turn|share|want|see|store|screen|ipad|tablet|phone|toy|food|candy|snack)\b/i;
const TANGIBLE_BEHAVIOR = /\b(grab|reach|snatch|scream|cry|tantrum|hit|throw|demand|point|beg|whine|take)\b/i;
const TANGIBLE_CONSEQUENCE = /\b(gave|got|received|handed|access|allowed|opened|turned.?on|let.?have|bought)\b/i;

const SENSORY_ANTECEDENT = /\b(loud|bright|crowd|texture|tag|seam|smell|temperature|hot|cold|wet|tight|itchy|noisy|quiet|dark|boring)\b/i;
const SENSORY_BEHAVIOR = /\b(rock|flap|spin|hum|cover.?ear|close.?eye|mouth|chew|bite|squeeze|rub|scratch|stim|fidget|jump|bounce)\b/i;
const SENSORY_CONSEQUENCE = /\b(continue|kept|didn.?t.?stop|self|automatic|alone|no.?one|internal|feel|calm|relief)\b/i;

// ─── Category boosts ────────────────────────────────────

const ANTECEDENT_CATEGORIES: Record<string, Partial<Record<BehaviorFunction, number>>> = {
  'social-withdrawal': { attention: 20 },
  'demand-placed': { escape: 20 },
  'item-denied': { tangible: 20 },
  'sensory-environment': { sensory: 20 },
  'transition': { escape: 15 },
  'unstructured': { attention: 10, sensory: 10 },
};

const BEHAVIOR_CATEGORIES: Record<string, Partial<Record<BehaviorFunction, number>>> = {
  'verbal-outburst': { attention: 15, escape: 10 },
  'physical-aggression': { escape: 10, tangible: 10 },
  'self-stimulatory': { sensory: 25 },
  'elopement': { escape: 20 },
  'property-destruction': { tangible: 10, escape: 10 },
  'non-compliance': { escape: 20 },
};

const CONSEQUENCE_CATEGORIES: Record<string, Partial<Record<BehaviorFunction, number>>> = {
  'adult-attention': { attention: 20 },
  'demand-removed': { escape: 20 },
  'item-given': { tangible: 20 },
  'sensory-input': { sensory: 20 },
};

// ─── Scoring ─────────────────────────────────────────────

export function scoreFunctions(input: FunctionInput): FunctionResult {
  const scores: Record<BehaviorFunction, number> = {
    attention: 0,
    escape: 0,
    tangible: 0,
    sensory: 0,
  };

  // 1. Toggle scoring (heaviest weight — most reliable signal)
  if (input.toggles.attentionGiven) scores.attention += 35;
  if (input.toggles.demandRemoved) scores.escape += 35;
  if (input.toggles.accessProvided) scores.tangible += 35;
  if (input.toggles.sensoryChange) scores.sensory += 35;

  // 2. Dropdown category scoring
  const antCat = ANTECEDENT_CATEGORIES[input.antecedentCategory];
  if (antCat) {
    for (const [fn, pts] of Object.entries(antCat)) {
      scores[fn as BehaviorFunction] += pts!;
    }
  }

  const behCat = BEHAVIOR_CATEGORIES[input.behaviorCategory];
  if (behCat) {
    for (const [fn, pts] of Object.entries(behCat)) {
      scores[fn as BehaviorFunction] += pts!;
    }
  }

  const conCat = CONSEQUENCE_CATEGORIES[input.consequenceCategory];
  if (conCat) {
    for (const [fn, pts] of Object.entries(conCat)) {
      scores[fn as BehaviorFunction] += pts!;
    }
  }

  // 3. Keyword matching in free text (lighter weight)
  const ant = input.antecedent;
  const beh = input.behavior;
  const con = input.consequence;

  if (ATTENTION_ANTECEDENT.test(ant)) scores.attention += 10;
  if (ATTENTION_BEHAVIOR.test(beh)) scores.attention += 10;
  if (ATTENTION_CONSEQUENCE.test(con)) scores.attention += 10;

  if (ESCAPE_ANTECEDENT.test(ant)) scores.escape += 10;
  if (ESCAPE_BEHAVIOR.test(beh)) scores.escape += 10;
  if (ESCAPE_CONSEQUENCE.test(con)) scores.escape += 10;

  if (TANGIBLE_ANTECEDENT.test(ant)) scores.tangible += 10;
  if (TANGIBLE_BEHAVIOR.test(beh)) scores.tangible += 10;
  if (TANGIBLE_CONSEQUENCE.test(con)) scores.tangible += 10;

  if (SENSORY_ANTECEDENT.test(ant)) scores.sensory += 10;
  if (SENSORY_BEHAVIOR.test(beh)) scores.sensory += 10;
  if (SENSORY_CONSEQUENCE.test(con)) scores.sensory += 10;

  // 4. Rank
  const ranked = (Object.entries(scores) as [BehaviorFunction, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([fn, score]) => ({
      function: fn,
      score,
      confidence: getConfidence(score),
      label: FUNCTION_LABELS[fn],
    }));

  const top = ranked[0].function;

  return {
    rankings: ranked,
    topFunction: top,
    suggestedResponse: getSuggestedResponse(top),
    explanation: getExplanation(top, input),
  };
}

function getConfidence(score: number): 'high' | 'moderate' | 'low' {
  if (score >= 45) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
}

export const FUNCTION_LABELS: Record<BehaviorFunction, string> = {
  attention: 'Attention-Seeking',
  escape: 'Escape / Avoidance',
  tangible: 'Access to Tangible',
  sensory: 'Sensory / Automatic',
};

// ─── Suggested responses ─────────────────────────────────

function getSuggestedResponse(fn: BehaviorFunction): string[] {
  switch (fn) {
    case 'attention':
      return [
        'Stay calm and avoid giving the behavior extra attention.',
        'Redirect your Learner to an appropriate way to get your attention (e.g., tapping your arm, saying "excuse me").',
        'Praise and give attention immediately when they use the replacement skill.',
      ];
    case 'escape':
      return [
        'Keep the demand in place — don\'t remove it in response to the behavior.',
        'Offer a structured break or a simpler version of the task.',
        'Teach your Learner to ask for help or a break using words, a card, or a gesture.',
      ];
    case 'tangible':
      return [
        'Stay consistent — don\'t give the item in response to the behavior.',
        'Teach your Learner to ask appropriately ("Can I have…?" or a picture/sign).',
        'Offer a choice between two acceptable options to give a sense of control.',
      ];
    case 'sensory':
      return [
        'Identify the sensory need being met (movement, pressure, visual, oral).',
        'Provide a safe alternative that meets the same sensory need (fidget, swing, chew toy).',
        'Schedule regular sensory breaks throughout the day.',
      ];
  }
}

function getExplanation(fn: BehaviorFunction, input: FunctionInput): string {
  const parts: string[] = [];

  switch (fn) {
    case 'attention':
      parts.push('The behavior appears to be maintained by adult attention.');
      if (input.toggles.attentionGiven) parts.push('Attention was given after the behavior occurred.');
      break;
    case 'escape':
      parts.push('The behavior appears to be maintained by avoiding or escaping a demand.');
      if (input.toggles.demandRemoved) parts.push('The demand was removed or reduced after the behavior.');
      break;
    case 'tangible':
      parts.push('The behavior appears to be maintained by gaining access to a preferred item or activity.');
      if (input.toggles.accessProvided) parts.push('Access to the item/activity was provided after the behavior.');
      break;
    case 'sensory':
      parts.push('The behavior appears to serve a sensory or automatic function.');
      if (input.toggles.sensoryChange) parts.push('A sensory change occurred during or after the behavior.');
      break;
  }

  return parts.join(' ');
}

// ─── Reinforcement checker ───────────────────────────────

export interface ReinforcementInput {
  whatHappened: string;
  whatYouDid: string;
  whatLearnerGot: BehaviorFunction[];
}

export type ReinforcementLikelihood = 'yes' | 'possibly' | 'unlikely';

export interface ReinforcementResult {
  likelihood: ReinforcementLikelihood;
  label: string;
  explanation: string;
  whatToDoInstead: string[];
  matchedFunctions: BehaviorFunction[];
}

export function checkReinforcement(input: ReinforcementInput): ReinforcementResult {
  const gotCount = input.whatLearnerGot.length;

  // Check for keywords suggesting the adult's action matched the function
  const adultAction = input.whatYouDid.toLowerCase();
  const functionSignals: BehaviorFunction[] = [];

  if (/\b(talk|said|look|comfort|hug|pick|respond|came|went.?to|yell)\b/i.test(adultAction)) {
    functionSignals.push('attention');
  }
  if (/\b(stop|let|gave.?up|remove|didn.?t.?make|postpone|excuse|break)\b/i.test(adultAction)) {
    functionSignals.push('escape');
  }
  if (/\b(gave|hand|let.?have|turn.?on|bought|allow|open)\b/i.test(adultAction)) {
    functionSignals.push('tangible');
  }
  if (/\b(nothing|didn.?t|ignore|left|walk|alone)\b/i.test(adultAction)) {
    functionSignals.push('sensory');
  }

  // Match: what the learner got vs what the adult's action suggested
  const matched = input.whatLearnerGot.filter(fn => functionSignals.includes(fn));

  let likelihood: ReinforcementLikelihood;
  let explanation: string;

  if (gotCount === 0) {
    likelihood = 'unlikely';
    explanation = 'No clear reinforcer was identified. The behavior may not have been reinforced in this instance.';
  } else if (matched.length > 0) {
    likelihood = 'yes';
    explanation = `Your response likely reinforced the behavior by providing ${matched.map(f => FUNCTION_LABELS[f].toLowerCase()).join(' and ')}. The Learner got what the behavior was designed to get.`;
  } else if (gotCount > 0) {
    likelihood = 'possibly';
    explanation = `The Learner received ${input.whatLearnerGot.map(f => FUNCTION_LABELS[f].toLowerCase()).join(', ')}, which may have reinforced the behavior even if it wasn't the primary function.`;
  } else {
    likelihood = 'unlikely';
    explanation = 'Based on the information provided, the behavior was likely not reinforced.';
  }

  const whatToDoInstead = getWhatToDoInstead(input.whatLearnerGot, matched);

  return {
    likelihood,
    label: likelihood === 'yes' ? 'Yes, likely reinforced' : likelihood === 'possibly' ? 'Possibly reinforced' : 'Unlikely reinforced',
    explanation,
    whatToDoInstead,
    matchedFunctions: matched.length > 0 ? matched : input.whatLearnerGot,
  };
}

function getWhatToDoInstead(got: BehaviorFunction[], matched: BehaviorFunction[]): string[] {
  const tips: string[] = [];
  const relevant = matched.length > 0 ? matched : got;

  if (relevant.includes('attention')) {
    tips.push('Avoid giving attention (eye contact, talking, reacting) during the behavior. Wait for calm, then engage.');
    tips.push('Give frequent, scheduled attention throughout the day so the Learner doesn\'t need to "earn" it through behaviors.');
  }
  if (relevant.includes('escape')) {
    tips.push('Keep the demand in place. Use a calm, neutral tone: "I know this is hard. We\'ll do it together."');
    tips.push('After calm, offer a supported version of the task or a brief break — but only if they ask appropriately.');
  }
  if (relevant.includes('tangible')) {
    tips.push('Don\'t give the item during or immediately after the behavior. Redirect to an appropriate request.');
    tips.push('Use "first-then" language: "First we finish X, then you can have Y."');
  }
  if (relevant.includes('sensory')) {
    tips.push('Offer an appropriate sensory alternative that meets the same need (fidget, movement break, chewy).');
    tips.push('Build sensory breaks into the daily routine to reduce the need for self-stimulation.');
  }

  if (tips.length === 0) {
    tips.push('Stay consistent with your response. Inconsistency can accidentally reinforce behaviors.');
    tips.push('Focus on teaching a replacement skill that gets the Learner what they need appropriately.');
  }

  return tips;
}

// ─── Dropdown option sets ────────────────────────────────

export const ANTECEDENT_OPTIONS = [
  { value: 'social-withdrawal', label: 'Adult was busy / not paying attention' },
  { value: 'demand-placed', label: 'A demand or task was given' },
  { value: 'item-denied', label: 'An item or activity was denied' },
  { value: 'sensory-environment', label: 'Environment was overstimulating/understimulating' },
  { value: 'transition', label: 'A transition was occurring' },
  { value: 'unstructured', label: 'Unstructured / free time' },
];

export const BEHAVIOR_OPTIONS = [
  { value: 'verbal-outburst', label: 'Verbal outburst (yelling, crying, whining)' },
  { value: 'physical-aggression', label: 'Physical aggression (hitting, kicking, biting)' },
  { value: 'self-stimulatory', label: 'Self-stimulatory behavior (rocking, flapping, spinning)' },
  { value: 'elopement', label: 'Elopement (running away, leaving area)' },
  { value: 'property-destruction', label: 'Property destruction (throwing, breaking)' },
  { value: 'non-compliance', label: 'Non-compliance (refusing, ignoring directions)' },
];

export const CONSEQUENCE_OPTIONS = [
  { value: 'adult-attention', label: 'Adult gave attention (talked, comforted, redirected)' },
  { value: 'demand-removed', label: 'Demand was removed or reduced' },
  { value: 'item-given', label: 'Item or activity was provided' },
  { value: 'sensory-input', label: 'Sensory input changed (quieter, moved, etc.)' },
];
