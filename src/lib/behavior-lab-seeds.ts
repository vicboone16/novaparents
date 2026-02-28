/**
 * Behavior Lab™ — Game Seed Data
 * 12 initial games across Stages 1–3
 */

import { createGame, type LabGame } from '@/lib/behavior-lab-dal';

export const SEED_GAMES: Partial<LabGame>[] = [
  // ─── Stage 1: Foundations ──────────────────────────
  {
    title: 'Function Flash',
    short_description: 'Read a scenario, pick the behavior function.',
    game_key: 'function_flash',
    stage: 1,
    difficulty: 'easy',
    skill_tags: ['function_id'],
    est_seconds: 60,
    scope: 'system',
    status: 'active',
    content: {
      questions: [
        {
          question: 'A learner screams when asked to do math. Mom removes the worksheet. Why does the learner scream?',
          answers: ['To get attention', 'To escape the task', 'To get a toy', 'It feels good'],
          correctIndex: 1,
          rationale: 'The screaming is maintained by removal of the math task — that\'s escape.'
        },
        {
          question: 'A learner bangs the table and Dad immediately looks over and says "Stop!" The behavior increases. What function?',
          answers: ['Escape', 'Attention', 'Tangible', 'Sensory'],
          correctIndex: 1,
          rationale: 'Dad\'s reaction (looking, talking) reinforces the behavior — that\'s attention.'
        },
        {
          question: 'A learner throws a tantrum until given the iPad. What function?',
          answers: ['Attention', 'Escape', 'Tangible', 'Sensory'],
          correctIndex: 2,
          rationale: 'The tantrum produces a specific item (iPad) — that\'s tangible.'
        },
        {
          question: 'A learner rocks back and forth alone in a quiet room with no one watching. What function?',
          answers: ['Attention', 'Escape', 'Tangible', 'Sensory / Automatic'],
          correctIndex: 3,
          rationale: 'No social consequence is needed — the behavior itself produces internal stimulation.'
        },
        {
          question: 'A learner cries when the teacher says "Time for reading." The teacher lets them stay at recess. Why?',
          answers: ['Attention', 'Escape', 'Tangible', 'Sensory'],
          correctIndex: 1,
          rationale: 'Crying removes the reading demand — classic escape function.'
        }
      ]
    }
  },
  {
    title: 'ABC Builder',
    short_description: 'Sort events into Antecedent, Behavior, and Consequence.',
    game_key: 'abc_builder',
    stage: 1,
    difficulty: 'easy',
    skill_tags: ['abc'],
    est_seconds: 90,
    scope: 'system',
    status: 'active',
    content: {
      questions: [
        {
          question: 'Mom says "Time for bed." → Learner screams "No!" → Mom says "Fine, 5 more minutes." Which is the BEHAVIOR?',
          answers: ['Mom says time for bed', 'Learner screams "No!"', 'Mom says fine, 5 more minutes', 'All of the above'],
          correctIndex: 1,
          rationale: 'The behavior is the learner\'s response — screaming "No!" The other two are the A and C.'
        },
        {
          question: 'Teacher asks learner to sit down → Learner throws pencil → Teacher sends learner to the hall. What is the CONSEQUENCE?',
          answers: ['Teacher asks learner to sit', 'Learner throws pencil', 'Teacher sends to hall', 'Learner sits down'],
          correctIndex: 2,
          rationale: 'The consequence is what happens after the behavior — being sent to the hall.'
        },
        {
          question: 'Sibling takes toy → Learner hits sibling → Mom gives toy back to learner. What is the ANTECEDENT?',
          answers: ['Sibling takes the toy', 'Learner hits sibling', 'Mom gives toy back', 'Learner cries'],
          correctIndex: 0,
          rationale: 'The antecedent is what happens right before the behavior — the sibling taking the toy.'
        },
        {
          question: 'Dad says "Do your homework" → Learner whines → Dad does the homework for them. What function does this suggest?',
          answers: ['Attention', 'Escape', 'Tangible', 'Sensory'],
          correctIndex: 1,
          rationale: 'The learner avoided doing homework — the demand was removed.'
        }
      ]
    }
  },
  {
    title: 'Reinforcement Check',
    short_description: 'Decide: was the behavior reinforced? How?',
    game_key: 'reinforcement_check',
    stage: 1,
    difficulty: 'easy',
    skill_tags: ['reinforcement'],
    est_seconds: 60,
    scope: 'system',
    status: 'active',
    content: {
      questions: [
        {
          question: 'A learner cries and Mom picks them up. Crying increases over time. Was crying reinforced?',
          answers: ['Yes — positively reinforced', 'Yes — negatively reinforced', 'No — it was punished', 'Can\'t tell'],
          correctIndex: 0,
          rationale: 'Something was ADDED (being picked up) and the behavior increased — positive reinforcement.'
        },
        {
          question: 'A learner screams during chores. Dad stops asking. Screaming increases. What happened?',
          answers: ['Positive reinforcement', 'Negative reinforcement', 'Positive punishment', 'Extinction'],
          correctIndex: 1,
          rationale: 'Something was REMOVED (the chore demand) and behavior increased — negative reinforcement.'
        },
        {
          question: 'A learner throws food. Mom ignores it completely. Food throwing decreases. What is this?',
          answers: ['Reinforcement', 'Punishment', 'Extinction', 'Shaping'],
          correctIndex: 2,
          rationale: 'The reinforcer (attention) was withheld and the behavior decreased — extinction.'
        },
        {
          question: 'A teacher praises a learner for raising their hand. Hand-raising increases. What type?',
          answers: ['Positive reinforcement', 'Negative reinforcement', 'Punishment', 'Extinction'],
          correctIndex: 0,
          rationale: 'Praise was ADDED after the behavior and it increased — positive reinforcement.'
        }
      ]
    }
  },
  {
    title: 'What Happened Next?',
    short_description: 'Predict the consequence based on the function.',
    game_key: 'what_happened_next',
    stage: 1,
    difficulty: 'medium',
    skill_tags: ['function_id', 'abc'],
    est_seconds: 90,
    scope: 'system',
    status: 'active',
    content: {
      questions: [
        {
          question: 'Function: Escape. A learner cries when given a worksheet. What consequence MAINTAINS this behavior?',
          answers: ['Teacher removes the worksheet', 'Teacher gives a sticker', 'Teacher ignores crying', 'Peers laugh'],
          correctIndex: 0,
          rationale: 'For escape, the maintaining consequence is removal of the demand.'
        },
        {
          question: 'Function: Attention. A learner makes silly noises in class. What consequence MAINTAINS this behavior?',
          answers: ['Teacher removes the task', 'Teacher ignores it', 'Peers laugh and teacher says "Stop!"', 'Learner gets a toy'],
          correctIndex: 2,
          rationale: 'Social reactions (laughter, verbal response) maintain attention-seeking behavior.'
        },
        {
          question: 'Function: Tangible. A learner screams in the store. What consequence MAINTAINS this behavior?',
          answers: ['Parent gives the candy', 'Parent removes the learner from the store', 'Parent ignores it', 'Learner calms on their own'],
          correctIndex: 0,
          rationale: 'For tangible function, the maintaining consequence is gaining the desired item.'
        }
      ]
    }
  },

  // ─── Stage 2: Skill Building ───────────────────────
  {
    title: 'Pattern Spotter',
    short_description: 'Identify repeating behavior patterns across scenarios.',
    game_key: 'pattern_spotter',
    stage: 2,
    difficulty: 'medium',
    skill_tags: ['pattern', 'function_id'],
    est_seconds: 120,
    scope: 'system',
    status: 'active',
    content: {
      questions: [
        {
          question: 'Monday: Learner hits during math. Wednesday: Learner cries during reading. Friday: Learner runs away during writing. What\'s the pattern?',
          answers: ['Attention-seeking across days', 'Escape from academic demands', 'Sensory-seeking in the classroom', 'Tangible — wants toys'],
          correctIndex: 1,
          rationale: 'The common pattern is escape — all behaviors occur during academic tasks.'
        },
        {
          question: 'At home, learner tantrums when told "no." At school, learner yells when denied iPad. At store, learner cries when told "not today." Pattern?',
          answers: ['Escape from demands', 'Tangible denial', 'Attention from adults', 'Sensory overload'],
          correctIndex: 1,
          rationale: 'All behaviors occur when a desired item/activity is denied — tangible function.'
        },
        {
          question: 'Learner only hits siblings, never teachers. Hits increase when parents lecture. What does this suggest?',
          answers: ['The behavior is sensory', 'It\'s maintained by parental attention', 'It\'s escape from school', 'The learner dislikes siblings'],
          correctIndex: 1,
          rationale: 'The behavior is specific to settings where parental attention follows — attention function.'
        }
      ]
    }
  },
  {
    title: 'Replacement Match',
    short_description: 'Match the behavior function to the right replacement skill.',
    game_key: 'replacement_match',
    stage: 2,
    difficulty: 'medium',
    skill_tags: ['replacement', 'function_id'],
    est_seconds: 90,
    scope: 'system',
    status: 'active',
    content: {
      questions: [
        {
          question: 'Function: Escape. The learner screams to avoid chores. Best replacement skill?',
          answers: ['Teach them to ask for a break', 'Give them a sticker for screaming less', 'Ignore the screaming', 'Remove all chores'],
          correctIndex: 0,
          rationale: 'The replacement must serve the same function — asking for a break is an appropriate way to escape briefly.'
        },
        {
          question: 'Function: Attention. The learner makes noises in class. Best replacement?',
          answers: ['Teach them to raise their hand', 'Remove them from class', 'Give them headphones', 'Take away recess'],
          correctIndex: 0,
          rationale: 'Raising hand is a socially appropriate way to get teacher attention — same function, better form.'
        },
        {
          question: 'Function: Tangible. The learner grabs toys from peers. Best replacement?',
          answers: ['Teach them to ask "Can I have a turn?"', 'Take all toys away', 'Give them the toy immediately', 'Ignore the grabbing'],
          correctIndex: 0,
          rationale: 'Asking for a turn serves the same tangible function with an appropriate communication skill.'
        },
        {
          question: 'Function: Sensory. The learner chews on their shirt collar. Best replacement?',
          answers: ['Provide a chew necklace', 'Tell them to stop', 'Remove all shirts with collars', 'Give them attention when they stop'],
          correctIndex: 0,
          rationale: 'A chew necklace provides the same oral sensory input in an appropriate way.'
        }
      ]
    }
  },
  {
    title: 'Script Builder',
    short_description: 'Choose the best response script for a scenario.',
    game_key: 'script_builder',
    stage: 2,
    difficulty: 'medium',
    skill_tags: ['scripts', 'replacement'],
    est_seconds: 90,
    scope: 'system',
    status: 'active',
    content: {
      questions: [
        {
          question: 'Learner throws toys when told to clean up (escape). What should the adult say?',
          answers: [
            '"I can see you\'re upset. Let\'s do 3 toys together, then you can take a break."',
            '"Stop throwing toys right now!"',
            '"If you throw one more toy, no TV tonight."',
            '"Just leave the toys, I\'ll do it."'
          ],
          correctIndex: 0,
          rationale: 'This script validates feelings, reduces the demand, and builds toward the expectation.'
        },
        {
          question: 'Learner hits to get Mom\'s attention while she\'s on the phone. Best script?',
          answers: [
            '"I need 2 more minutes. When I\'m done, I\'ll play with you. Can you draw while you wait?"',
            '"Don\'t hit me!"',
            '"Go to your room!"',
            '"What do you want?"'
          ],
          correctIndex: 0,
          rationale: 'This provides a time frame, acknowledges the need, and offers an alternative activity.'
        },
        {
          question: 'Learner tantrums for candy at checkout. Best response?',
          answers: [
            '"You can choose one treat when we get home if you help me finish shopping."',
            '"Fine, just take one."',
            '"Stop crying or we\'re leaving!"',
            '"You never get candy."'
          ],
          correctIndex: 0,
          rationale: 'Offers a delay + contingency without reinforcing the tantrum.'
        }
      ]
    }
  },
  {
    title: 'Who Was Reinforced?',
    short_description: 'Identify whether the learner or adult was reinforced.',
    game_key: 'who_reinforced',
    stage: 2,
    difficulty: 'hard',
    skill_tags: ['reinforcement', 'adult_loop'],
    est_seconds: 90,
    scope: 'system',
    status: 'active',
    content: {
      questions: [
        {
          question: 'Learner screams → Mom gives iPad → Learner stops screaming → Mom feels relief. Who was reinforced?',
          answers: ['Only the learner', 'Only the adult', 'Both were reinforced', 'Neither'],
          correctIndex: 2,
          rationale: 'The learner got the iPad (positive reinforcement). Mom\'s giving behavior was reinforced by the screaming stopping (negative reinforcement for Mom).'
        },
        {
          question: 'Learner whines → Dad yells "Be quiet!" → Learner stops briefly → Dad feels he handled it. Who was reinforced?',
          answers: ['Only the learner', 'Only the adult', 'Both', 'Neither'],
          correctIndex: 2,
          rationale: 'The learner got attention (even negative). Dad\'s yelling was reinforced by the brief quiet.'
        },
        {
          question: 'Teacher ignores a learner\'s hand-raising consistently. Hand-raising decreases. What happened to the learner\'s behavior?',
          answers: ['It was reinforced', 'It was punished', 'It underwent extinction', 'It was shaped'],
          correctIndex: 2,
          rationale: 'The reinforcer (teacher attention) was consistently withheld — extinction.'
        }
      ]
    }
  },

  // ─── Stage 3: Advanced ─────────────────────────────
  {
    title: 'Fix the Plan',
    short_description: 'Find the error in a behavior support plan.',
    game_key: 'fix_the_plan',
    stage: 3,
    difficulty: 'hard',
    skill_tags: ['plan_review', 'function_id', 'replacement'],
    est_seconds: 120,
    scope: 'system',
    status: 'active',
    content: {
      questions: [
        {
          question: 'Plan: "When learner hits (escape function), redirect to a calm corner." What\'s wrong?',
          answers: [
            'The calm corner IS escape — it reinforces hitting',
            'The plan should include more punishment',
            'Nothing is wrong',
            'The function is wrong'
          ],
          correctIndex: 0,
          rationale: 'If the function is escape, sending to a calm corner gives exactly what the behavior was seeking.'
        },
        {
          question: 'Plan: "When learner yells for attention, give them 1-on-1 time to calm down." What\'s the error?',
          answers: [
            'Giving 1-on-1 time after yelling reinforces the yelling',
            'The function identification is wrong',
            'This is a perfect plan',
            'There should be a consequence'
          ],
          correctIndex: 0,
          rationale: 'The plan accidentally reinforces the behavior by providing attention after yelling.'
        },
        {
          question: 'Plan: "Teach learner to say \'I want a break\' (tangible function)." What\'s wrong?',
          answers: [
            'The replacement doesn\'t match the function — "break" is escape, not tangible',
            'Nothing is wrong',
            'The learner can\'t talk',
            'Breaks are too rewarding'
          ],
          correctIndex: 0,
          rationale: 'A break serves escape function, not tangible. If the function is tangible, the replacement should help access the desired item.'
        }
      ]
    }
  },
  {
    title: 'Extinction Burst Quiz',
    short_description: 'Predict and manage extinction bursts.',
    game_key: 'extinction_burst',
    stage: 3,
    difficulty: 'hard',
    skill_tags: ['extinction', 'data'],
    est_seconds: 90,
    scope: 'system',
    status: 'active',
    content: {
      questions: [
        {
          question: 'You start ignoring tantrums (previously reinforced by attention). The tantrums get WORSE for 3 days. This is…',
          answers: ['A sign the plan failed', 'An extinction burst — expected and temporary', 'A reason to try something else', 'Spontaneous recovery'],
          correctIndex: 1,
          rationale: 'Extinction bursts are a temporary increase in behavior before it decreases. It means the plan is working.'
        },
        {
          question: 'During an extinction burst, what should the adult do?',
          answers: ['Stay consistent — don\'t reinforce the behavior', 'Add a punishment', 'Give in just this once', 'Switch strategies'],
          correctIndex: 0,
          rationale: 'Consistency is crucial. Giving in during a burst creates intermittent reinforcement — making the behavior harder to extinguish.'
        },
        {
          question: 'After 2 weeks of extinction, the behavior suddenly reappears for one day. This is…',
          answers: ['The plan failing', 'Spontaneous recovery', 'A new function', 'A sign to give up'],
          correctIndex: 1,
          rationale: 'Spontaneous recovery is a brief return of a previously extinguished behavior. Continue the plan and it will decrease again.'
        }
      ]
    }
  },
  {
    title: 'Data Detective',
    short_description: 'Read data patterns and draw conclusions.',
    game_key: 'data_detective',
    stage: 3,
    difficulty: 'hard',
    skill_tags: ['data', 'pattern'],
    est_seconds: 120,
    scope: 'system',
    status: 'active',
    content: {
      questions: [
        {
          question: 'Mon: 5 tantrums. Tue: 8. Wed: 3. Thu: 7. All tantrums happen during transitions. What data type would help most?',
          answers: ['Frequency count only', 'ABC data during transitions', 'Duration of each tantrum', 'Interval recording'],
          correctIndex: 1,
          rationale: 'Since we see a setting pattern (transitions), ABC data will reveal the specific antecedents and consequences.'
        },
        {
          question: 'A learner\'s hitting decreased from 10/day to 2/day over 3 weeks after starting a replacement behavior plan. What does this suggest?',
          answers: ['The plan is working — the replacement is serving the same function', 'The learner just grew out of it', 'The data is wrong', 'We need more punishment'],
          correctIndex: 0,
          rationale: 'A steady decrease alongside replacement behavior training suggests the replacement is meeting the same need.'
        },
        {
          question: 'Data shows: Behavior occurs 80% of the time with Teacher A, 10% with Teacher B. What should you investigate?',
          answers: ['What Teacher A does differently (antecedent/consequence patterns)', 'Whether Teacher B is lying', 'The learner\'s diet', 'Nothing — some teachers are better'],
          correctIndex: 0,
          rationale: 'The dramatic difference by adult suggests different antecedent or consequence patterns across settings.'
        }
      ]
    }
  },
];

/**
 * Seeds games into the database. Call once from admin.
 * Returns number of games successfully inserted.
 */
export async function seedBehaviorLabGames(): Promise<number> {
  let count = 0;
  for (const game of SEED_GAMES) {
    const result = await createGame(game);
    if (result) count++;
  }
  return count;
}
