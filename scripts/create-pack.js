#!/usr/bin/env node

/**
 * create-pack.js — Domain Pack Template Generator (v2)
 *
 * Generates a complete, governance-compliant Domain Pack scaffold.
 * Creates: RD template, TM template, pack files, test template.
 *
 * === CLI mode ===
 *   node scripts/create-pack.js <domain_id> <display_name> <version> <dim1,dim2,...>
 *
 *   Example:
 *   node scripts/create-pack.js disc "DISC Assessment" 1.0.0 dominance,influence,steadiness,conscientiousness
 *
 * === Interactive mode ===
 *   node scripts/create-pack.js
 *
 * Output:
 *   docs/rubrics/RD-XXX-<domain>.md         # Rubric template (TODO: fill with PO)
 *   docs/rubrics/TM-XXX-<domain>.md         # Mapping template (TODO: derive from RD)
 *   engines/recommendation/packs/<domain>/
 *     metadata.js                            # Identity & dimensions
 *     thresholds.js                          # Default 80/55
 *     reasons.js                             # TODO markers for all wording
 *     actions.js                             # TODO markers for all wording
 *   tests/<domain>.test.js                   # Test template
 *
 * Governance: follows Rule Zero — no wording is generated.
 * All reason/action text uses explicit TODO markers.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ──────────────────────────────────────────────
//  CLI / Interactive input
// ──────────────────────────────────────────────

async function main() {
  let domainId, displayName, version, dimensions;

  if (process.argv.length >= 5) {
    // CLI mode
    domainId = process.argv[2];
    displayName = process.argv[3];
    version = process.argv[4];
    dimensions = process.argv[5] ? process.argv[5].split(',').map(d => d.trim()) : [];
    if (dimensions.length === 1 && dimensions[0] === '') dimensions = [];
  } else if (process.argv.length >= 3) {
    // Legacy mode: just pack_id
    domainId = process.argv[2];
    displayName = domainId.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Assessment';
    version = '0.1.0';
    dimensions = [];
  } else {
    // Interactive mode
    const result = await promptAll();
    domainId = result.domainId;
    displayName = result.displayName;
    version = result.version;
    dimensions = result.dimensions;
  }

  // Validate
  if (!/^[a-z][a-z0-9_-]*$/.test(domainId)) {
    console.error(`Error: domain_id "${domainId}" is invalid.`);
    console.error('  Must start with a letter and contain only lowercase letters, digits, hyphens, or underscores.');
    process.exit(1);
  }

  const packDir = path.join(__dirname, '..', 'engines', 'recommendation', 'packs', domainId);
  if (fs.existsSync(packDir)) {
    console.error(`Error: Pack directory already exists: ${packDir}`);
    console.error('  Delete it first or use a different domain_id.');
    process.exit(1);
  }

  // Generate
  const nextRdNum = getNextRdNumber();
  const rdId = `RD-${String(nextRdNum).padStart(3, '0')}`;
  const tmId = `TM-${String(nextRdNum).padStart(3, '0')}`;

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Domain Pack Generator v2                    ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  domain:     ${domainId.padEnd(32)}║`);
  console.log(`║  display:    ${displayName.padEnd(32)}║`);
  console.log(`║  version:    ${version.padEnd(32)}║`);
  console.log(`║  dimensions: ${dimensions.length.toString().padEnd(32)}║`);
  console.log(`║  RD:         ${rdId.padEnd(32)}║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // ── 1. docs/rubrics/ ──
  const rubricsDir = path.join(__dirname, '..', 'docs', 'rubrics');
  fs.mkdirSync(rubricsDir, { recursive: true });
  writeFile(path.join(rubricsDir, `${rdId}-${domainId}.md`), rdTemplate(rdId, domainId, displayName, dimensions));
  writeFile(path.join(rubricsDir, `${tmId}-${domainId}-mapping.md`), tmTemplate(tmId, rdId, domainId, displayName, dimensions));

  // ── 2. engines/recommendation/packs/<domain>/ ──
  fs.mkdirSync(packDir, { recursive: true });
  writeFile(path.join(packDir, 'metadata.js'), metadataTemplate(domainId, displayName, version, dimensions));
  writeFile(path.join(packDir, 'thresholds.js'), thresholdsTemplate(domainId));
  writeFile(path.join(packDir, 'reasons.js'), reasonsTemplate(domainId, dimensions));
  writeFile(path.join(packDir, 'actions.js'), actionsTemplate(domainId, dimensions));

  // ── 3. tests/ ──
  const testsDir = path.join(__dirname, '..', 'tests');
  writeFile(path.join(testsDir, `${domainId}.test.js`), testTemplate(domainId, displayName, dimensions));

  console.log('');

  // ── 4. Validate ──
  console.log('Validating pack completeness (SPEC-002 §1e)...\n');
  Object.keys(require.cache).forEach((key) => {
    if (key.includes(path.join('packs', domainId))) delete require.cache[key];
  });
  const { loadPack } = require('../engines/recommendation/loader');

  try {
    const config = loadPack(domainId);
    console.log(`  ✓ pack_id:     ${config.pack_id}`);
    console.log(`  ✓ version:     ${config.version}`);
    console.log(`  ✓ dimensions:  ${config.dimensions.length} (${config.dimensions.join(', ')})`);
    console.log(`  ✓ thresholds:  ${config.strength_threshold}/${config.weakness_threshold}`);
    console.log(`  ✓ reasons:     strengths + weaknesses for all ${config.dimensions.length} dimensions`);
    console.log(`  ✓ actions:     ${Object.keys(config.actions).length} entries`);
    console.log(`\n  ✅ Validation: PASSED — pack is structurally complete.\n`);
  } catch (err) {
    console.error(`\n  ✗ Validation FAILED: ${err.message}\n`);
    process.exit(1);
  }

  // ── 5. Next steps ──
  console.log('Next steps:');
  console.log(`  1. Write rubric with Product Owner:  docs/rubrics/${rdId}-${domainId}.md`);
  console.log(`  2. Create language mapping from RD:   docs/rubrics/${tmId}-${domainId}-mapping.md`);
  console.log(`  3. Fill reason text from TM:         engines/recommendation/packs/${domainId}/reasons.js`);
  console.log(`  4. Fill action text from TM:         engines/recommendation/packs/${domainId}/actions.js`);
  console.log(`  5. Calibrate thresholds:             engines/recommendation/packs/${domainId}/thresholds.js`);
  console.log(`  6. Add to registry:                  engines/recommendation/registry.js`);
  console.log(`  7. Fill test assertions:             tests/${domainId}.test.js`);
  console.log(`  8. Run tests:                        node tests/${domainId}.test.js`);
  console.log('');
}

// ──────────────────────────────────────────────
//  Interactive prompts
// ──────────────────────────────────────────────

function promptAll() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const result = {};

    function ask(q, key, transform) {
      return new Promise((res) => {
        rl.question(q, (answer) => {
          result[key] = transform ? transform(answer) : answer;
          res();
        });
      });
    }

    (async () => {
      console.log('\nDomain Pack Generator — Interactive Mode\n');
      await ask('Domain ID (e.g. disc, sales, cpns): ', 'domainId');
      await ask('Display Name (e.g. DISC Assessment): ', 'displayName');
      await ask('Version (default: 1.0.0): ', 'version', (v) => v || '1.0.0');
      await ask('Dimensions (comma-separated, e.g. dominance,influence,steadiness): ', 'dimensionsRaw');
      result.dimensions = result.dimensionsRaw ? result.dimensionsRaw.split(',').map(d => d.trim()).filter(Boolean) : [];
      delete result.dimensionsRaw;
      rl.close();
      resolve(result);
    })();
  });
}

// ──────────────────────────────────────────────
//  Templates — docs/rubrics/
// ──────────────────────────────────────────────

function rdTemplate(rdId, domainId, displayName, dimensions) {
  const dimSections = dimensions.map(d =>
    `## ${toLabel(d)}\n\n` +
    `Evidence Source: TODO — pertanyaan assessment yang relevan.\n\n` +
    `Construct: TODO — definisi konstruk psikometri untuk ${toLabel(d)}.\n\n` +
    `High Interpretation: TODO — interpretasi untuk skor tinggi.\n\n` +
    `Low Interpretation: TODO — interpretasi untuk skor rendah.\n\n` +
    `Do Not Infer: TODO — hal-hal yang TIDAK BOLEH disimpulkan dari dimensi ini.\n\n` +
    `Recommendation Intent (High): TODO — maksud rekomendasi untuk skor tinggi.\n\n` +
    `Recommendation Intent (Low): TODO — maksud rekomendasi untuk skor rendah.\n\n` +
    `Confidence Note: TODO — catatan tentang keterbatasan interpretasi.\n`
  ).join('\n---\n\n');

  return `# ${rdId}: Rubric Definition — ${displayName}

| Metadata | Value |
|---|---|
| Status | Draft |
| Domain | ${domainId} |
| Version | TODO |
| Related | TODO |

## Allowed Language

Boleh: TODO — kata/frasa yang diperbolehkan dalam output rekomendasi.

Tidak boleh: TODO — kata/frasa yang DILARANG dalam output rekomendasi.

---

${dimSections}
`;
}

function tmTemplate(tmId, rdId, domainId, displayName, dimensions) {
  const rows = [];
  dimensions.forEach((d, i) => {
    rows.push(`| ${i * 3 + 1} | High Interpretation | ${toLabel(d)} | \`reasons.strengths.${d}\` | \`reasons.js\` | TODO: Skor {score} ... |`);
    rows.push(`| ${i * 3 + 2} | Low Interpretation | ${toLabel(d)} | \`reasons.weaknesses.${d}\` | \`reasons.js\` | TODO: Skor {score} ... |`);
    rows.push(`| ${i * 3 + 3} | Recommendation Intent (Low) | ${toLabel(d)} | \`actions.${d}\` | \`actions.js\` | **action:** TODO ... **rationale:** ${toLabel(d)} adalah dimensi dengan skor terendah ({score}). |`);
  });

  return `# ${tmId}: Language Mapping — ${rdId} → Recommendation Engine Templates

| Metadata | Value |
|---|---|
| Status | Draft |
| Source | ${rdId} (TODO: date) |
| Purpose | Audit trail: setiap kata di reasons.js dan actions.js dapat ditelusuri ke ${rdId} |
| Domain | ${domainId} |
| RD Version | ${rdId} v1.0 |
| TM Version | ${tmId} v1.0 |

---

## Mapping Table

| # | ${rdId} Source | ${rdId} Section | Template Target | File | Result |
|---|---------------|----------------|-----------------|------|--------|
${rows.join('\n')}

---

## Rule Zero

TM-001 MAY ONLY perform:
- placeholder substitution ({score})
- grammatical adjustment (subject replacement)
- mechanical transformation

TM-001 MUST NOT:
- introduce new meaning
- introduce new inference
- introduce new recommendation
- strengthen or weaken certainty
- expand construct scope

---

## Transformation Rules

| ${rdId} Pattern | Template Pattern | Rationale |
|----------------|------------------|-----------|
| TODO | TODO | TODO |

---

## Verification Checklist

☐ Every sentence in ${tmId} exists in ${rdId}
☐ No additional interpretation introduced
☐ Placeholder {score} substitution only
☐ Mapping complete for all ${dimensions.length} dimensions
☐ Product Owner wording preserved verbatim
☐ Rule Zero compliance verified
`;
}

// ──────────────────────────────────────────────
//  Templates — engines/recommendation/packs/
// ──────────────────────────────────────────────

function metadataTemplate(id, displayName, version, dimensions) {
  const dimsArr = dimensions.length > 0
    ? dimensions.map(d => `    '${d}',`).join('\n')
    : `    // TODO: GANTI dengan dimensi assessment yang sebenarnya\n    'dimension_one',\n    'dimension_two',\n    'dimension_three',`;

  const labelsObj = dimensions.length > 0
    ? dimensions.map(d => `    ${d}: '${toLabel(d)}',`).join('\n')
    : `    // TODO: GANTI dengan display label yang sebenarnya\n    dimension_one:   'TODO: Label One',\n    dimension_two:   'TODO: Label Two',\n    dimension_three: 'TODO: Label Three',`;

  return `/**
 * ${displayName} Domain Pack — Metadata
 *
 * Generated by create-pack.js (TASK-021).
 *
 * TODO: Isi dimensi assessment yang sebenarnya jika menggunakan placeholder.
 * TODO: Tentukan maxScale (skala penilaian assessment).
 *
 * @pack_id  ${id}
 * @version  ${version}
 */
module.exports = {
  // ── REQUIRED ──────────────────────────────────────────
  pack_id: '${id}',
  display_name: '${displayName}',
  version: '${version}',
  dimensions: [
${dimsArr}
  ],

  // ── OPTIONAL ──────────────────────────────────────────
  description: 'TODO: Deskripsi singkat assessment ini.',
  rubric_version: 'TODO',
  locale: 'id',
  maxScale: 5,                     // TODO: sesuaikan dengan skala assessment

  // ── DISPLAY ───────────────────────────────────────────
  labels: {
${labelsObj}
  },
};
`;
}

function thresholdsTemplate(id) {
  return `/**
 * ${id} Domain Pack — Threshold Map
 *
 * Generated by create-pack.js (TASK-021).
 *
 * TODO: Kalibrasi threshold berdasarkan data historis atau psikometri.
 * Default 80/55 adalah nilai awal — mungkin tidak valid untuk domain ini.
 *
 * Constraint: strength_threshold HARUS > weakness_threshold (SPEC-002 §1b).
 */
module.exports = {
  strength_threshold: 80, // TODO: kalibrasi — ≥ threshold ini → STRENGTH
  weakness_threshold: 55, // TODO: kalibrasi — ≤ threshold ini → WEAKNESS
                           // di antaranya → NEUTRAL (tidak muncul di output)
};
`;
}

function reasonsTemplate(id, dimensions) {
  const dims = dimensions.length > 0 ? dimensions : ['dimension_one', 'dimension_two', 'dimension_three'];

  const strengths = dims.map(d =>
    `    ${d}:\n      'TODO: Skor {score} pada ${d} menunjukkan performa di atas threshold.',`
  ).join('\n');

  const weaknesses = dims.map(d =>
    `    ${d}:\n      'TODO: Skor {score} pada ${d} berada di bawah threshold.',`
  ).join('\n');

  return `/**
 * ${id} Domain Pack — Reason Template Catalog
 *
 * Generated by create-pack.js (TASK-021).
 *
 * ⚠️  SEMUA template saat ini adalah TODO — BELUM ada wording final.
 *     Wording berasal dari RD (ditulis Product Owner), dimapping ke sini
 *     melalui TM (Language Mapping).
 *
 * Placeholder {score} akan di-substitusi otomatis oleh Core Engine.
 * Jangan hapus placeholder — ini adalah kontrak dengan engine.
 */
module.exports = {
  strengths: {
${strengths}
  },
  weaknesses: {
${weaknesses}
  },
};
`;
}

function actionsTemplate(id, dimensions) {
  const dims = dimensions.length > 0 ? dimensions : ['dimension_one', 'dimension_two', 'dimension_three'];

  const entries = dims.map(d =>
    `  ${d}: {\n    action:\n      'TODO: Tindakan konkret yang direkomendasikan untuk ${d}. Placeholder: {score}.',\n    rationale:\n      'TODO: Alasan pemilihan aksi ini. ${toLabel(d)} adalah dimensi terendah ({score}).',\n  },`
  ).join('\n');

  return `/**
 * ${id} Domain Pack — Action Library
 *
 * Generated by create-pack.js (TASK-021).
 *
 * ⚠️  SEMUA action saat ini adalah TODO — BELUM ada wording final.
 *     Wording berasal dari RD (ditulis Product Owner), dimapping ke sini
 *     melalui TM (Language Mapping).
 *
 * NBA (next_best_action) selalu memilih dimensi dengan skor terendah,
 * sehingga semua action menggunakan Recommendation Intent (Low) dari RD.
 */
module.exports = {
${entries}
};
`;
}

// ──────────────────────────────────────────────
//  Template — tests/
// ──────────────────────────────────────────────

function testTemplate(id, displayName, dimensions) {
  const dims = dimensions.length > 0 ? dimensions : ['dimension_one', 'dimension_two', 'dimension_three'];

  const sampleScores = dims.map((d, i) => `      ${d}: ${90 - i * 25},`).join('\n');

  return `#!/usr/bin/env node

/**
 * Test suite: ${displayName} Recommendation Pack
 *
 * Generated by create-pack.js (TASK-021).
 *
 * TODO: Isi assertion dengan expected values setelah wording final diisi.
 * TODO: Ganti placeholder dimension names jika menggunakan default.
 */

const { resolve } = require('../engines/recommendation/resolver');
const { RecommendationEngine } = require('../engines/recommendation/index');

// TODO: ganti dengan assessment_id yang sesuai di registry
const packConfig = resolve('assessment-${id}-v1');
if (packConfig.error) throw new Error(\`Cannot resolve pack: \${packConfig.error}\`);

const engine = new RecommendationEngine(packConfig);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(\`  \\u2713 \${name}\`);
    passed++;
  } catch (err) {
    console.error(\`  \\u2717 \${name}\`);
    console.error(\`    \${err.message}\`);
    failed++;
  }
}

const SAMPLE_INPUT = {
  assessment_id: 'TODO-assessment-id',
  user_id: 'user-001',
  type: '${id}',
  scores: {
${sampleScores}
  },
};

// ── Validation ──
console.log('\\n\\u2550\\u2550\\u2550 Validation & Error Handling \\u2550\\u2550\\u2550');

test('empty scores → graceful degradation', () => {
  const result = engine.generate({
    assessment_id: 'test-empty', user_id: 'u1', type: '${id}', scores: {},
  });
  if (result.error) throw new Error('empty scores should not error');
  if (result.strengths.length !== 0) throw new Error('expected 0 strengths');
  if (result.next_best_action !== null) throw new Error('expected null NBA');
});

test('invalid score range → error', () => {
  const result = engine.generate({
    assessment_id: 'test-bad', user_id: 'u1', type: '${id}',
    scores: { ${dims[0]}: -5 },
  });
  if (result.error !== 'INVALID_SCORE_RANGE') throw new Error('expected INVALID_SCORE_RANGE');
});

test('unknown dimension → error', () => {
  const result = engine.generate({
    assessment_id: 'test-unk', user_id: 'u1', type: '${id}',
    scores: { nonexistent_dim: 50 },
  });
  if (result.error !== 'UNKNOWN_DIMENSION') throw new Error('expected UNKNOWN_DIMENSION');
});

// ── Happy Path ──
console.log('\\n\\u2550\\u2550\\u2550 Happy Path \\u2550\\u2550\\u2550');

test('output contains required fields', () => {
  const result = engine.generate(SAMPLE_INPUT);
  if (!result.version) throw new Error('version missing');
  if (!result.generated_at) throw new Error('generated_at missing');
  if (!result.assessment_id) throw new Error('assessment_id missing');
  if (!result.strengths) throw new Error('strengths missing');
  if (!result.weaknesses) throw new Error('weaknesses missing');
  if (!result.next_best_action) throw new Error('next_best_action missing');
});

test('output is deterministic', () => {
  const r1 = engine.generate(SAMPLE_INPUT);
  const r2 = engine.generate(SAMPLE_INPUT);
  const strip = (r) => { const { generated_at, ...rest } = r; return rest; };
  if (JSON.stringify(strip(r1)) !== JSON.stringify(strip(r2))) {
    throw new Error('output not deterministic');
  }
});

// ── TODO: Add more tests after wording is finalized ──
// test('reason text is non-trivial and has no placeholders', ...)
// test('NBA action matches RD wording', ...)

// ─────────────────────────────────────────────────
console.log(\`\\n\${'═'.repeat(40)}\`);
console.log(\`  Passed : \${passed}\`);
console.log(\`  Failed : \${failed}\`);
console.log(\`\${'═'.repeat(40)}\\n\`);

if (failed > 0) process.exit(1);
console.log('All tests passed.\\n');
process.exit(0);
`;
}

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8');
  const rel = path.relative(path.join(__dirname, '..'), filePath);
  console.log(`  ✓ ${rel}`);
}

function toLabel(key) {
  return key
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getNextRdNumber() {
  const rubricsDir = path.join(__dirname, '..', 'docs', 'rubrics');
  if (!fs.existsSync(rubricsDir)) return 2; // RD-001 already exists
  const files = fs.readdirSync(rubricsDir).filter(f => /^RD-\d+/.test(f));
  if (files.length === 0) return 2;
  const nums = files.map(f => parseInt(f.match(/^RD-(\d+)/)[1]));
  return Math.max(...nums) + 1;
}

// ──────────────────────────────────────────────
//  Run
// ──────────────────────────────────────────────

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
