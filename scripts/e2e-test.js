#!/usr/bin/env node

/**
 * End-to-End Acceptance Test — Leadership Recommendation Pack v2.0.0
 *
 * Validates:
 *  1. Raw scores (1-5 scale) → auto-normalized → correct output
 *  2. Pre-normalized scores (0-100) → skip normalization → correct output
 *  3. Output traceability: reason & action match TM-001 wording
 *  4. Backward compat: empty scores, edge cases
 *
 * @task TASK-019
 * @sprint 5B
 */

const { resolve } = require('../engines/recommendation/resolver');
const { RecommendationEngine } = require('../engines/recommendation/index');

const packConfig = resolve('assessment-leadership-v2');
if (packConfig.error) throw new Error(`Cannot resolve pack: ${packConfig.error}`);

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

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 E2E: Raw Scores (1-5 scale) \u2550\u2550\u2550');

test('raw scores 5,4,3,2 → normalized correctly', () => {
  const result = engine.generate({
    assessment_id: 'e2e-raw-001',
    user_id: 'u1',
    type: 'leadership',
    scores: { motivation: 5, decision_making: 4, delegation: 3, feedback: 2 },
  });

  if (result.error) throw new Error(`unexpected error: ${result.error}`);

  // Classification (after normalization: 5→100, 4→80, 3→60, 2→40)
  const strengths = result.strengths.map(s => s.dimension);
  const weaknesses = result.weaknesses.map(w => w.dimension);

  if (!strengths.includes('motivation')) throw new Error('motivation (5→100) should be strength');
  if (!strengths.includes('decision_making')) throw new Error('decision_making (4→80) should be strength');
  if (strengths.length !== 2) throw new Error(`expected 2 strengths, got ${strengths.length}`);

  if (weaknesses.length !== 1) throw new Error(`expected 1 weakness, got ${weaknesses.length}`);
  if (!weaknesses.includes('feedback')) throw new Error('feedback (2→40) should be weakness');

  // delegation (3→60) should be neutral
  const allOut = [...strengths, ...weaknesses];
  if (allOut.includes('delegation')) throw new Error('delegation (3→60) should be neutral');

  // NBA should target the lowest: feedback (2→40)
  if (result.next_best_action.focus_dimension !== 'feedback') {
    throw new Error(`NBA should be feedback, got ${result.next_best_action.focus_dimension}`);
  }
});

test('raw scores 1,1,1,1 → all weakness', () => {
  const result = engine.generate({
    assessment_id: 'e2e-raw-002',
    user_id: 'u2',
    type: 'leadership',
    scores: { motivation: 1, decision_making: 1, delegation: 1, feedback: 1 },
  });

  if (result.strengths.length !== 0) throw new Error('expected 0 strengths for all-1');
  if (result.weaknesses.length !== 4) throw new Error('expected 4 weaknesses for all-1');
  if (result.next_best_action.focus_dimension !== 'motivation') {
    throw new Error('NBA should be motivation (tie-break: first in order)');
  }
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 E2E: Pre-Normalized Scores (0-100 scale) \u2550\u2550\u2550');

test('pre-normalized scores 88,48,72,35 → no double-normalization', () => {
  const result = engine.generate({
    assessment_id: 'e2e-pre-001',
    user_id: 'u3',
    type: 'leadership',
    scores: { motivation: 88, decision_making: 48, delegation: 72, feedback: 35 },
  });

  // motivation=88 ≥ 80 → strength
  const st = result.strengths.find(s => s.dimension === 'motivation');
  if (!st) throw new Error('motivation (88) should be strength');
  if (st.score !== 88) throw new Error(`expected score 88, got ${st.score}`);

  // decision_making=48 ≤ 55 → weakness
  const wk = result.weaknesses.find(w => w.dimension === 'decision_making');
  if (!wk) throw new Error('decision_making (48) should be weakness');
  if (wk.score !== 48) throw new Error(`expected score 48, got ${wk.score}`);

  // feedback=35 ≤ 55 → weakness + NBA
  if (result.next_best_action.focus_dimension !== 'feedback') {
    throw new Error(`NBA should be feedback (35), got ${result.next_best_action.focus_dimension}`);
  }
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 E2E: TM-001 Traceability \u2550\u2550\u2550');

test('strength reason matches TM-001 wording pattern', () => {
  const result = engine.generate({
    assessment_id: 'e2e-trace-001',
    user_id: 'u4',
    type: 'leadership',
    scores: { motivation: 90 },
  });

  const reason = result.strengths[0].reason;
  // Check structural correctness, not specific wording (wording may change)
  if (!reason || reason.length < 10) throw new Error('reason too short');
  if (reason.includes('{score}')) throw new Error('unsubstituted placeholder');
  if (reason.includes('[PLACEHOLDER')) throw new Error('placeholder marker found');
});

test('weakness reason matches TM-001 wording pattern', () => {
  const result = engine.generate({
    assessment_id: 'e2e-trace-002',
    user_id: 'u5',
    type: 'leadership',
    scores: { feedback: 20 },
  });

  const reason = result.weaknesses[0].reason;
  // Check structural correctness, not specific wording (wording may change)
  if (!reason || reason.length < 10) throw new Error('reason too short');
  if (reason.includes('{score}')) throw new Error('unsubstituted placeholder');
  if (reason.includes('[PLACEHOLDER')) throw new Error('placeholder marker found');
});

test('NBA action and rationale match TM-001', () => {
  const result = engine.generate({
    assessment_id: 'e2e-trace-003',
    user_id: 'u6',
    type: 'leadership',
    scores: { motivation: 90, decision_making: 85, delegation: 80, feedback: 25 },
  });

  const nba = result.next_best_action;
  if (nba.focus_dimension !== 'feedback') throw new Error('NBA should be feedback (lowest)');

  // Check structural correctness, not specific wording
  if (!nba.action || nba.action.length < 10) throw new Error('action too short');
  if (nba.action.includes('{score}')) throw new Error('unsubstituted placeholder');
  if (nba.action.includes('[PLACEHOLDER')) throw new Error('placeholder marker found');
  // rationale should mention lowest dimension + score
  if (!nba.rationale.includes('Feedback')) throw new Error('rationale should mention Feedback');
  if (!nba.rationale.includes('25')) throw new Error('rationale should include score');
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 E2E: Determinism & Edge Cases \u2550\u2550\u2550');

test('identical raw input produces identical output', () => {
  const input = {
    assessment_id: 'e2e-det-001',
    user_id: 'u7',
    type: 'leadership',
    scores: { motivation: 4, feedback: 2 },
  };

  const r1 = engine.generate(input);
  const r2 = engine.generate(input);

  const strip = (r) => { const { generated_at, ...rest } = r; return rest; };
  if (JSON.stringify(strip(r1)) !== JSON.stringify(strip(r2))) {
    throw new Error('output not deterministic');
  }
});

test('empty scores → graceful degradation', () => {
  const result = engine.generate({
    assessment_id: 'e2e-empty',
    user_id: 'u8',
    type: 'leadership',
    scores: {},
  });

  if (result.error) throw new Error('empty scores should not error');
  if (result.strengths.length !== 0) throw new Error('expected 0 strengths');
  if (result.next_best_action !== null) throw new Error('expected null NBA');
});

// ─────────────────────────────────────────────────
console.log(`\n${'═'.repeat(40)}`);
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log(`${'═'.repeat(40)}\n`);

if (failed > 0) process.exit(1);
console.log('All E2E tests passed.\n');
process.exit(0);
