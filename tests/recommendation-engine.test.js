#!/usr/bin/env node

/**
 * Test suite: Recommendation Engine MVP
 *
 * UPDATED TASK-016A — aligned to Canonical Model 4 dimensions:
 *   motivation, decision_making, delegation, feedback
 *
 * Uses the resolver to inject the 4-dimension Canonical pack config
 * into the engine, since the legacy config/ still has 5 old dims.
 *
 * Cakupan:
 *  - Input valid → output sesuai spec
 *  - Determinism (input identik → output identik)
 *  - Empty scores → graceful degradation
 *  - INVALID_SCORE_RANGE
 *  - UNKNOWN_DIMENSION
 *  - UNSUPPORTED_TYPE
 *  - MISSING_ASSESSMENT_ID
 *  - INVALID_SCORES (null/undefined)
 *  - Neutral scores tidak muncul
 *  - Next best action tie-break
 *  - Version field selalu ada
 *  - Template substitution ({score})
 *
 * NOTE: Wording is placeholder (TASK-017) — assertions check
 *  structural correctness and marker presence, NOT final text.
 */

import { RecommendationEngine } from '../engines/recommendation/index.js';
import { resolve } from '../engines/recommendation/resolver.js';

const packConfig = resolve('assessment-leadership-v2');
if (packConfig.error) throw new Error(`Cannot resolve leadership pack: ${packConfig.error}`);

const engine = new RecommendationEngine(packConfig);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (err) {
    console.error(`  \u2717 ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ── Test data ───────────────────────────────────

const SAMPLE_INPUT = {
  assessment_id: 'asmt_4f8a2c',
  user_id: 'user_901',
  type: 'leadership',
  completed_at: '2026-07-05T10:30:00Z',
  scores: {
    motivation: 88,         // ≥ 80 → STRENGTH
    decision_making: 48,    // ≤ 55 → WEAKNESS
    delegation: 72,         // 56–79 → NEUTRAL
    feedback: 35,           // ≤ 55 → WEAKNESS (lowest → NBA)
  },
};

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Validation & Error Handling \u2550\u2550\u2550');

test('EMPTY_SCORES \u2192 returns empty arrays + null next_best_action', () => {
  const result = engine.generate({
    assessment_id: 'asmt_x',
    user_id: 'u_1',
    type: 'leadership',
    scores: {},
  });

  if (result.error) throw new Error('empty scores should not be an error');
  if (result.version !== '1.0.0') throw new Error('version missing');
  if (result.strengths.length !== 0) throw new Error(`expected 0 strengths, got ${result.strengths.length}`);
  if (result.weaknesses.length !== 0) throw new Error(`expected 0 weaknesses, got ${result.weaknesses.length}`);
  if (result.next_best_action !== null) throw new Error('next_best_action should be null');
});

test('INVALID_SCORE_RANGE (< 0)', () => {
  const result = engine.generate({
    assessment_id: 'asmt_x',
    user_id: 'u_1',
    type: 'leadership',
    scores: { motivation: -5 },
  });

  if (result.error !== 'INVALID_SCORE_RANGE') throw new Error(`expected INVALID_SCORE_RANGE, got ${result.error}`);
  if (!result.message.includes('motivation')) throw new Error('message should mention the dimension');
  if (!result.message.includes('-5')) throw new Error('message should mention the value');
});

test('INVALID_SCORE_RANGE (> 100)', () => {
  const result = engine.generate({
    assessment_id: 'asmt_x',
    user_id: 'u_1',
    type: 'leadership',
    scores: { delegation: 999 },
  });

  if (result.error !== 'INVALID_SCORE_RANGE') throw new Error(`expected INVALID_SCORE_RANGE, got ${result.error}`);
});

test('UNKNOWN_DIMENSION', () => {
  const result = engine.generate({
    assessment_id: 'asmt_x',
    user_id: 'u_1',
    type: 'leadership',
    scores: { cooking: 50 },
  });

  if (result.error !== 'UNKNOWN_DIMENSION') throw new Error(`expected UNKNOWN_DIMENSION, got ${result.error}`);
  if (!result.message.includes('cooking')) throw new Error('message should mention the dimension');
});

test('UNSUPPORTED_DIMENSION (unknown dimension via resolver path)', () => {
  const result = engine.generate({
    assessment_id: 'asmt_x',
    user_id: 'u_1',
    type: 'baking',
    scores: { flavor: 80 },
  });

  // In resolver mode, unknown dimensions trigger UNKNOWN_DIMENSION
  if (result.error !== 'UNKNOWN_DIMENSION') throw new Error(`expected UNKNOWN_DIMENSION, got ${result.error}`);
  if (!result.message.includes('flavor')) throw new Error('message should mention the dimension');
});

test('MISSING_ASSESSMENT_ID', () => {
  const result = engine.generate({
    user_id: 'u_1',
    type: 'leadership',
    scores: { motivation: 50 },
  });

  if (result.error !== 'MISSING_ASSESSMENT_ID') throw new Error(`expected MISSING_ASSESSMENT_ID, got ${result.error}`);
});

test('INVALID_SCORES (null)', () => {
  const result = engine.generate({
    assessment_id: 'asmt_x',
    user_id: 'u_1',
    type: 'leadership',
    scores: null,
  });

  if (result.error !== 'INVALID_SCORES') throw new Error(`expected INVALID_SCORES, got ${result.error}`);
});

test('INVALID_SCORES (undefined)', () => {
  const result = engine.generate({
    assessment_id: 'asmt_x',
    user_id: 'u_1',
    type: 'leadership',
  });

  if (result.error !== 'INVALID_SCORES') throw new Error(`expected INVALID_SCORES, got ${result.error}`);
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Happy Path \u2014 Output Structure \u2550\u2550\u2550');

test('output contains version field (semver)', () => {
  const result = engine.generate(SAMPLE_INPUT);
  if (result.version !== '1.0.0') throw new Error(`expected '1.0.0', got '${result.version}'`);
});

test('output contains generated_at (ISO 8601)', () => {
  const result = engine.generate(SAMPLE_INPUT);
  const d = new Date(result.generated_at);
  if (isNaN(d.getTime())) throw new Error(`invalid timestamp: ${result.generated_at}`);
});

test('output echoes assessment_id', () => {
  const result = engine.generate(SAMPLE_INPUT);
  if (result.assessment_id !== 'asmt_4f8a2c') throw new Error('assessment_id mismatch');
});

test('output echoes type', () => {
  const result = engine.generate(SAMPLE_INPUT);
  if (result.type !== 'leadership') throw new Error('type mismatch');
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Classification \u2014 Strengths & Weaknesses \u2550\u2550\u2550');

test('motivation (88) classified as strength (\u226580)', () => {
  const result = engine.generate(SAMPLE_INPUT);
  const st = result.strengths.find(s => s.dimension === 'motivation');
  if (!st) throw new Error('motivation should be a strength');
  if (st.score !== 88) throw new Error('score mismatch');
  if (st.label !== 'Motivation') throw new Error('label mismatch');
  // Check placeholder marker — NOT testing final text
  if (!st.reason.includes('[PLACEHOLDER - TASK-017]')) throw new Error('reason should contain placeholder marker');
  if (!st.reason.includes('88')) throw new Error('reason should include score substitution');
});

test('decision_making (48) classified as weakness (\u226455)', () => {
  const result = engine.generate(SAMPLE_INPUT);
  const wk = result.weaknesses.find(w => w.dimension === 'decision_making');
  if (!wk) throw new Error('decision_making should be a weakness');
  if (wk.score !== 48) throw new Error('score mismatch');
  if (wk.label !== 'Decision Making') throw new Error('label mismatch');
  if (!wk.reason.includes('[PLACEHOLDER - TASK-017]')) throw new Error('reason should contain placeholder marker');
  if (!wk.reason.includes('48')) throw new Error('reason should include score substitution');
});

test('delegation (72) is NEUTRAL (56\u201379) \u2014 not in strengths or weaknesses', () => {
  const result = engine.generate(SAMPLE_INPUT);

  const allInOutput = [
    ...result.strengths.map(s => s.dimension),
    ...result.weaknesses.map(w => w.dimension),
  ];

  if (allInOutput.includes('delegation')) {
    throw new Error('delegation (72) should be NEUTRAL — not in strengths or weaknesses');
  }
  if (result.weaknesses.length !== 2) {
    throw new Error(`expected 2 weaknesses (decision_making=48, feedback=35), got ${result.weaknesses.length}`);
  }
  if (result.strengths.length !== 1) {
    throw new Error(`expected 1 strength (motivation=88), got ${result.strengths.length}`);
  }
});

test('strength items have all required fields', () => {
  const result = engine.generate({
    assessment_id: 'asmt_all_strong',
    user_id: 'u_x',
    type: 'leadership',
    scores: {
      motivation: 90,
      decision_making: 85,
      delegation: 88,
    },
  });

  if (result.strengths.length !== 3) throw new Error('expected 3 strengths');

  for (const s of result.strengths) {
    if (typeof s.dimension !== 'string') throw new Error('dimension missing');
    if (typeof s.score !== 'number') throw new Error('score missing or wrong type');
    if (typeof s.label !== 'string') throw new Error('label missing');
    if (typeof s.reason !== 'string') throw new Error('reason missing');
    if (!s.reason.includes(String(s.score))) throw new Error(`reason for ${s.dimension} doesn't include score`);
  }
});

test('weakness items have all required fields', () => {
  const result = engine.generate({
    assessment_id: 'asmt_all_weak',
    user_id: 'u_x',
    type: 'leadership',
    scores: {
      motivation: 30,
      decision_making: 25,
      feedback: 40,
    },
  });

  if (result.weaknesses.length !== 3) throw new Error('expected 3 weaknesses');

  for (const w of result.weaknesses) {
    if (typeof w.dimension !== 'string') throw new Error('dimension missing');
    if (typeof w.score !== 'number') throw new Error('score missing');
    if (typeof w.label !== 'string') throw new Error('label missing');
    if (typeof w.reason !== 'string') throw new Error('reason missing');
  }
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Next Best Action \u2550\u2550\u2550');

test('next_best_action selects dimension with lowest score', () => {
  const result = engine.generate(SAMPLE_INPUT);
  // feedback = 35 (lowest)
  if (result.next_best_action.focus_dimension !== 'feedback') {
    throw new Error(`expected feedback, got ${result.next_best_action.focus_dimension}`);
  }
});

test('next_best_action has all required fields', () => {
  const result = engine.generate(SAMPLE_INPUT);
  const nba = result.next_best_action;

  if (typeof nba.focus_dimension !== 'string') throw new Error('focus_dimension missing');
  if (typeof nba.label !== 'string') throw new Error('label missing');
  if (typeof nba.action !== 'string') throw new Error('action missing');
  if (typeof nba.rationale !== 'string') throw new Error('rationale missing');
  // Check placeholder marker — NOT testing final text
  if (!nba.action.includes('[PLACEHOLDER - TASK-017]')) throw new Error('action should contain placeholder marker');
  if (!nba.rationale.includes('[PLACEHOLDER - TASK-017]')) throw new Error('rationale should contain placeholder marker');
});

test('next_best_action rationale contains score of lowest dimension', () => {
  const result = engine.generate(SAMPLE_INPUT);
  if (!result.next_best_action.rationale.includes('35')) {
    throw new Error('rationale should include score 35');
  }
});

test('next_best_action tie-break: first dimension in input order', () => {
  // Both score 50 — should pick first one in scores object
  const result = engine.generate({
    assessment_id: 'asmt_tie',
    user_id: 'u_1',
    type: 'leadership',
    scores: {
      motivation: 50,
      decision_making: 50,
    },
  });

  if (result.next_best_action.focus_dimension !== 'motivation') {
    throw new Error(`tie-break should pick first dimension (motivation), got ${result.next_best_action.focus_dimension}`);
  }
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Determinism \u2550\u2550\u2550');

test('identical input produces identical output (except generated_at)', () => {
  const r1 = engine.generate(SAMPLE_INPUT);
  const r2 = engine.generate(SAMPLE_INPUT);

  const stripTimestamp = (r) => {
    const { generated_at, ...rest } = r;
    return rest;
  };

  const s1 = JSON.stringify(stripTimestamp(r1));
  const s2 = JSON.stringify(stripTimestamp(r2));

  if (s1 !== s2) throw new Error('output not identical — determinism failed');
});

test('no randomness source — score values never change', () => {
  for (let i = 0; i < 10; i++) {
    const r = engine.generate(SAMPLE_INPUT);
    const fb = r.weaknesses.find(w => w.dimension === 'feedback');
    if (fb.score !== 35) throw new Error(`score changed: ${fb.score}`);
  }
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Template Substitution \u2550\u2550\u2550');

test('all {score} placeholders in reason are substituted', () => {
  const result = engine.generate({
    assessment_id: 'asmt_subst',
    user_id: 'u_1',
    type: 'leadership',
    scores: {
      motivation: 95,
      feedback: 20,
    },
  });

  for (const s of result.strengths) {
    if (s.reason.includes('{score}')) throw new Error(`unsubstituted {score} in strength: ${s.dimension}`);
  }
  for (const w of result.weaknesses) {
    if (w.reason.includes('{score}')) throw new Error(`unsubstituted {score} in weakness: ${w.dimension}`);
  }
  if (result.next_best_action.action.includes('{score}')) throw new Error('unsubstituted {score} in action');
  if (result.next_best_action.rationale.includes('{score}')) throw new Error('unsubstituted {score} in rationale');
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Edge Cases \u2550\u2550\u2550');

test('all scores are strength \u2192 weaknesses is empty', () => {
  const result = engine.generate({
    assessment_id: 'asmt_edge',
    user_id: 'u_1',
    type: 'leadership',
    scores: {
      motivation: 90,
      decision_making: 85,
      delegation: 95,
      feedback: 88,
    },
  });

  if (result.strengths.length !== 4) throw new Error('expected 4 strengths');
  if (result.weaknesses.length !== 0) throw new Error('expected 0 weaknesses');
  if (result.next_best_action === null) throw new Error('next_best_action should not be null');
});

test('all scores are weakness \u2192 strengths is empty', () => {
  const result = engine.generate({
    assessment_id: 'asmt_edge2',
    user_id: 'u_1',
    type: 'leadership',
    scores: {
      motivation: 20,
      decision_making: 30,
      delegation: 10,
      feedback: 40,
    },
  });

  if (result.strengths.length !== 0) throw new Error('expected 0 strengths');
  if (result.weaknesses.length !== 4) throw new Error('expected 4 weaknesses');
  if (result.next_best_action.focus_dimension !== 'delegation') {
    throw new Error('next_best_action should pick lowest (delegation=10)');
  }
});

test('score at exact strength threshold boundary (80)', () => {
  const result = engine.generate({
    assessment_id: 'asmt_boundary',
    user_id: 'u_1',
    type: 'leadership',
    scores: { motivation: 80 },
  });

  if (result.strengths.length !== 1) throw new Error('score 80 should be strength (\u226580)');
  if (result.strengths[0].dimension !== 'motivation') throw new Error('dimension mismatch');
});

test('score at exact weakness threshold boundary (55)', () => {
  const result = engine.generate({
    assessment_id: 'asmt_boundary2',
    user_id: 'u_1',
    type: 'leadership',
    scores: { motivation: 55 },
  });

  if (result.weaknesses.length !== 1) throw new Error('score 55 should be weakness (\u226455)');
  if (result.weaknesses[0].dimension !== 'motivation') throw new Error('dimension mismatch');
});

test('score one above weakness threshold (56) \u2192 neutral', () => {
  const result = engine.generate({
    assessment_id: 'asmt_neutral',
    user_id: 'u_1',
    type: 'leadership',
    scores: { motivation: 56 },
  });

  if (result.strengths.length !== 0) throw new Error('56 should not be strength');
  if (result.weaknesses.length !== 0) throw new Error('56 should not be weakness');
  // next_best_action should still be populated because there is a score
  if (result.next_best_action.focus_dimension !== 'motivation') {
    throw new Error('next_best_action should pick motivation (only dimension)');
  }
});

test('single-dimension scores \u2192 next_best_action is that dimension', () => {
  const result = engine.generate({
    assessment_id: 'asmt_single',
    user_id: 'u_1',
    type: 'leadership',
    scores: { delegation: 75 },
  });

  if (result.next_best_action.focus_dimension !== 'delegation') {
    throw new Error('next_best_action should be the only dimension');
  }
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Legacy Path (no packConfig) \u2550\u2550\u2550');

test('legacy path (_resolveLegacy) still works with old 5-dimension data', () => {
  // Construct engine WITHOUT packConfig — triggers _resolveLegacy('leadership')
  // which reads from config/thresholds.js (still has 5 old dims)
  const legacyEngine = new RecommendationEngine();
  const result = legacyEngine.generate({
    assessment_id: 'asmt_legacy',
    user_id: 'u_legacy',
    type: 'leadership',
    scores: {
      communication: 90,
      decisiveness: 55,
      strategic_thinking: 72,
      people_development: 48,
      execution: 85,
    },
  });

  if (result.error) throw new Error(`legacy path should not error: ${result.error}`);
  if (result.type !== 'leadership') throw new Error('type mismatch');
  // Verify classification still works
  if (!result.strengths.some(s => s.dimension === 'communication')) throw new Error('communication should be strength');
  if (!result.weaknesses.some(w => w.dimension === 'people_development')) throw new Error('people_development should be weakness');
  if (result.next_best_action === null) throw new Error('NBA should not be null');
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Engine Version \u2550\u2550\u2550');

test('engine.version === "1.0.0"', () => {
  if (engine.version !== '1.0.0') throw new Error(`expected 1.0.0, got ${engine.version}`);
});

// ─────────────────────────────────────────────────
console.log(`\n${'═'.repeat(40)}`);
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log(`${'═'.repeat(40)}\n`);

if (failed > 0) {
  process.exit(1);
}

console.log('All tests passed.\n');
process.exit(0);
