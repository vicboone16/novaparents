/**
 * Behavior Function Scoring Engine
 * ─────────────────────────────────
 * Deterministic scoring — no AI. Ranks the four functions
 * (attention, escape, tangible, sensory) based on structured
 * toggle inputs and keyword matching in free-text fields.
 *
 * Updated: +2 fixed weights, context modifiers, adult relief,
 * confidence rules per spec, function-response alignment.
 */

export type BehaviorFunction = 'attention' | 'escape' | 'tangible' | 'sensory';

export interface StructuredToggles {
  attentionGiven: boolean;
  demandRemoved: boolean;
  accessProvided: boolean;
  sensoryChange: boolean;
  attentionIntense?: boolean;     // "Was attention extended or intense?"
  demandContext?: boolean;        // antecedent includes demand context
}

export interface AdultReliefSelections {
  arguingStopped: boolean;
  noiseStopped: boolean;
  taskEnded: boolean;
  feltRelief: boolean;
  nothingChanged: boolean;
}

export interface FunctionInput {
  antecedent: string;
  antecedentCategory: string;
  behavior: string;
  behaviorCategory: string;
  consequence: string;
  consequenceCategory: string;
  toggles: StructuredToggles;
  adultRelief?: AdultReliefSelections;
}

export interface FunctionRanking {
  function: BehaviorFunction;
  score: number;
  confidence: 'high' | 'moderate' | 'low' | 'mixed';
  label: string;
  clinicalTerm: string;
}

export interface FunctionResult {
  rankings: FunctionRanking[];
  topFunction: BehaviorFunction;
  secondaryFunction: BehaviorFunction | null;
  isMixed: boolean;
  overallConfidence: 'high' | 'moderate' | 'low' | 'mixed';
  suggestedResponse: string[];
  explanation: string;
  alignmentFeedback: string;
  adultReliefFlag: boolean;
  needsClarification: boolean;
  clarificationQuestion: string | null;
}

// ─── Dual labels ─────────────────────────────────────────

export const FUNCTION_LABELS: Record<BehaviorFunction, string> = {
  attention: 'Attention (Getting a Reaction)',
  escape: 'Escape (Avoiding / Getting Out Of)',
  tangible: 'Access (Getting Something)',
  sensory: 'Sensory (Body Need / Automatic)',
};

export const FUNCTION_CLINICAL_TERMS: Record<BehaviorFunction, string> = {
  attention: 'attention-maintained behavior',
  escape: 'escape-maintained behavior',
  tangible: 'tangible-maintained behavior',
  sensory: 'automatic reinforcement',
};

// ─── Inline ⓘ content ───────────────────────────────────

export const FUNCTION_INFO: Record<BehaviorFunction, { summary: string; bullets: string[] }> = {
  attention: {
    summary: "Attention doesn't only mean praise. It can include:",
    bullets: [
      'Talking about the behavior',
      'Explaining why it was wrong',
      'Negotiating',
      'Eye contact',
      'Arguing',
      'Comforting',
      'Lecturing',
      'Even negative attention can strengthen behavior.',
    ],
  },
  escape: {
    summary: 'Escape means getting out of something. It can include:',
    bullets: [
      'Homework',
      'Cleaning up',
      'Getting dressed',
      'Transitioning',
      'Waiting',
      'Sharing',
      'Stopping a preferred activity',
      'Difficult conversations',
      'If the task stopped — even briefly — that can strengthen the behavior.',
    ],
  },
  tangible: {
    summary: 'Access means gaining something preferred. It can include:',
    bullets: [
      'iPad / tablet / phone',
      'Toys',
      'Snacks or food',
      'TV or screens',
      'Going outside',
      'Special items or extra time',
      'If the behavior resulted in getting the item — even after a delay — it may strengthen it.',
    ],
  },
  sensory: {
    summary: 'Some behaviors feel good or regulate the body. Examples:',
    bullets: [
      'Rocking or spinning',
      'Humming or repeating words',
      'Flapping or tapping',
      'Chewing or mouthing',
      "These behaviors don't always depend on others.",
    ],
  },
};

export const DEMAND_INFO = {
  summary: "A demand doesn't have to sound strict. It can include:",
  bullets: [
    '"Time to clean up."',
    '"Put your shoes on."',
    '"Let\'s go."',
    '"Turn that off."',
    '"Wait a minute."',
    '"Share."',
    'Even simple instructions count as demands.',
  ],
};

export const ATTENTION_INTENSE_INFO = {
  summary: 'Extended attention includes:',
  bullets: [
    'Long explanations',
    'Repeated reminders',
    'Emotional reactions',
    'Back-and-forth arguing',
    'This helps CoachBot understand patterns more clearly.',
  ],
};

// ─── Keyword banks ───────────────────────────────────────

const ATTENTION_ANTECEDENT = /\b(alone|ignored|busy|phone|sibling|not.?looking|turned.?away|talking.?to|left.?room)\b/i;
const ATTENTION_BEHAVIOR = /\b(call|yell|scream|cry|whine|tug|tap|follow|cling|act.?out|tantrum|hit|throw|loud)\b/i;
const ATTENTION_CONSEQUENCE = /\b(look|talk|comfort|hug|pick.?up|respond|attention|came.?over|said|told)\b/i;

const ESCAPE_ANTECEDENT = /\b(demand|task|homework|chore|clean|brush|bath|transition|asked.?to|told.?to|time.?to|instruction|worksheet|work|wait|stop|share)\b/i;
const ESCAPE_BEHAVIOR = /\b(run|leave|hide|refuse|say.?no|drop|push.?away|cry|scream|tantrum|flop|fall|shut.?down|elope)\b/i;
const ESCAPE_CONSEQUENCE = /\b(stop|removed|didn.?t.?have.?to|break|let.?go|gave.?up|left.?alone|postpone|delay|excuse)\b/i;

const TANGIBLE_ANTECEDENT = /\b(denied|told.?no|can.?t.?have|taken.?away|turn|share|want|see|store|screen|ipad|tablet|phone|toy|food|candy|snack)\b/i;
const TANGIBLE_BEHAVIOR = /\b(grab|reach|snatch|scream|cry|tantrum|hit|throw|demand|point|beg|whine|take)\b/i;
const TANGIBLE_CONSEQUENCE = /\b(gave|got|received|handed|access|allowed|opened|turned.?on|let.?have|bought)\b/i;

const SENSORY_ANTECEDENT = /\b(loud|bright|crowd|texture|tag|seam|smell|temperature|hot|cold|wet|tight|itchy|noisy|quiet|dark|boring)\b/i;
const SENSORY_BEHAVIOR = /\b(rock|flap|spin|hum|cover.?ear|close.?eye|mouth|chew|bite|squeeze|rub|scratch|stim|fidget|jump|bounce)\b/i;
const SENSORY_CONSEQUENCE = /\b(continue|kept|didn.?t.?stop|self|automatic|alone|no.?one|internal|feel|calm|relief)\b/i;

// ─── Category boosts (lighter — toggles are primary) ─────

const ANTECEDENT_CATEGORIES: Record<string, Partial<Record<BehaviorFunction, number>>> = {
  'social-withdrawal': { attention: 1 },
  'demand-placed': { escape: 1 },
  'item-denied': { tangible: 1 },
  'sensory-environment': { sensory: 1 },
  'transition': { escape: 1 },
  'unstructured': { attention: 1, sensory: 1 },
};

const BEHAVIOR_CATEGORIES: Record<string, Partial<Record<BehaviorFunction, number>>> = {
  'verbal-outburst': { attention: 1, escape: 1 },
  'physical-aggression': { escape: 1, tangible: 1 },
  'self-stimulatory': { sensory: 2 },
  'elopement': { escape: 1 },
  'property-destruction': { tangible: 1, escape: 1 },
  'non-compliance': { escape: 1 },
};

const CONSEQUENCE_CATEGORIES: Record<string, Partial<Record<BehaviorFunction, number>>> = {
  'adult-attention': { attention: 1 },
  'demand-removed': { escape: 1 },
  'item-given': { tangible: 1 },
  'sensory-input': { sensory: 1 },
};

// ─── Scoring ─────────────────────────────────────────────

export function scoreFunctions(input: FunctionInput): FunctionResult {
  const scores: Record<BehaviorFunction, number> = {
    attention: 0,
    escape: 0,
    tangible: 0,
    sensory: 0,
  };

  // 1. Toggle scoring — fixed +2 per spec
  if (input.toggles.attentionGiven) scores.attention += 2;
  if (input.toggles.demandRemoved) scores.escape += 2;
  if (input.toggles.accessProvided) scores.tangible += 2;
  if (input.toggles.sensoryChange) scores.sensory += 2;

  // 2. Context modifiers (fixed +1)
  // Demand context: +1 escape if demand context confirmed AND demand removed selected
  const hasDemandContext = input.toggles.demandContext || ESCAPE_ANTECEDENT.test(input.antecedent);
  if (hasDemandContext && input.toggles.demandRemoved) {
    scores.escape += 1;
  }
  // Attention intensity: +1 attention
  if (input.toggles.attentionIntense) {
    scores.attention += 1;
  }

  // 3. Dropdown category scoring (light boost)
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

  // 4. Keyword matching in free text (light +1)
  const ant = input.antecedent;
  const beh = input.behavior;
  const con = input.consequence;

  if (ATTENTION_ANTECEDENT.test(ant)) scores.attention += 1;
  if (ATTENTION_BEHAVIOR.test(beh)) scores.attention += 1;
  if (ATTENTION_CONSEQUENCE.test(con)) scores.attention += 1;

  if (ESCAPE_ANTECEDENT.test(ant)) scores.escape += 1;
  if (ESCAPE_BEHAVIOR.test(beh)) scores.escape += 1;
  if (ESCAPE_CONSEQUENCE.test(con)) scores.escape += 1;

  if (TANGIBLE_ANTECEDENT.test(ant)) scores.tangible += 1;
  if (TANGIBLE_BEHAVIOR.test(beh)) scores.tangible += 1;
  if (TANGIBLE_CONSEQUENCE.test(con)) scores.tangible += 1;

  if (SENSORY_ANTECEDENT.test(ant)) scores.sensory += 1;
  if (SENSORY_BEHAVIOR.test(beh)) scores.sensory += 1;
  if (SENSORY_CONSEQUENCE.test(con)) scores.sensory += 1;

  // 5. Rank
  const ranked = (Object.entries(scores) as [BehaviorFunction, number][])
    .sort((a, b) => b[1] - a[1]);

  const primary = ranked[0];
  const secondary = ranked[1];
  const diff = primary[1] - secondary[1];
  const isMixed = primary[1] > 0 && diff === 0;

  // Confidence per spec
  let overallConfidence: 'high' | 'moderate' | 'low' | 'mixed';
  if (isMixed) {
    overallConfidence = 'mixed';
  } else if (primary[1] >= 4 && diff >= 2) {
    overallConfidence = 'high';
  } else if (primary[1] >= 3 && diff >= 1) {
    overallConfidence = 'moderate';
  } else if (ranked.every(r => r[1] <= 2)) {
    overallConfidence = 'low';
  } else {
    overallConfidence = 'low';
  }

  // Clarification question for low/mixed
  let needsClarification = overallConfidence === 'low' || overallConfidence === 'mixed';
  let clarificationQuestion: string | null = null;
  if (needsClarification) {
    if (isMixed) {
      clarificationQuestion = `It looks like both ${FUNCTION_LABELS[primary[0]]} and ${FUNCTION_LABELS[secondary[0]]} scored equally. Which outcome seemed most important to the Learner — the reaction, the escape, the item, or the sensation?`;
    } else {
      clarificationQuestion = "I don't have enough information yet to confidently identify the function. Would you like to answer one more question?";
    }
  }

  const rankings: FunctionRanking[] = ranked.map(([fn, score]) => ({
    function: fn,
    score,
    confidence: fn === primary[0] ? overallConfidence : getIndividualConfidence(score, primary[1]),
    label: FUNCTION_LABELS[fn],
    clinicalTerm: FUNCTION_CLINICAL_TERMS[fn],
  }));

  const top = primary[0];
  const sec = secondary[1] > 0 ? secondary[0] : null;

  // Adult relief flag
  const adultReliefFlag = input.adultRelief
    ? (input.adultRelief.arguingStopped || input.adultRelief.noiseStopped || input.adultRelief.taskEnded || input.adultRelief.feltRelief)
    : false;

  return {
    rankings,
    topFunction: top,
    secondaryFunction: sec,
    isMixed,
    overallConfidence,
    suggestedResponse: getSuggestedResponse(top),
    explanation: getExplanation(top, sec, isMixed, overallConfidence, input, adultReliefFlag),
    alignmentFeedback: getAlignmentFeedback(top, input),
    adultReliefFlag,
    needsClarification,
    clarificationQuestion,
  };
}

function getIndividualConfidence(score: number, primaryScore: number): 'high' | 'moderate' | 'low' | 'mixed' {
  if (score === primaryScore) return 'mixed';
  if (score >= 3) return 'moderate';
  return 'low';
}

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
        "Keep the demand in place — don't remove it in response to the behavior.",
        'Offer a structured break or a simpler version of the task.',
        'Teach your Learner to ask for help or a break using words, a card, or a gesture.',
      ];
    case 'tangible':
      return [
        "Stay consistent — don't give the item in response to the behavior.",
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

function getExplanation(
  top: BehaviorFunction,
  sec: BehaviorFunction | null,
  isMixed: boolean,
  confidence: string,
  input: FunctionInput,
  adultReliefFlag: boolean,
): string {
  const parts: string[] = [];

  if (isMixed && sec) {
    parts.push(`It looks like this behavior may serve more than one purpose. Right now, ${FUNCTION_LABELS[top]} and ${FUNCTION_LABELS[sec]} both appear likely. When behaviors work in multiple ways, they can grow faster. Let's focus on the strongest pattern first.`);
  } else if (confidence === 'low') {
    parts.push("We don't have enough information to confidently identify a single function yet. Consider tracking a few more instances.");
  } else {
    switch (top) {
      case 'attention':
        parts.push("There's a chance this behavior is strengthened by the reaction it gets — even negative attention counts.");
        if (input.toggles.attentionGiven) parts.push('Attention was given after the behavior occurred.');
        if (input.toggles.attentionIntense) parts.push('The attention was extended or intense, which can make the pattern stronger.');
        break;
      case 'escape':
        parts.push("There's a chance this behavior is strengthened by avoiding or getting out of a demand.");
        if (input.toggles.demandRemoved) parts.push('The demand was removed or reduced after the behavior.');
        break;
      case 'tangible':
        parts.push("There's a chance this behavior is strengthened by gaining access to a preferred item or activity.");
        if (input.toggles.accessProvided) parts.push('Access to the item/activity was provided after the behavior.');
        break;
      case 'sensory':
        parts.push("There's a chance this behavior serves a sensory or body-regulation need.");
        if (input.toggles.sensoryChange) parts.push('A sensory change occurred during or after the behavior.');
        break;
    }
  }

  if (adultReliefFlag) {
    parts.push("Noticing that your response brought you some relief doesn't mean you did anything wrong. It just helps us understand the full behavior loop.");
  }

  return parts.join(' ');
}

// ─── Function-Response Alignment ─────────────────────────

function getAlignmentFeedback(fn: BehaviorFunction, input: FunctionInput): string {
  switch (fn) {
    case 'attention':
      return 'For attention-maintained behaviors, planned attention and differential attention work well. Reinforce calm bids for attention. Ignoring may help depending on safety — but always prioritize connection.';
    case 'escape':
      return "Your response might work better for a different function. If this behavior is about avoiding something, ignoring alone is often insufficient. Consider breaking the task into smaller steps, offering choices, or teaching your Learner to ask for a break.";
    case 'tangible':
      return "For access-maintained behaviors, negotiation can sometimes strengthen the pattern. Try structured access: visual timers, first-then boards, and reinforcing appropriate requests.";
    case 'sensory':
      return "For sensory-driven behaviors, the key is providing alternatives that meet the same need. Teach regulation strategies and consider adjusting the environment when possible.";
  }
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
  confidence: 'high' | 'moderate' | 'low' | 'mixed';
  alignmentFeedback: string;
}

export function checkReinforcement(input: ReinforcementInput): ReinforcementResult {
  const gotCount = input.whatLearnerGot.length;

  const adultAction = input.whatYouDid.toLowerCase();
  const functionSignals: BehaviorFunction[] = [];

  if (/\b(talk|said|look|comfort|hug|pick|respond|came|went.?to|yell|lecture|argue)\b/i.test(adultAction)) {
    functionSignals.push('attention');
  }
  if (/\b(stop|let|gave.?up|remove|didn.?t.?make|postpone|excuse|break|fine|never.?mind)\b/i.test(adultAction)) {
    functionSignals.push('escape');
  }
  if (/\b(gave|hand|let.?have|turn.?on|bought|allow|open|5.?more.?minute)\b/i.test(adultAction)) {
    functionSignals.push('tangible');
  }
  if (/\b(nothing|didn.?t|ignore|left|walk|alone)\b/i.test(adultAction)) {
    functionSignals.push('sensory');
  }

  const matched = input.whatLearnerGot.filter(fn => functionSignals.includes(fn));

  let likelihood: ReinforcementLikelihood;
  let explanation: string;
  let confidence: 'high' | 'moderate' | 'low' | 'mixed';

  if (gotCount === 0) {
    likelihood = 'unlikely';
    confidence = 'low';
    explanation = 'No clear reinforcer was identified. The behavior may not have been reinforced in this instance.';
  } else if (matched.length > 0) {
    likelihood = 'yes';
    confidence = matched.length >= 2 ? 'high' : 'moderate';
    explanation = `There's a chance your response strengthened the behavior by providing ${matched.map(f => FUNCTION_LABELS[f].toLowerCase()).join(' and ')}. Let's try a small adjustment.`;
  } else if (gotCount > 0) {
    likelihood = 'possibly';
    confidence = 'low';
    explanation = `The Learner received ${input.whatLearnerGot.map(f => FUNCTION_LABELS[f].toLowerCase()).join(', ')}, which may have strengthened the behavior even if it wasn't the primary function.`;
  } else {
    likelihood = 'unlikely';
    confidence = 'low';
    explanation = 'Based on the information provided, the behavior was likely not reinforced.';
  }

  const whatToDoInstead = getWhatToDoInstead(input.whatLearnerGot, matched);
  const primaryFn = matched.length > 0 ? matched[0] : input.whatLearnerGot[0];
  const alignmentFeedback = primaryFn ? getAlignmentFeedback(primaryFn, { toggles: {} } as any) : '';

  return {
    likelihood,
    label: likelihood === 'yes' ? 'Yes, likely reinforced' : likelihood === 'possibly' ? 'Possibly reinforced' : 'Unlikely reinforced',
    explanation,
    whatToDoInstead,
    matchedFunctions: matched.length > 0 ? matched : input.whatLearnerGot,
    confidence,
    alignmentFeedback,
  };
}

function getWhatToDoInstead(got: BehaviorFunction[], matched: BehaviorFunction[]): string[] {
  const tips: string[] = [];
  const relevant = matched.length > 0 ? matched : got;

  if (relevant.includes('attention')) {
    tips.push('Avoid giving attention (eye contact, talking, reacting) during the behavior. Wait for calm, then engage.');
    tips.push("Give frequent, scheduled attention throughout the day so the Learner doesn't need to \"earn\" it through behaviors.");
  }
  if (relevant.includes('escape')) {
    tips.push('Keep the demand in place. Use a calm, neutral tone: "I know this is hard. We\'ll do it together."');
    tips.push('After calm, offer a supported version of the task or a brief break — but only if they ask appropriately.');
  }
  if (relevant.includes('tangible')) {
    tips.push("Don't give the item during or immediately after the behavior. Redirect to an appropriate request.");
    tips.push('Use "first-then" language: "First we finish X, then you can have Y."');
  }
  if (relevant.includes('sensory')) {
    tips.push('Offer an appropriate sensory alternative that meets the same need (fidget, movement break, chewy).');
    tips.push('Build sensory breaks into the daily routine to reduce the need for self-stimulation.');
  }

  if (tips.length === 0) {
    tips.push('Stay consistent with your response. Inconsistency can accidentally strengthen behaviors.');
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
