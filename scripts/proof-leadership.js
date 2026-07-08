#!/usr/bin/env node

/**
 * Sprint 4B — End-to-End Proof: Leadership Pack
 *
 * Membuktikan seluruh pipa bekerja dengan data Leadership uji:
 *   assessment-builder → resolver → loader → Leadership Pack → engine → HTML/PDF
 *
 * TIDAK menyentuh insight-generator.js, template-engine, atau data competency.
 * Script ini TERPISAH dari pipeline produksi.
 */

import { readFileSync, writeFileSync } from 'fs';
import { validateAssessment } from '../components/json-schema.js';
import { preprocessAssessmentData } from '../components/html-export.js';
import { generateRecommendations } from '../components/recommendation-engine.js';
import { resolve } from '../engines/recommendation/resolver.js';
import { RecommendationEngine } from '../engines/recommendation/index.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const PASS = `${GREEN}PASS${RESET}`;
const FAIL = `${RED}FAIL${RESET}`;

// ── Legacy stub (for comparison) ──────────────────
const LEGACY_STUB = [
  'Focus on improving time management skills',
  'Consider mentoring in delegation',
  'Leverage collaboration strengths',
];

function title(s) {
  console.log(`\n${BOLD}${CYAN}━━━ ${s} ━━━${RESET}\n`);
}

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ${PASS}  ${label}`);
  } else {
    console.log(`  ${FAIL}  ${label}${detail ? `\n       ${RED}${detail}${RESET}` : ''}`);
    process.exitCode = 1;
  }
}

// ─────────────────────────────────────────────────
title('1. Load & Validate Leadership Test Data');

const rawData = JSON.parse(readFileSync('examples/sample-leadership.json', 'utf8'));

let valid = true;
try {
  validateAssessment(rawData);
} catch (err) {
  valid = false;
}
check('Schema validation passed', valid);

check('assessmentId = "assessment-leadership-v2" (matches registry)',
  rawData.assessmentId === 'assessment-leadership-v2');

check('assessmentType = "leadership"',
  rawData.assessmentType === 'leadership');

const scores = rawData.scores['P-LEAD-001'];
check('Scores loaded (5 dimensions)',
  scores && Object.keys(scores).length === 5,
  `Got: ${scores ? Object.keys(scores).length : 0}`);

console.log(`\n  Scores: ${JSON.stringify(scores)}`);

// ─────────────────────────────────────────────────
title('2. Resolver → Loader → Leadership Pack');

const packConfig = resolve(rawData.assessmentId);

check('Resolver returned valid config (no error)',
  packConfig && !packConfig.error,
  packConfig?.error ? `${packConfig.error}: ${packConfig.message}` : '');

check(`Pack ID = "${packConfig?.pack_id}" (expected: leadership)`,
  packConfig?.pack_id === 'leadership');

check(`Pack version = "${packConfig?.version}"`,
  packConfig?.version === '1.0.0');

check(`Dimensions: ${packConfig?.dimensions?.length} (expected: 5)`,
  packConfig?.dimensions?.length === 5,
  `Got: ${packConfig?.dimensions}`);

check(`Thresholds: strength≥${packConfig?.strength_threshold}, weakness≤${packConfig?.weakness_threshold}`,
  packConfig?.strength_threshold === 80 && packConfig?.weakness_threshold === 55);

// ─────────────────────────────────────────────────
title('3. RecommendationEngine → Run Leadership Data');

const engine = new RecommendationEngine(packConfig);
const engineResult = engine.generate({
  assessment_id: rawData.assessmentId,
  user_id: rawData.participants[0].participantId,
  type: 'leadership',
  scores,
});

check('Engine returned valid result (no error)',
  engineResult && !engineResult.error,
  engineResult?.error);

// ── Expected classification ──
// communication: 88 → STRENGTH (≥80)
// decisiveness: 52 → WEAKNESS (≤55)
// strategic_thinking: 91 → STRENGTH (≥80)
// people_development: 45 → WEAKNESS (≤55)
// execution: 72 → NEUTRAL (56-79)

check(`Strengths: ${engineResult?.strengths?.length} (expected: 2 — communication + strategic_thinking)`,
  engineResult?.strengths?.length === 2,
  `Components: ${engineResult?.strengths?.map(s => `${s.dimension}=${s.score}`).join(', ')}`);

check(`Weaknesses: ${engineResult?.weaknesses?.length} (expected: 2 — decisiveness + people_development)`,
  engineResult?.weaknesses?.length === 2,
  `Components: ${engineResult?.weaknesses?.map(w => `${w.dimension}=${w.score}`).join(', ')}`);

check(`Next Best Action: "${engineResult?.next_best_action?.focus_dimension}" (expected: people_development, score=45)`,
  engineResult?.next_best_action?.focus_dimension === 'people_development',
  `Got: ${engineResult?.next_best_action?.focus_dimension} (score=${engineResult?.next_best_action?.label})`);

check('Neutral dimensions NOT in output (execution=72)',
  ![...engineResult.strengths, ...engineResult.weaknesses]
    .some(x => x.dimension === 'execution'));

// ── Show detailed engine output ──
console.log(`\n  ${CYAN}── Engine Output Detail ──${RESET}`);
console.log(`  Version: ${engineResult.version}`);
console.log(`  Assessment: ${engineResult.assessment_id} / ${engineResult.type}`);
console.log(`\n  ${BOLD}Strengths:${RESET}`);
for (const s of engineResult.strengths) {
  console.log(`    ✓ ${s.label} (${s.score}): ${s.reason}`);
}
console.log(`\n  ${BOLD}Weaknesses:${RESET}`);
for (const w of engineResult.weaknesses) {
  console.log(`    ✗ ${w.label} (${w.score}): ${w.reason}`);
}
console.log(`\n  ${BOLD}Next Best Action:${RESET}`);
const nba = engineResult.next_best_action;
console.log(`    🎯 ${nba.label}`);
console.log(`       Action:    ${nba.action}`);
console.log(`       Rationale: ${nba.rationale}`);

// ─────────────────────────────────────────────────
title('4. Adapter (generateRecommendations) — End-to-End');

const validatedData = preprocessAssessmentData(rawData);
const adapterOutput = generateRecommendations({}, validatedData);

check('Adapter output is NOT the legacy stub',
  JSON.stringify(adapterOutput) !== JSON.stringify(LEGACY_STUB));

check('Adapter output is a non-empty string array',
  Array.isArray(adapterOutput) && adapterOutput.length > 0,
  `Got: ${adapterOutput?.length} items`);

check('Adapter output contains Leadership recommendations (not stub)',
  adapterOutput.some(r => r.includes('Communication') || r.includes('Decisiveness')),
  `First item: "${adapterOutput[0]?.substring(0, 60)}..."`);

console.log(`\n  ${CYAN}── Adapter Output (${adapterOutput.length} recommendations) ──${RESET}`);
adapterOutput.forEach((r, i) => {
  console.log(`  ${i + 1}. ${r}`);
});

// ─────────────────────────────────────────────────
title('5. End-to-End: Build HTML/PDF via assessment-builder');

import { buildAssessment } from '../components/assessment-builder.js';

const buildResult = await buildAssessment(rawData, {
  htmlPath: 'leadership-report.html',
  pdfPath: 'leadership-report.pdf',
});

check('Build succeeded', buildResult.success, buildResult.error);
check(`HTML generated: ${buildResult.files?.html || 'MISSING'}`,
  !!buildResult.files?.html);
check(`PDF generated:  ${buildResult.files?.pdf || 'MISSING'}`,
  !!buildResult.files?.pdf);

// Quick sanity: HTML contains leadership-specific content
if (buildResult.files?.html) {
  const htmlContent = readFileSync(buildResult.files.html, 'utf8');
  check('HTML contains assessment title',
    htmlContent.includes('Leadership Assessment'),
    'Missing title in rendered HTML');
  check('HTML contains participant name',
    htmlContent.includes('Arya Wirayuda'));
}

// ─────────────────────────────────────────────────
title('Summary');

console.log(`  Test data:    examples/sample-leadership.json`);
console.log(`  Registry:     ${rawData.assessmentId} → leadership v${packConfig.version}`);
console.log(`  Engine:       ${engineResult.strengths.length} strengths, ${engineResult.weaknesses.length} weaknesses, 1 next_best_action`);
console.log(`  Adapter:      ${adapterOutput.length} recommendation strings`);
console.log(`  HTML:         ${buildResult.files?.html || 'N/A'}`);
console.log(`  PDF:          ${buildResult.files?.pdf || 'N/A'}`);

if (process.exitCode === undefined || process.exitCode === 0) {
  console.log(`\n${GREEN}${BOLD}✓ End-to-End Proof Complete — Leadership Pack works.${RESET}\n`);
} else {
  console.log(`\n${RED}${BOLD}✗ Some checks failed — see above.${RESET}\n`);
  process.exit(1);
}
