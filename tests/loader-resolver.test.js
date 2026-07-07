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
  if (config.version !== '1.0.0') throw new Error('version mismatch');
  if (!config.dimensions || config.dimensions.length !== 5) throw new Error('dimensions mismatch');
  if (config.strength_threshold !== 80) throw new Error('strength_threshold mismatch');
  if (config.weakness_threshold !== 55) throw new Error('weakness_threshold mismatch');
  if (!config.reasons) throw new Error('reasons missing');
  if (!config.actions) throw new Error('actions missing');
  if (!config.labels.communication) throw new Error('labels missing');
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
  if (!config.reasons.strengths.communication) throw new Error('reasons missing');
  if (!config.actions.communication) throw new Error('actions missing');
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

test('engine generates identical output via resolver vs legacy config', () => {
  const SAMPLE = {
    assessment_id: 'asmt_cmp',
    user_id: 'u_1',
    type: 'leadership',
    scores: {
      communication: 72,
      decisiveness: 65,
      strategic_thinking: 81,
      people_development: 48,
      execution: 70,
    },
  };

  // Legacy path (no packConfig)
  const legacyEngine = new RecommendationEngine();
  const legacyResult = legacyEngine.generate(SAMPLE);

  // New path (resolver → packConfig)
  const packConfig = resolve('assessment-leadership-v2');
  const newEngine = new RecommendationEngine(packConfig);
  const newResult = newEngine.generate(SAMPLE);

  // Strip generated_at (timestamp differs)
  const strip = (r) => {
    const { generated_at, ...rest } = r;
    return rest;
  };

  const legacy = JSON.stringify(strip(legacyResult));
  const viaResolver = JSON.stringify(strip(newResult));

  if (legacy !== viaResolver) {
    console.error('  Legacy:', legacy);
    console.error('  New:   ', viaResolver);
    throw new Error('output mismatch between legacy and resolver path');
  }
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
    scores: { communication: 999 },
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
console.log(`\n${'═'.repeat(40)}`);
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log(`${'═'.repeat(40)}\n`);

if (failed > 0) process.exit(1);
console.log('All loader/resolver tests passed.\n');
process.exit(0);
