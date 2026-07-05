#!/usr/bin/env node

/**
 * Test suite: Recommendation Engine MVP
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
 */

import { RecommendationEngine } from '../engines/recommendation/index.js';

const engine = new RecommendationEngine();

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
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
    communication: 72,
    decisiveness: 65,
    strategic_thinking: 81,
    people_development: 48,
    execution: 70,
  },
};

// ─────────────────────────────────────────────────
console.log('\n═══ Validation & Error Handling ═══');

test('EMPTY_SCORES → returns empty arrays + null next_best_action', () => {
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
    scores: { communication: -5 },
  });

  if (result.error !== 'INVALID_SCORE_RANGE') throw new Error(`expected INVALID_SCORE_RANGE, got ${result.error}`);
  if (!result.message.includes('communication')) throw new Error('message should mention the dimension');
  if (!result.message.includes('-5')) throw new Error('message should mention the value');
});

test('INVALID_SCORE_RANGE (> 100)', () => {
  const result = engine.generate({
    assessment_id: 'asmt_x',
    user_id: 'u_1',
    type: 'leadership',
    scores: { execution: 999 },
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

test('UNSUPPORTED_TYPE', () => {
  const result = engine.generate({
    assessment_id: 'asmt_x',
    user_id: 'u_1',
    type: 'baking',
    scores: { flavor: 80 },
  });

  if (result.error !== 'UNSUPPORTED_TYPE') throw new Error(`expected UNSUPPORTED_TYPE, got ${result.error}`);
  if (!result.message.includes('baking')) throw new Error('message should mention the type');
});

test('MISSING_ASSESSMENT_ID', () => {
  const result = engine.generate({
    user_id: 'u_1',
    type: 'leadership',
    scores: { communication: 50 },
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
console.log('\n═══ Happy Path — Output Structure ═══');

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
console.log('\n═══ Classification — Strengths & Weaknesses ═══');

test('strategic_thinking (81) diklasifikasi sebagai strength (≥80)', () => {
  const result = engine.generate(SAMPLE_INPUT);
  const st = result.strengths.find(s => s.dimension === 'strategic_thinking');
  if (!st) throw new Error('strategic_thinking should be a strength');
  if (st.score !== 81) throw new Error('score mismatch');
  if (st.label !== 'Strategic Thinking') throw new Error('label mismatch');
  if (!st.reason.includes('81')) throw new Error('reason should include score');
});

test('people_development (48) diklasifikasi sebagai weakness (≤55)', () => {
  const result = engine.generate(SAMPLE_INPUT);
  const wk = result.weaknesses.find(w => w.dimension === 'people_development');
  if (!wk) throw new Error('people_development should be a weakness');
  if (wk.score !== 48) throw new Error('score mismatch');
  if (wk.label !== 'People Development') throw new Error('label mismatch');
  if (!wk.reason.includes('48')) throw new Error('reason should include score');
});

test('decisiveness (65) adalah NEUTRAL per algoritma threshold (80/55)', () => {
  // 65 > 55 → bukan weakness. 65 < 80 → bukan strength. → NEUTRAL.
  const result = engine.generate(SAMPLE_INPUT);

  const allInOutput = [
    ...result.strengths.map(s => s.dimension),
    ...result.weaknesses.map(w => w.dimension),
  ];

  if (allInOutput.includes('decisiveness')) {
    throw new Error('decisiveness (65) should be NEUTRAL — not in strengths or weaknesses');
  }
  if (result.weaknesses.length !== 1) {
    throw new Error(`expected 1 weakness (people_development=48), got ${result.weaknesses.length}`);
  }
  if (result.strengths.length !== 1) {
    throw new Error(`expected 1 strength (strategic_thinking=81), got ${result.strengths.length}`);
  }
});

test('skor 56–79 TERMASUK neutral → tidak muncul di strengths atau weaknesses', () => {
  // decisiveness=65, communication=72, execution=70 → all in 56–79 range = neutral
  const result = engine.generate(SAMPLE_INPUT);

  const allDims = [
    ...result.strengths.map(s => s.dimension),
    ...result.weaknesses.map(w => w.dimension),
  ];

  if (allDims.includes('decisiveness')) throw new Error('decisiveness (65) should be neutral');
  if (allDims.includes('communication')) throw new Error('communication (72) should be neutral');
  if (allDims.includes('execution')) throw new Error('execution (70) should be neutral');
});

test('strength items memiliki semua field wajib', () => {
  const result = engine.generate({
    assessment_id: 'asmt_all_strong',
    user_id: 'u_x',
    type: 'leadership',
    scores: {
      communication: 90,
      strategic_thinking: 85,
      execution: 88,
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

test('weakness items memiliki semua field wajib', () => {
  const result = engine.generate({
    assessment_id: 'asmt_all_weak',
    user_id: 'u_x',
    type: 'leadership',
    scores: {
      communication: 30,
      people_development: 25,
      execution: 40,
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
console.log('\n═══ Next Best Action ═══');

test('next_best_action memilih dimensi dengan skor terendah', () => {
  const result = engine.generate(SAMPLE_INPUT);
  // people_development = 48 (terendah)
  if (result.next_best_action.focus_dimension !== 'people_development') {
    throw new Error(`expected people_development, got ${result.next_best_action.focus_dimension}`);
  }
});

test('next_best_action memiliki semua field wajib', () => {
  const result = engine.generate(SAMPLE_INPUT);
  const nba = result.next_best_action;

  if (typeof nba.focus_dimension !== 'string') throw new Error('focus_dimension missing');
  if (typeof nba.label !== 'string') throw new Error('label missing');
  if (typeof nba.action !== 'string') throw new Error('action missing');
  if (typeof nba.rationale !== 'string') throw new Error('rationale missing');
});

test('next_best_action rationale mengandung skor dimensi terendah', () => {
  const result = engine.generate(SAMPLE_INPUT);
  if (!result.next_best_action.rationale.includes('48')) {
    throw new Error('rationale should include score 48');
  }
});

test('next_best_action tie-break: dimensi pertama dalam input order', () => {
  // Keduanya skor 50 → harus pilih yang pertama muncul
  const result = engine.generate({
    assessment_id: 'asmt_tie',
    user_id: 'u_1',
    type: 'leadership',
    scores: {
      communication: 50,
      decisiveness: 50,
    },
  });

  if (result.next_best_action.focus_dimension !== 'communication') {
    throw new Error(`tie-break should pick first dimension (communication), got ${result.next_best_action.focus_dimension}`);
  }
});

// ─────────────────────────────────────────────────
console.log('\n═══ Determinism ═══');

test('input identik menghasilkan output identik (kecuali generated_at)', () => {
  const r1 = engine.generate(SAMPLE_INPUT);
  const r2 = engine.generate(SAMPLE_INPUT);

  // Bandingkan semua field kecuali generated_at
  const stripTimestamp = (r) => {
    const { generated_at, ...rest } = r;
    return rest;
  };

  const s1 = JSON.stringify(stripTimestamp(r1));
  const s2 = JSON.stringify(stripTimestamp(r2));

  if (s1 !== s2) throw new Error('output tidak identik — determinism failed');
});

test('tidak ada randomness source — nilai score tidak berubah', () => {
  for (let i = 0; i < 10; i++) {
    const r = engine.generate(SAMPLE_INPUT);
    const pd = r.weaknesses.find(w => w.dimension === 'people_development');
    if (pd.score !== 48) throw new Error(`score berubah: ${pd.score}`);
  }
});

// ─────────────────────────────────────────────────
console.log('\n═══ Template Substitution ═══');

test('semua {score} di reason sudah tersubstitusi', () => {
  const result = engine.generate({
    assessment_id: 'asmt_subst',
    user_id: 'u_1',
    type: 'leadership',
    scores: {
      communication: 95,
      people_development: 20,
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
console.log('\n═══ Edge Cases ═══');

test('semua skor strength → weaknesses kosong', () => {
  const result = engine.generate({
    assessment_id: 'asmt_edge',
    user_id: 'u_1',
    type: 'leadership',
    scores: {
      communication: 90,
      decisiveness: 85,
      strategic_thinking: 95,
      people_development: 88,
      execution: 92,
    },
  });

  if (result.strengths.length !== 5) throw new Error('expected 5 strengths');
  if (result.weaknesses.length !== 0) throw new Error('expected 0 weaknesses');
  if (result.next_best_action === null) throw new Error('next_best_action should not be null');
});

test('semua skor weakness → strengths kosong', () => {
  const result = engine.generate({
    assessment_id: 'asmt_edge2',
    user_id: 'u_1',
    type: 'leadership',
    scores: {
      communication: 20,
      decisiveness: 30,
      strategic_thinking: 10,
      people_development: 40,
      execution: 15,
    },
  });

  if (result.strengths.length !== 0) throw new Error('expected 0 strengths');
  if (result.weaknesses.length !== 5) throw new Error('expected 5 weaknesses');
  if (result.next_best_action.focus_dimension !== 'strategic_thinking') {
    throw new Error('next_best_action should pick lowest (strategic_thinking=10)');
  }
});

test('skor boundary tepat di threshold strength (80)', () => {
  const result = engine.generate({
    assessment_id: 'asmt_boundary',
    user_id: 'u_1',
    type: 'leadership',
    scores: { communication: 80 },
  });

  if (result.strengths.length !== 1) throw new Error('score 80 should be strength (≥80)');
  if (result.strengths[0].dimension !== 'communication') throw new Error('dimension mismatch');
});

test('skor boundary tepat di threshold weakness (55)', () => {
  const result = engine.generate({
    assessment_id: 'asmt_boundary2',
    user_id: 'u_1',
    type: 'leadership',
    scores: { communication: 55 },
  });

  if (result.weaknesses.length !== 1) throw new Error('score 55 should be weakness (≤55)');
  if (result.weaknesses[0].dimension !== 'communication') throw new Error('dimension mismatch');
});

test('skor satu di atas weakness threshold (56) → neutral', () => {
  const result = engine.generate({
    assessment_id: 'asmt_neutral',
    user_id: 'u_1',
    type: 'leadership',
    scores: { communication: 56 },
  });

  if (result.strengths.length !== 0) throw new Error('56 should not be strength');
  if (result.weaknesses.length !== 0) throw new Error('56 should not be weakness');
  // next_best_action masih harus terisi karena ada skor
  if (result.next_best_action.focus_dimension !== 'communication') {
    throw new Error('next_best_action should pick communication (only dimension)');
  }
});

test('scores dengan 1 dimensi → next_best_action adalah dimensi itu', () => {
  const result = engine.generate({
    assessment_id: 'asmt_single',
    user_id: 'u_1',
    type: 'leadership',
    scores: { execution: 75 },
  });

  if (result.next_best_action.focus_dimension !== 'execution') {
    throw new Error('next_best_action should be the only dimension');
  }
});

// ─────────────────────────────────────────────────
console.log('\n═══ Engine Version ═══');

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
