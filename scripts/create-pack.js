#!/usr/bin/env node

/**
 * create-pack.js — Domain Pack Template Generator
 *
 * Generates a complete Domain Pack scaffold from SPEC-002.
 * Run: node scripts/create-pack.js <pack_id>
 *
 * Output:
 *   engines/recommendation/packs/<pack_id>/
 *   ├── metadata.js       # Identity & dimensions (TODO: fill domain data)
 *   ├── thresholds.js     # Default 80/55 (TODO: calibrate)
 *   ├── reasons.js        # Template catalog (TODO: write domain wording)
 *   └── actions.js        # Action library (TODO: define actions)
 *
 * After generation, the script runs loader.loadPack() to validate
 * completeness against SPEC-002 §1e.
 */

const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────
//  CLI
// ──────────────────────────────────────────────

const packId = process.argv[2];

if (!packId) {
  console.error('Usage: node scripts/create-pack.js <pack_id>');
  console.error('Example: node scripts/create-pack.js competency');
  process.exit(1);
}

// Sanitize: only allow alphanumeric, hyphens, underscores
if (!/^[a-z][a-z0-9_-]*$/.test(packId)) {
  console.error(`Error: pack_id "${packId}" is invalid.`);
  console.error('  Must start with a letter and contain only lowercase letters, digits, hyphens, or underscores.');
  process.exit(1);
}

const packDir = path.join(__dirname, '..', 'engines', 'recommendation', 'packs', packId);

if (fs.existsSync(packDir)) {
  console.error(`Error: Pack directory already exists: ${packDir}`);
  console.error('  Delete it first or use a different pack_id.');
  process.exit(1);
}

// ──────────────────────────────────────────────
//  Generate
// ──────────────────────────────────────────────

console.log(`\nCreating Domain Pack: ${packId}\n`);

fs.mkdirSync(packDir, { recursive: true });

// ── metadata.js ──
writeFile('metadata.js', metadataTemplate(packId));

// ── thresholds.js ──
writeFile('thresholds.js', thresholdsTemplate(packId));

// ── reasons.js ──
writeFile('reasons.js', reasonsTemplate(packId));

// ── actions.js ──
writeFile('actions.js', actionsTemplate(packId));

console.log('');

// ──────────────────────────────────────────────
//  Validate
// ──────────────────────────────────────────────

console.log('Validating pack completeness (SPEC-002 §1e)...\n');

// Bust require cache so we load the fresh files
Object.keys(require.cache).forEach((key) => {
  if (key.includes(path.join('packs', packId))) {
    delete require.cache[key];
  }
});

const { loadPack } = require('../engines/recommendation/loader');

try {
  const config = loadPack(packId);
  console.log(`  ✓ pack_id:     ${config.pack_id}`);
  console.log(`  ✓ version:     ${config.version}`);
  console.log(`  ✓ dimensions:  ${config.dimensions.length} (${config.dimensions.join(', ')})`);
  console.log(`  ✓ thresholds:  ${config.strength_threshold}/${config.weakness_threshold}`);
  console.log(`  ✓ reasons:     strengths + weaknesses for all ${config.dimensions.length} dimensions`);
  console.log(`  ✓ actions:     ${Object.keys(config.actions).length} entries`);
  console.log(`\n  Validation: PASSED — pack is structurally complete.\n`);
} catch (err) {
  console.error(`\n  ✗ Validation FAILED: ${err.message}\n`);
  console.error('  The generated pack has structural issues. Check the templates above.');
  process.exit(1);
}

// ──────────────────────────────────────────────
//  Instructions
// ──────────────────────────────────────────────

console.log('Next steps:');
console.log(`  1. Edit dimensions in:  ${path.join(packDir, 'metadata.js')}`);
console.log(`  2. Calibrate thresholds: ${path.join(packDir, 'thresholds.js')}`);
console.log(`  3. Write reason text:    ${path.join(packDir, 'reasons.js')}`);
console.log(`  4. Define actions:       ${path.join(packDir, 'actions.js')}`);
console.log(`  5. Add to registry:      engines/recommendation/registry.js`);
console.log(`  6. Run tests:            node tests/loader-resolver.test.js`);
console.log('');

// ──────────────────────────────────────────────
//  Templates
// ──────────────────────────────────────────────

function metadataTemplate(id) {
  const displayName = id
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return `/**
 * ${displayName} Domain Pack — Metadata
 *
 * TODO: Isi dimensi assessment yang sebenarnya.
 * Contoh dimensi saat ini adalah placeholder — ganti dengan dimensi
 * yang sudah didefinisikan oleh rubric designer.
 *
 * @pack_id  ${id}
 * @version  0.1.0
 */
module.exports = {
  // ── REQUIRED ──────────────────────────────────────────
  pack_id: '${id}',
  display_name: '${displayName} Assessment',
  version: '0.1.0',              // TODO: bump saat threshold atau dimensi berubah
  dimensions: [
    // TODO: GANTI dengan dimensi assessment yang sebenarnya
    'dimension_one',
    'dimension_two',
    'dimension_three',
  ],

  // ── OPTIONAL ──────────────────────────────────────────
  description: 'TODO: Deskripsi singkat assessment ini.',
  rubric_version: 'TODO',        // versi rubric yang digunakan
  locale: 'id',

  // ── DISPLAY ───────────────────────────────────────────
  labels: {
    // TODO: GANTI dengan display label yang sebenarnya
    dimension_one:   'TODO: Label Dimension One',
    dimension_two:   'TODO: Label Dimension Two',
    dimension_three: 'TODO: Label Dimension Three',
  },
};
`;
}

function thresholdsTemplate(id) {
  return `/**
 * ${id} Domain Pack — Threshold Map
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

function reasonsTemplate(id) {
  return `/**
 * ${id} Domain Pack — Reason Template Catalog
 *
 * TODO: Tulis reason template yang kontekstual untuk setiap dimensi.
 * Setiap dimensi butuh 1 template strength + 1 template weakness.
 *
 * Placeholder {score} akan di-substitusi otomatis oleh Core Engine.
 * Jangan hapus placeholder — ini adalah kontrak dengan engine.
 *
 * Format: "Skor {score} menunjukkan ..."
 */
module.exports = {
  strengths: {
    // TODO: GANTI dengan reason template yang sebenarnya
    dimension_one:
      'TODO: Skor {score} pada dimension_one menunjukkan performa di atas threshold.',
    dimension_two:
      'TODO: Skor {score} pada dimension_two menunjukkan performa di atas threshold.',
    dimension_three:
      'TODO: Skor {score} pada dimension_three menunjukkan performa di atas threshold.',
  },
  weaknesses: {
    // TODO: GANTI dengan reason template yang sebenarnya
    dimension_one:
      'TODO: Skor {score} pada dimension_one berada di bawah threshold.',
    dimension_two:
      'TODO: Skor {score} pada dimension_two berada di bawah threshold.',
    dimension_three:
      'TODO: Skor {score} pada dimension_three berada di bawah threshold.',
  },
};
`;
}

function actionsTemplate(id) {
  return `/**
 * ${id} Domain Pack — Action Library
 *
 * TODO: Definisikan aksi konkret untuk setiap dimensi.
 * Setiap dimensi butuh 1 action + 1 rationale.
 *
 * Placeholder {score} akan di-substitusi otomatis oleh Core Engine.
 * Jangan hapus placeholder — ini adalah kontrak dengan engine.
 */
module.exports = {
  // TODO: GANTI dengan action yang sebenarnya
  dimension_one: {
    action:
      'TODO: Tindakan konkret yang direkomendasikan untuk dimension_one. Placeholder: {score}.',
    rationale:
      'TODO: Alasan pemilihan aksi ini. Dimension One adalah dimensi terendah ({score}).',
  },
  dimension_two: {
    action:
      'TODO: Tindakan konkret yang direkomendasikan untuk dimension_two. Placeholder: {score}.',
    rationale:
      'TODO: Alasan pemilihan aksi ini. Dimension Two adalah dimensi terendah ({score}).',
  },
  dimension_three: {
    action:
      'TODO: Tindakan konkret yang direkomendasikan untuk dimension_three. Placeholder: {score}.',
    rationale:
      'TODO: Alasan pemilihan aksi ini. Dimension Three adalah dimensi terendah ({score}).',
  },
};
`;
}

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

function writeFile(filename, content) {
  const filePath = path.join(packDir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✓ ${filename}`);
}
