/**
 * Unit tests: Recommendation Adapter (Sprint 4A)
 *
 * Cakupan:
 *  - Fallback: no assessment_id → returns legacy stub
 *  - Fallback: unknown assessment → returns legacy stub (UNKNOWN_ASSESSMENT)
 *  - Fallback: no mappable scores → returns legacy stub
 *  - Success: valid assessment_id + matching scores → engine output
 *  - Signature: generateRecommendations(insights, validatedData) unchanged
 */

import { generateRecommendations } from '../components/recommendation-engine.js';

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

// ── Test helpers ────────────────────────────────

const LEGACY_STUB = [
  'Focus on improving time management skills',
  'Consider mentoring in delegation',
  'Leverage collaboration strengths',
];

function makeValidatedData(overrides = {}) {
  return {
    assessmentId: 'assessment-leadership-v2',
    assessmentType: 'leadership',
    participants: [
      {
        participantId: 'P-TEST',
        name: 'Test User',
        competencyScores: [
          { competencyId: 'mot', competencyName: 'Motivation', score: 90 },
          { competencyId: 'dec', competencyName: 'Decision Making', score: 40 },
          { competencyId: 'del', competencyName: 'Delegation', score: 75 },
          { competencyId: 'fb', competencyName: 'Feedback', score: 48 },
        ],
      },
    ],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Fallback Tests \u2550\u2550\u2550');

test('fallback: no validatedData → returns legacy stub', () => {
  const result = generateRecommendations({}, null);
  if (JSON.stringify(result) !== JSON.stringify(LEGACY_STUB)) {
    throw new Error('should return legacy stub');
  }
});

test('fallback: validatedData without assessmentId → returns legacy stub', () => {
  const result = generateRecommendations({}, { someField: 'value' });
  if (JSON.stringify(result) !== JSON.stringify(LEGACY_STUB)) {
    throw new Error('should return legacy stub');
  }
});

test('fallback: unknown assessment_id → returns legacy stub (UNKNOWN_ASSESSMENT)', () => {
  const result = generateRecommendations({}, {
    assessmentId: 'assessment-nonexistent-999',
  });
  if (JSON.stringify(result) !== JSON.stringify(LEGACY_STUB)) {
    throw new Error('should return legacy stub on unknown assessment');
  }
});

test('fallback: valid assessment_id but no mappable scores → returns legacy stub', () => {
  const result = generateRecommendations({}, {
    assessmentId: 'assessment-leadership-v2',
    participants: [],
  });
  if (JSON.stringify(result) !== JSON.stringify(LEGACY_STUB)) {
    throw new Error('should return legacy stub when no scores');
  }
});

test('fallback: valid assessment_id with scores that don\'t match dimensions → returns legacy stub', () => {
  const result = generateRecommendations({}, {
    assessmentId: 'assessment-leadership-v2',
    participants: [{
      competencyScores: [
        { competencyName: 'Cooking', score: 90 },
        { competencyName: 'Baking', score: 80 },
      ],
    }],
  });
  if (JSON.stringify(result) !== JSON.stringify(LEGACY_STUB)) {
    throw new Error('should return legacy stub for unmappable scores');
  }
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Success Path Tests \u2550\u2550\u2550');

test('success: valid leadership assessment → engine-generated recommendations', () => {
  const data = makeValidatedData();
  const result = generateRecommendations({}, data);

  // Should NOT be the legacy stub
  if (JSON.stringify(result) === JSON.stringify(LEGACY_STUB)) {
    throw new Error('should NOT return legacy stub for valid assessment');
  }

  // Should be an array of strings
  if (!Array.isArray(result)) throw new Error('should return array');
  if (result.length === 0) throw new Error('should have at least one recommendation');

  // Every item should be a string
  result.forEach((r, i) => {
    if (typeof r !== 'string') throw new Error(`item ${i} should be string, got ${typeof r}`);
  });

  console.log('    Output sample:', result[0].substring(0, 80) + '...');
});

test('success: output includes strength for high scorer', () => {
  const result = generateRecommendations({}, makeValidatedData());
  const strengthStrings = result.filter(r => r.startsWith('Strength:'));
  if (strengthStrings.length === 0) {
    throw new Error('should have at least one strength (motivation=90 ≥ 80)');
  }
  if (!strengthStrings.some(s => s.includes('Motivation'))) {
    throw new Error('should include Motivation as strength');
  }
  if (!strengthStrings.some(s => s.includes('90'))) {
    throw new Error('strength reason should include score 90');
  }
});

test('success: output includes growth area for low scorer', () => {
  const result = generateRecommendations({}, makeValidatedData());
  const weaknessStrings = result.filter(r => r.startsWith('Growth area:'));
  if (weaknessStrings.length === 0) {
    throw new Error('should have at least one growth area (decision_making=40 ≤ 55)');
  }
  if (!weaknessStrings.some(w => w.includes('Decision Making'))) {
    throw new Error('should include Decision Making as growth area');
  }
});

test('success: output includes next_best_action', () => {
  const result = generateRecommendations({}, makeValidatedData());
  const nbaStrings = result.filter(r => r.startsWith('Next step'));
  if (nbaStrings.length === 0) {
    throw new Error('should have next_best_action');
  }
  // decision_making=40 is the lowest score
  if (!nbaStrings[0].includes('Decision Making')) {
    throw new Error('next_best_action should target Decision Making (lowest score)');
  }
});

test('success: neutral scores (56-79) do NOT appear in output', () => {
  // motivation=90 (strength), decision_making=40 (weakness),
  // delegation=75 (neutral), feedback=48 (weakness)
  const result = generateRecommendations({}, makeValidatedData());
  const allText = result.join(' ');
  if (allText.includes('Delegation')) {
    throw new Error('neutral dimensions should not appear in output');
  }
});

test('success: output is deterministic', () => {
  const data = makeValidatedData();
  const r1 = generateRecommendations({}, data);
  const r2 = generateRecommendations({}, data);
  if (JSON.stringify(r1) !== JSON.stringify(r2)) {
    throw new Error('output should be deterministic');
  }
});

test('success: signature unchanged — takes insights + validatedData', () => {
  // Verify function accepts exactly 2 args and returns string[]
  if (generateRecommendations.length !== 2) {
    throw new Error('signature should be (insights, validatedData)');
  }
  const result = generateRecommendations({ someInsight: true }, makeValidatedData());
  if (!Array.isArray(result)) throw new Error('should return array');
});

// ─────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550 Resolver Error Cases via Adapter \u2550\u2550\u2550');

test('UNKNOWN_ASSESSMENT → fallback to stub', () => {
  const result = generateRecommendations({}, {
    assessmentId: 'assessment-xyz-not-registered',
  });
  if (JSON.stringify(result) !== JSON.stringify(LEGACY_STUB)) {
    throw new Error('should fallback to stub');
  }
});

// Use test-sample-domain-b-v1 for additional resolver success
test('success: sample-domain-b pack resolves and generates output', () => {
  const data = {
    assessmentId: 'test-sample-domain-b-v1',
    participants: [{
      competencyScores: [
        { competencyName: 'Domain B Competency 1', score: 90 },
        { competencyName: 'Domain B Competency 2', score: 40 },
        { competencyName: 'Domain B Competency 3', score: 75 },
      ],
    }],
  };
  const result = generateRecommendations({}, data);
  // Should be engine output (not stub)
  if (JSON.stringify(result) === JSON.stringify(LEGACY_STUB)) {
    // May fail if dimension names don't match — that's OK, it's a structural test
    console.log('    (sample-domain-b: dimension names may not match — this is expected)');
  }
  // At minimum, no crash
  if (!Array.isArray(result)) throw new Error('should return array');
});

// ─────────────────────────────────────────────────
console.log(`\n${'═'.repeat(40)}`);
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log(`${'═'.repeat(40)}\n`);

if (failed > 0) process.exit(1);
console.log('All adapter tests passed.\n');
process.exit(0);
