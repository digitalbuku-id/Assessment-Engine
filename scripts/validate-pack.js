#!/usr/bin/env node

/**
 * validate-pack.js — Domain Pack Validator (TASK-022)
 *
 * Validates structural, dimensional, and version consistency of a Domain Pack.
 *
 * === CLI ===
 *   node scripts/validate-pack.js <pack_name>   # validate single pack
 *   node scripts/validate-pack.js --all          # validate all packs
 *   node scripts/validate-pack.js --help         # show usage
 *
 * === Exit code ===
 *   0 = all valid
 *   1 = errors found
 */

const fs = require('fs');
const path = require('path');

const PACKS_DIR = path.join(__dirname, '..', 'engines', 'recommendation', 'packs');

// ──────────────────────────────────────────────
//  CLI
// ──────────────────────────────────────────────

const arg = process.argv[2];

if (!arg || arg === '--help' || arg === '-h') {
  console.log('Usage:');
  console.log('  node scripts/validate-pack.js <pack_name>   # validate single pack');
  console.log('  node scripts/validate-pack.js --all          # validate all packs');
  console.log('  node scripts/validate-pack.js --help         # show this help');
  process.exit(0);
}

if (arg === '--all') {
  if (!fs.existsSync(PACKS_DIR)) {
    console.error('Error: packs directory not found:', PACKS_DIR);
    process.exit(1);
  }
  const packNames = fs.readdirSync(PACKS_DIR).filter(f =>
    fs.statSync(path.join(PACKS_DIR, f)).isDirectory()
  );

  if (packNames.length === 0) {
    console.log('No packs found.\n');
    process.exit(0);
  }

  console.log(`\nValidating ${packNames.length} pack(s)...\n`);

  const allResults = packNames.map(name => validatePack(name));
  const totalErrors = allResults.reduce((sum, r) => sum + (r.errors ? r.errors.length : 0), 0);
  const totalWarnings = allResults.reduce((sum, r) => sum + (r.warnings ? r.warnings.length : 0), 0);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Packs checked: ${packNames.length}`);
  console.log(`  Errors:        ${totalErrors}`);
  console.log(`  Warnings:      ${totalWarnings}`);
  console.log(`${'═'.repeat(50)}\n`);

  process.exit(totalErrors > 0 ? 1 : 0);
}

// Single pack validation
const result = validatePack(arg);
process.exit(result.errors && result.errors.length > 0 ? 1 : 0);

// ──────────────────────────────────────────────
//  Core validation
// ──────────────────────────────────────────────

function validatePack(packName) {
  const errors = [];
  const warnings = [];
  const packDir = path.join(PACKS_DIR, packName);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Pack Validator — ${packName}`);
  console.log(`${'═'.repeat(50)}`);

  // ── 1. File existence ──
  const requiredFiles = ['metadata.js', 'thresholds.js', 'reasons.js', 'actions.js'];
  const missing = requiredFiles.filter(f => !fs.existsSync(path.join(packDir, f)));
  if (missing.length > 0) {
    missing.forEach(f => errors.push(`Missing file: ${f}`));
    console.log(`  ✗ File structure: ${missing.length} missing`);
    printResult(errors, warnings);
    return { valid: false, errors, warnings };
  }
  console.log('  ✓ File structure complete');

  // ── Load modules ──
  let metadata, thresholds, reasons, actions;
  try {
    metadata = require(path.join(packDir, 'metadata.js'));
    thresholds = require(path.join(packDir, 'thresholds.js'));
    reasons = require(path.join(packDir, 'reasons.js'));
    actions = require(path.join(packDir, 'actions.js'));
  } catch (err) {
    errors.push(`Module load error: ${err.message}`);
    printResult(errors, warnings);
    return { valid: false, errors, warnings };
  }

  // ── 2. Export structure ──
  const metaFields = ['pack_id', 'display_name', 'version', 'dimensions', 'labels'];
  const missingMeta = metaFields.filter(f => !metadata[f]);
  if (missingMeta.length > 0) {
    missingMeta.forEach(f => errors.push(`metadata.${f} is missing`));
    console.log('  ✗ Export structure: invalid');
  } else {
    console.log(`  ✓ Export structure valid`);
  }

  if (!reasons.strengths) errors.push('reasons.strengths is missing');
  if (!reasons.weaknesses) errors.push('reasons.weaknesses is missing');

  if (!thresholds.strength_threshold && thresholds.strength_threshold !== 0) errors.push('thresholds.strength_threshold is missing');
  if (!thresholds.weakness_threshold && thresholds.weakness_threshold !== 0) errors.push('thresholds.weakness_threshold is missing');

  // ── 3. Dimension consistency ──
  const dims = metadata.dimensions || [];
  if (dims.length === 0) {
    errors.push('metadata.dimensions is empty');
  } else {
    const strengthKeys = reasons.strengths ? Object.keys(reasons.strengths) : [];
    const weaknessKeys = reasons.weaknesses ? Object.keys(reasons.weaknesses) : [];
    const actionKeys = Object.keys(actions || {});
    const labelKeys = Object.keys(metadata.labels || {});

    if (!arraysEqual(dims, strengthKeys)) {
      errors.push(`Dimension mismatch: metadata.dimensions ≠ reasons.strengths keys`);
    }
    if (!arraysEqual(dims, weaknessKeys)) {
      errors.push(`Dimension mismatch: metadata.dimensions ≠ reasons.weaknesses keys`);
    }
    if (!arraysEqual(dims, actionKeys)) {
      errors.push(`Dimension mismatch: metadata.dimensions ≠ actions keys`);
    }
    if (!arraysEqual(dims, labelKeys)) {
      errors.push(`Dimension mismatch: metadata.dimensions ≠ labels keys`);
    }

    // Action structure check
    for (const d of dims) {
      if (actions[d]) {
        if (!actions[d].action) errors.push(`actions.${d}.action is missing`);
        if (!actions[d].rationale) errors.push(`actions.${d}.rationale is missing`);
      }
    }
  }

  if (errors.some(e => e.includes('Dimension mismatch') || e.includes('actions.'))) {
    console.log(`  ✗ Dimension consistency: errors found`);
  } else {
    console.log(`  ✓ Dimension consistency (${dims.length} dimensions)`);
  }

  // ── 4. Version consistency ──
  const version = metadata.version;
  if (!version) {
    errors.push('metadata.version is missing');
  } else if (!/^\d+\.\d+\.\d+$/.test(version)) {
    errors.push(`metadata.version "${version}" is not valid semver`);
  } else {
    console.log(`  ✓ Version: ${version} (valid semver)`);
  }

  // ── 5. Placeholder check ──
  const reasonsStr = JSON.stringify(reasons);
  const actionsStr = JSON.stringify(actions);

  if (reasonsStr.includes('[PLACEHOLDER')) {
    const matches = reasonsStr.match(/\[PLACEHOLDER[^\]]*\]/g);
    warnings.push(`Reasons contain ${matches.length} placeholder marker(s): ${matches.join(', ')}`);
  }
  if (actionsStr.includes('[PLACEHOLDER')) {
    const matches = actionsStr.match(/\[PLACEHOLDER[^\]]*\]/g);
    warnings.push(`Actions contain ${matches.length} placeholder marker(s): ${matches.join(', ')}`);
  }
  if (reasonsStr.includes('TODO:')) {
    const count = (reasonsStr.match(/TODO:/g) || []).length;
    warnings.push(`Reasons contain ${count} TODO marker(s)`);
  }
  if (actionsStr.includes('TODO:')) {
    const count = (actionsStr.match(/TODO:/g) || []).length;
    warnings.push(`Actions contain ${count} TODO marker(s)`);
  }
  // Note: {score} in template strings is EXPECTED — the engine substitutes it at runtime.
  // Only check for structural placeholder markers and TODO markers.

  if (warnings.length > 0) {
    console.log(`  ⚠ Placeholder check: ${warnings.length} warning(s)`);
  } else {
    console.log('  ✓ No placeholder markers');
  }

  // ── 6. Threshold check ──
  const st = thresholds.strength_threshold;
  const wt = thresholds.weakness_threshold;

  if (typeof st !== 'number' || typeof wt !== 'number') {
    errors.push('Thresholds must be numbers');
  } else {
    if (st <= wt) {
      errors.push(`strength_threshold (${st}) must be > weakness_threshold (${wt})`);
    }
    if (st < 0 || st > 100) {
      errors.push(`strength_threshold (${st}) out of range (0-100)`);
    }
    if (wt < 0 || wt > 100) {
      errors.push(`weakness_threshold (${wt}) out of range (0-100)`);
    }
  }

  if (errors.some(e => e.includes('Threshold') || e.includes('threshold'))) {
    console.log(`  ✗ Thresholds invalid`);
  } else {
    console.log(`  ✓ Thresholds valid (strength=${st}, weakness=${wt})`);
  }

  // ── Print result ──
  printResult(errors, warnings);

  return { valid: errors.length === 0, errors, warnings };
}

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function printResult(errors, warnings) {
  console.log('');
  if (errors.length > 0) {
    console.log('  Errors:');
    errors.forEach(e => console.log(`    ✗ ${e}`));
  }
  if (warnings.length > 0) {
    console.log('  Warnings:');
    warnings.forEach(w => console.log(`    ⚠ ${w}`));
  }
  if (errors.length === 0) {
    console.log('  ✅ PASSED — pack is compliant');
  } else {
    console.log('  ❌ FAILED — pack has errors');
  }
  console.log('');
}
