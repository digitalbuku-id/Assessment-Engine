/**
 * Unit tests: Pack Loader & Resolver (SPEC-002)
 *
 * Cakupan:
 *  - Loader: load leadership pack successfully
 *  - Loader: completeness validation (INVALID_PACK_CONFIG)
 *  - Resolver: resolve valid assessment → merged config
 *  - Resolver: UNKNOWN_ASSESSMENT
 *  - Resolver: VERSION_MISMATCH
 *  - Resolver: integration with Core Engine (same behavior as old config)
 *  - Cache: second load returns same object
 */

const { loadPack, _validateCompleteness } = require('../engines/recommendation/loader');
const { resolve } = require('../engines/recommendation/resolver');
const { RecommendationEngine } = require('../engines/recommendation/index');

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
console.log('\n\u2550\u2550\u2550 Loader Tests \u2550\u2550\u2550');

test('loadPack("leadership") returns merged config', () => {
  const config = loadPack('leadership');
  if (!config) throw new Error('expected config, got null');
  if (config.pack_id !== 'leadership') throw new Error('pack_id mismatch');
  if (config.version !== '2.0.0') throw new Error('version mismatch');
  if (!config.dimensions || config.dimensions.length !== 4) throw new Error('dimensions mismatch');
  if (config.strength_threshold !== 80) throw new Error('strength_threshold mismatch');
  if (config.weakness_threshold !== 55) throw new Error('weakness_threshold mismatch');
  if (!config.reasons) throw new Error('reasons missing');
  if (!config.actions) throw new Error('actions missing');
  if (!config.labels.motivation) throw new Error('labels missing');
});

test('loadPack returns cached object on second call', () => {
  const c1 = loadPack('leadership');
  const c2 = loadPack('leadership');
  if (c1 !== c2) throw new Error('cache should return same object reference');
});

test('loadPack returns null for nonexistent pack', () => {
  const config = loadPack('nonexistent-pack-xyz');
  if (config !== null) throw new Error('expected null for nonexistent pack');
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Loader — Completeness Validation \u2550\u2550\u2550');

test('INVALID_PACK_CONFIG: missing pack_id', () => {
  try {
    _validateCompleteness('test', { dimensions: ['a'] }, { strength_threshold: 80, weakness_threshold: 55 }, { strengths: { a: 'x' }, weaknesses: { a: 'y' } }, { a: { action: 'x', rationale: 'y' } });
    throw new Error('should have thrown');
  } catch (err) {
    if (err.code !== 'INVALID_PACK_CONFIG') throw new Error(`wrong error code: ${err.code}`);
    if (!err.message.includes('pack_id')) throw new Error('message should mention pack_id');
  }
});

test('INVALID_PACK_CONFIG: empty dimensions', () => {
  try {
    _validateCompleteness('test', { pack_id: 'test', dimensions: [] }, { strength_threshold: 80, weakness_threshold: 55 }, { strengths: {}, weaknesses: {} }, {});
    throw new Error('should have thrown');
  } catch (err) {
    if (err.code !== 'INVALID_PACK_CONFIG') throw new Error(`wrong error code: ${err.code}`);
    if (!err.message.includes('empty')) throw new Error('message should mention empty');
  }
});

test('INVALID_PACK_CONFIG: strength_threshold <= weakness_threshold', () => {
  try {
    _validateCompleteness('test', { pack_id: 'test', dimensions: ['a'], labels: { a: 'A' } }, { strength_threshold: 50, weakness_threshold: 50 }, { strengths: { a: 'x' }, weaknesses: { a: 'y' } }, { a: { action: 'x', rationale: 'y' } });
    throw new Error('should have thrown');
  } catch (err) {
    if (err.code !== 'INVALID_PACK_CONFIG') throw new Error(`wrong error code: ${err.code}`);
    if (!err.message.includes('must be >')) throw new Error('message should mention threshold constraint');
  }
});

test('INVALID_PACK_CONFIG: dimension missing in labels', () => {
  try {
    _validateCompleteness('test', { pack_id: 'test', dimensions: ['x'], labels: {} }, { strength_threshold: 80, weakness_threshold: 55 }, { strengths: { x: 'a' }, weaknesses: { x: 'b' } }, { x: { action: 'a', rationale: 'b' } });
    throw new Error('should have thrown');
  } catch (err) {
    if (!err.message.includes('labels')) throw new Error('message should mention labels');
  }
});

test('INVALID_PACK_CONFIG: dimension missing in reasons.strengths', () => {
  try {
    _validateCompleteness('test', { pack_id: 'test', dimensions: ['x'], labels: { x: 'X' } }, { strength_threshold: 80, weakness_threshold: 55 }, { strengths: {}, weaknesses: { x: 'b' } }, { x: { action: 'a', rationale: 'b' } });
    throw new Error('should have thrown');
  } catch (err) {
    if (!err.message.includes('reasons.strengths')) throw new Error('message should mention reasons.strengths');
  }
});

test('INVALID_PACK_CONFIG: dimension missing in reasons.weaknesses', () => {
  try {
    _validateCompleteness('test', { pack_id: 'test', dimensions: ['x'], labels: { x: 'X' } }, { strength_threshold: 80, weakness_threshold: 55 }, { strengths: { x: 'a' }, weaknesses: {} }, { x: { action: 'a', rationale: 'b' } });
    throw new Error('should have thrown');
  } catch (err) {
    if (!err.message.includes('reasons.weaknesses')) throw new Error('message should mention reasons.weaknesses');
  }
});

test('INVALID_PACK_CONFIG: dimension missing in actions', () => {
  try {
    _validateCompleteness('test', { pack_id: 'test', dimensions: ['x'], labels: { x: 'X' } }, { strength_threshold: 80, weakness_threshold: 55 }, { strengths: { x: 'a' }, weaknesses: { x: 'b' } }, {});
    throw new Error('should have thrown');
  } catch (err) {
    if (!err.message.includes('actions')) throw new Error('message should mention actions');
  }
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Resolver Tests \u2550\u2550\u2550');

test('resolve("assessment-leadership-v2") returns merged config', () => {
  const config = resolve('assessment-leadership-v2');
  if (config.error) throw new Error(`unexpected error: ${config.error}`);
  if (config.pack_id !== 'leadership') throw new Error('pack_id mismatch');
  if (!config.strength_threshold) throw new Error('threshold missing');
  if (!config.reasons.strengths.motivation) throw new Error('reasons missing');
  if (!config.actions.motivation) throw new Error('actions missing');
});

test('UNKNOWN_ASSESSMENT: assessment not in registry', () => {
  const result = resolve('assessment-nonexistent-999');
  if (result.error !== 'UNKNOWN_ASSESSMENT') throw new Error(`expected UNKNOWN_ASSESSMENT, got ${result.error}`);
  if (!result.message.includes('assessment-nonexistent-999')) throw new Error('message should mention assessment_id');
});

test('VERSION_MISMATCH — simulate by checking registry version vs metadata', () => {
  // The registry entry has version '1.0.0' which matches metadata.
  // This test verifies the validation LOGIC exists and works.
  // We test the positive case: when they match, no error.
  const config = resolve('assessment-leadership-v2');
  if (config.error === 'VERSION_MISMATCH') throw new Error('should not have mismatch when versions align');
  // Negative case: inject a mismatched version manually
  const registry = require('../engines/recommendation/registry');
  const saved = { ...registry['assessment-leadership-v2'] };
  registry['assessment-leadership-v2'] = { pack: 'leadership', version: '99.99.99' };
  const result = resolve('assessment-leadership-v2');
  registry['assessment-leadership-v2'] = saved; // restore
  if (result.error !== 'VERSION_MISMATCH') throw new Error(`expected VERSION_MISMATCH, got ${result.error}`);
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Integration: Engine via Resolver \u2550\u2550\u2550');

test('engine via resolver produces correct 4-dimension output', () => {
  // Resolver path uses the 4-dimension Canonical Model pack
  const SAMPLE_4DIM = {
    assessment_id: 'asmt_cmp',
    user_id: 'u_1',
    type: 'leadership',
    scores: {
      motivation: 88,
      decision_making: 48,
      delegation: 72,
      feedback: 35,
    },
  };

  const packConfig = resolve('assessment-leadership-v2');
  if (packConfig.error) throw new Error(`unexpected resolver error: ${packConfig.error}`);

  const engine = new RecommendationEngine(packConfig);
  const result = engine.generate(SAMPLE_4DIM);
  if (result.error) throw new Error(`unexpected engine error: ${result.error}`);

  // Verify classification is correct for 4 dimensions
  if (result.strengths.length !== 1) throw new Error(`expected 1 strength (motivation=88), got ${result.strengths.length}`);
  if (result.strengths[0].dimension !== 'motivation') throw new Error(`expected motivation as strength`);
  if (result.weaknesses.length !== 2) throw new Error(`expected 2 weaknesses, got ${result.weaknesses.length}`);
  if (result.next_best_action.focus_dimension !== 'feedback') throw new Error(`expected feedback (35) as NBA, got ${result.next_best_action.focus_dimension}`);
  // Verify output type
  if (result.type !== 'leadership') throw new Error(`expected type leadership, got ${result.type}`);
  // Verify 4 dims (no legacy 5-dim leak)
  const allDims = [...result.strengths.map(s => s.dimension), ...result.weaknesses.map(w => w.dimension)];
  if (allDims.includes('communication')) throw new Error('legacy dimension leaked into 4-dim output');
  if (allDims.includes('execution')) throw new Error('legacy dimension leaked into 4-dim output');
});

test('engine via resolver correctly handles empty scores', () => {
  const packConfig = resolve('assessment-leadership-v2');
  const engine = new RecommendationEngine(packConfig);
  const result = engine.generate({
    assessment_id: 'asmt_empty',
    user_id: 'u_1',
    type: 'leadership',
    scores: {},
  });
  if (result.error) throw new Error('empty scores should not error');
  if (result.strengths.length !== 0) throw new Error('expected 0 strengths');
  if (result.next_best_action !== null) throw new Error('expected null');
});

test('engine via resolver correctly handles invalid score range', () => {
  const packConfig = resolve('assessment-leadership-v2');
  const engine = new RecommendationEngine(packConfig);
  const result = engine.generate({
    assessment_id: 'asmt_bad',
    user_id: 'u_1',
    type: 'leadership',
    scores: { motivation: 999 },
  });
  if (result.error !== 'INVALID_SCORE_RANGE') throw new Error(`expected INVALID_SCORE_RANGE, got ${result.error}`);
});

test('engine via resolver correctly handles unknown dimension', () => {
  const packConfig = resolve('assessment-leadership-v2');
  const engine = new RecommendationEngine(packConfig);
  const result = engine.generate({
    assessment_id: 'asmt_bad',
    user_id: 'u_1',
    type: 'leadership',
    scores: { unknown_dim: 50 },
  });
  if (result.error !== 'UNKNOWN_DIMENSION') throw new Error(`expected UNKNOWN_DIMENSION, got ${result.error}`);
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Sprint 3C: Multi-Pack Architecture Validation \u2550\u2550\u2550');

// ── Test 1: Loader loads 2 different packs without cache conflict ──
test('loader.loadPack loads leadership + sample-domain-b without cache conflict', () => {
  const lead = loadPack('leadership');
  const sample = loadPack('sample-domain-b');

  // Both return valid config
  if (!lead) throw new Error('leadership pack should load');
  if (!sample) throw new Error('sample-domain-b pack should load');

  // Different pack_ids
  if (lead.pack_id === sample.pack_id) throw new Error('pack_ids should differ');
  if (lead.pack_id !== 'leadership') throw new Error('leadership pack_id mismatch');
  if (sample.pack_id !== 'sample-domain-b') throw new Error('sample-domain-b pack_id mismatch');

  // Different dimensions
  if (lead.dimensions.length !== 4) throw new Error('leadership should have 4 dimensions');
  if (sample.dimensions.length !== 3) throw new Error('sample-domain-b should have 3 dimensions');

  // Cache is separate — second load returns same reference per pack
  const lead2 = loadPack('leadership');
  const sample2 = loadPack('sample-domain-b');
  if (lead !== lead2) throw new Error('leadership cache should return same object');
  if (sample !== sample2) throw new Error('sample-domain-b cache should return same object');
  if (lead === sample) throw new Error('different packs should NOT share the same cached object');
});

// ── Test 2: resolver.resolve for both assessment_ids — no cross-contamination ──
test('resolver.resolve returns correct config for both assessment_ids, no cross-leak', () => {
  const lead = resolve('assessment-leadership-v2');
  const sample = resolve('test-sample-domain-b-v1');

  // No errors
  if (lead.error) throw new Error(`leadership resolve should not error: ${lead.error}`);
  if (sample.error) throw new Error(`sample-domain-b resolve should not error: ${sample.error}`);

  // Correct pack_ids
  if (lead.pack_id !== 'leadership') throw new Error(`expected leadership, got ${lead.pack_id}`);
  if (sample.pack_id !== 'sample-domain-b') throw new Error(`expected sample-domain-b, got ${sample.pack_id}`);

  // Leadership config does NOT contain sample-domain-b dimensions
  if (lead.dimensions.includes('dimension_alpha')) throw new Error('leadership config leaked sample-domain-b dimension');
  if (lead.dimensions.includes('dimension_beta')) throw new Error('leadership config leaked sample-domain-b dimension');
  if (lead.dimensions.includes('dimension_gamma')) throw new Error('leadership config leaked sample-domain-b dimension');

  // Sample-domain-b config does NOT contain leadership dimensions (4 Canonical dims)
  if (sample.dimensions.includes('motivation')) throw new Error('sample-domain-b config leaked leadership dimension');
  if (sample.dimensions.includes('decision_making')) throw new Error('sample-domain-b config leaked leadership dimension');
  if (sample.dimensions.includes('delegation')) throw new Error('sample-domain-b config leaked leadership dimension');
  if (sample.dimensions.includes('feedback')) throw new Error('sample-domain-b config leaked leadership dimension');

  // Labels are correct per pack
  if (!lead.labels.motivation) throw new Error('leadership labels missing motivation');
  if (!sample.labels.dimension_alpha) throw new Error('sample-domain-b labels missing dimension_alpha');
  if (lead.labels.dimension_alpha) throw new Error('leadership labels should not contain dimension_alpha');

  // Reasons are correct per pack
  if (!lead.reasons.strengths.motivation) throw new Error('leadership reasons missing');
  if (!sample.reasons.strengths.dimension_alpha) throw new Error('sample-domain-b reasons missing');
  if (sample.reasons.strengths.motivation) throw new Error('sample-domain-b reasons leaked leadership dimension');

  // Actions are correct per pack
  if (!lead.actions.motivation) throw new Error('leadership actions missing');
  if (!sample.actions.dimension_alpha) throw new Error('sample-domain-b actions missing');
  if (sample.actions.motivation) throw new Error('sample-domain-b actions leaked leadership dimension');
});

// ── Test 3: engine.generate with both packs — output matches respective pack, no cross-contamination ──
test('engine.generate with leadership pack produces leadership output (no test pack text)', () => {
  const leadConfig = resolve('assessment-leadership-v2');
  const engine = new RecommendationEngine(leadConfig);
  const result = engine.generate({
    assessment_id: 'asmt-multi-001',
    user_id: 'u-001',
    type: 'leadership',
    scores: { motivation: 85, decision_making: 40, delegation: 70, feedback: 55 },
  });

  if (result.error) throw new Error(`unexpected error: ${result.error}`);
  if (result.type !== 'leadership') throw new Error(`expected type leadership, got ${result.type}`);

  // Leadership output must NOT contain [TEST PACK] marker
  const outputStr = JSON.stringify(result);
  if (outputStr.includes('[TEST PACK]')) throw new Error('leadership output leaked [TEST PACK] marker');

  // Should have at least 1 strength and 1 weakness
  if (result.strengths.length === 0) throw new Error('expected at least 1 strength');
  if (result.weaknesses.length === 0) throw new Error('expected at least 1 weakness');

  // Strengths/weaknesses should reference leadership dimensions only
  const allDims = [...result.strengths.map(s => s.dimension), ...result.weaknesses.map(w => w.dimension)];
  if (allDims.includes('dimension_alpha')) throw new Error('leadership output leaked sample-domain-b dimension');
});

test('engine.generate with sample-domain-b pack produces test output (contains [TEST PACK])', () => {
  const sampleConfig = resolve('test-sample-domain-b-v1');
  const engine = new RecommendationEngine(sampleConfig);
  const result = engine.generate({
    assessment_id: 'asmt-multi-002',
    user_id: 'u-002',
    type: 'sample-domain-b',
    scores: { dimension_alpha: 90, dimension_beta: 30, dimension_gamma: 65 },
  });

  if (result.error) throw new Error(`unexpected error: ${result.error}`);
  if (result.type !== 'sample-domain-b') throw new Error(`expected type sample-domain-b, got ${result.type}`);

  // Sample-domain-b output MUST contain [TEST PACK] marker
  const outputStr = JSON.stringify(result);
  if (!outputStr.includes('[TEST PACK]')) throw new Error('sample-domain-b output should contain [TEST PACK]');

  // Should have exactly 1 strength (alpha=90 ≥ 80), 1 weakness (beta=30 ≤ 55)
  if (result.strengths.length !== 1) throw new Error(`expected 1 strength, got ${result.strengths.length}`);
  if (result.strengths[0].dimension !== 'dimension_alpha') throw new Error(`expected dimension_alpha strength`);
  if (result.weaknesses.length !== 1) throw new Error(`expected 1 weakness, got ${result.weaknesses.length}`);
  if (result.weaknesses[0].dimension !== 'dimension_beta') throw new Error(`expected dimension_beta weakness`);

  // NBA should target the weakest dimension
  if (result.next_best_action.focus_dimension !== 'dimension_beta') {
    throw new Error(`expected NBA focus dimension_beta, got ${result.next_best_action.focus_dimension}`);
  }

  // Output must NOT contain leadership-specific terms
  if (outputStr.includes('motivation')) throw new Error('sample-domain-b output leaked leadership pack_id');
});

test('engine.generate with both packs in sequence — no state leak between calls', () => {
  const leadConfig = resolve('assessment-leadership-v2');
  const sampleConfig = resolve('test-sample-domain-b-v1');

  const leadEngine = new RecommendationEngine(leadConfig);
  const sampleEngine = new RecommendationEngine(sampleConfig);

  // Generate leadership first
  const leadResult1 = leadEngine.generate({
    assessment_id: 'asmt-seq-001', user_id: 'u-001', type: 'leadership',
    scores: { motivation: 90, decision_making: 50, delegation: 70, feedback: 60 },
  });

  // Generate sample-domain-b
  const sampleResult = sampleEngine.generate({
    assessment_id: 'asmt-seq-002', user_id: 'u-002', type: 'sample-domain-b',
    scores: { dimension_alpha: 30, dimension_beta: 85, dimension_gamma: 50 },
  });

  // Generate leadership again — should be identical to first call
  const leadResult2 = leadEngine.generate({
    assessment_id: 'asmt-seq-001', user_id: 'u-001', type: 'leadership',
    scores: { motivation: 90, decision_making: 50, delegation: 70, feedback: 60 },
  });

  // Strip timestamps for comparison
  const strip = (r) => { const { generated_at, ...rest } = r; return rest; };
  if (JSON.stringify(strip(leadResult1)) !== JSON.stringify(strip(leadResult2))) {
    throw new Error('leadership output changed after generating sample-domain-b — state leak detected');
  }

  // Verify sample result does not contain leadership data
  if (JSON.stringify(sampleResult).includes('motivation')) {
    throw new Error('sample-domain-b output leaked leadership dimension after sequential calls');
  }

  // Both engines produce valid results
  if (leadResult1.error || leadResult2.error || sampleResult.error) {
    throw new Error('unexpected error in sequential generation');
  }
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Sprint 3C: Strategy Runtime Contract (ADR-005 D2-D4) \u2550\u2550\u2550');

// ── Strategy defaults (ADR-005 D2) ──
test('merged config has strategy defaults when metadata omits them', () => {
  // Leadership pack metadata has no strategy fields → defaults apply
  const config = loadPack('leadership');
  if (config.scoring_strategy !== 'threshold') throw new Error(`expected scoring_strategy=threshold, got ${config.scoring_strategy}`);
  if (config.graph_strategy !== 'none') throw new Error(`expected graph_strategy=none, got ${config.graph_strategy}`);
  if (config.interpretation_strategy !== 'threshold') throw new Error(`expected interpretation_strategy=threshold, got ${config.interpretation_strategy}`);
});

test('resolve returns merged config with strategy fields', () => {
  const config = resolve('assessment-leadership-v2');
  if (config.error) throw new Error(`unexpected error: ${config.error}`);
  // Strategy fields must be present (defaults from loader)
  if (!('scoring_strategy' in config)) throw new Error('scoring_strategy missing from merged config');
  if (!('graph_strategy' in config)) throw new Error('graph_strategy missing from merged config');
  if (!('interpretation_strategy' in config)) throw new Error('interpretation_strategy missing from merged config');
});

// ── Strategy validation — INVALID_PACK_CONFIG (ADR-005 D3) ──
test('INVALID_PACK_CONFIG: unsupported scoring_strategy', () => {
  try {
    _validateCompleteness('test', {
      pack_id: 'test', dimensions: ['d1'], labels: { d1: 'D1' },
      scoring_strategy: 'unsupported_strategy',
    }, { strength_threshold: 80, weakness_threshold: 55 },
    { strengths: { d1: 'x' }, weaknesses: { d1: 'y' } },
    { d1: { action: 'a', rationale: 'b' } });
    throw new Error('should have thrown');
  } catch (err) {
    if (err.code !== 'INVALID_PACK_CONFIG') throw new Error(`wrong error code: ${err.code}`);
    if (!err.message.includes('scoring_strategy')) throw new Error('message should mention scoring_strategy');
    if (!err.message.includes('unsupported_strategy')) throw new Error('message should mention the invalid value');
  }
});

test('INVALID_PACK_CONFIG: unsupported graph_strategy', () => {
  try {
    _validateCompleteness('test', {
      pack_id: 'test', dimensions: ['d1'], labels: { d1: 'D1' },
      graph_strategy: 'unsupported_strategy',
    }, { strength_threshold: 80, weakness_threshold: 55 },
    { strengths: { d1: 'x' }, weaknesses: { d1: 'y' } },
    { d1: { action: 'a', rationale: 'b' } });
    throw new Error('should have thrown');
  } catch (err) {
    if (err.code !== 'INVALID_PACK_CONFIG') throw new Error(`wrong error code: ${err.code}`);
    if (!err.message.includes('graph_strategy')) throw new Error('message should mention graph_strategy');
  }
});

test('INVALID_PACK_CONFIG: unsupported interpretation_strategy', () => {
  try {
    _validateCompleteness('test', {
      pack_id: 'test', dimensions: ['d1'], labels: { d1: 'D1' },
      interpretation_strategy: 'unsupported_strategy',
    }, { strength_threshold: 80, weakness_threshold: 55 },
    { strengths: { d1: 'x' }, weaknesses: { d1: 'y' } },
    { d1: { action: 'a', rationale: 'b' } });
    throw new Error('should have thrown');
  } catch (err) {
    if (err.code !== 'INVALID_PACK_CONFIG') throw new Error(`wrong error code: ${err.code}`);
    if (!err.message.includes('interpretation_strategy')) throw new Error('message should mention interpretation_strategy');
  }
});

// ─────────────────────────────────────────────────
console.log(`\n${'═'.repeat(40)}`);
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log(`${'═'.repeat(40)}\n`);

if (failed > 0) process.exit(1);
console.log('All loader/resolver tests passed.\n');
process.exit(0);
