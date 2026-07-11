#!/usr/bin/env node

/**
 * lint-pack.js — Domain Pack Linter (TASK-023)
 *
 * Checks code quality, formatting, and metadata consistency of Domain Packs.
 * Different from validate-pack.js: linter focuses on best practices, not
 * structural compliance.
 *
 * === CLI ===
 *   node scripts/lint-pack.js <pack_name>   # lint single pack
 *   node scripts/lint-pack.js --all          # lint all packs
 *   node scripts/lint-pack.js --help         # show usage
 *
 * === Exit code ===
 *   0 = all passed (warnings OK)
 *   1 = errors found
 */

const fs = require('fs');
const path = require('path');

const PACKS_DIR = path.join(__dirname, '..', 'engines', 'recommendation', 'packs');
const REQUIRED_FILES = ['metadata.js', 'thresholds.js', 'reasons.js', 'actions.js'];

// ──────────────────────────────────────────────
//  CLI
// ──────────────────────────────────────────────

const arg = process.argv[2];

if (!arg || arg === '--help' || arg === '-h') {
  console.log('Usage:');
  console.log('  node scripts/lint-pack.js <pack_name>   # lint single pack');
  console.log('  node scripts/lint-pack.js --all          # lint all packs');
  console.log('  node scripts/lint-pack.js --help         # show this help');
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
  if (packNames.length === 0) { console.log('No packs found.\n'); process.exit(0); }
  console.log(`\nLinting ${packNames.length} pack(s)...\n`);
  const allResults = packNames.map(name => lintPack(name));
  const totalErrors = allResults.reduce((s, r) => s + r.errors.length, 0);
  const totalWarnings = allResults.reduce((s, r) => s + r.warnings.length, 0);
  const totalSuggestions = allResults.reduce((s, r) => s + r.suggestions.length, 0);
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Packs linted:  ${packNames.length}`);
  console.log(`  Errors:        ${totalErrors}`);
  console.log(`  Warnings:      ${totalWarnings}`);
  console.log(`  Suggestions:   ${totalSuggestions}`);
  console.log(`${'═'.repeat(50)}\n`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

lintPack(arg);
process.exit(0);

// ──────────────────────────────────────────────
//  Core linting
// ──────────────────────────────────────────────

function lintPack(packName) {
  const errors = [];
  const warnings = [];
  const suggestions = [];
  const packDir = path.join(PACKS_DIR, packName);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Pack Linter — ${packName}`);
  console.log(`${'═'.repeat(50)}`);

  // ── File existence ──
  const missing = REQUIRED_FILES.filter(f => !fs.existsSync(path.join(packDir, f)));
  if (missing.length > 0) {
    missing.forEach(f => errors.push(`Missing file: ${f}`));
    printResult(errors, warnings, suggestions);
    return { passed: false, errors, warnings, suggestions };
  }

  // ── Load files ──
  let metadata, thresholds, reasons, actions;
  try {
    metadata = require(path.join(packDir, 'metadata.js'));
    thresholds = require(path.join(packDir, 'thresholds.js'));
    reasons = require(path.join(packDir, 'reasons.js'));
    actions = require(path.join(packDir, 'actions.js'));
  } catch (err) {
    errors.push(`Module load error: ${err.message}`);
    printResult(errors, warnings, suggestions);
    return { passed: false, errors, warnings, suggestions };
  }

  // ── a. Metadata completeness ──
  const requiredMeta = ['pack_id', 'display_name', 'version', 'dimensions', 'labels'];
  const missingMeta = requiredMeta.filter(f => !metadata[f]);
  if (missingMeta.length > 0) {
    missingMeta.forEach(f => errors.push(`metadata.${f} is missing`));
    console.log('  ✗ Metadata incomplete');
  } else {
    console.log('  ✓ Metadata complete (pack_id, display_name, version, dimensions, labels)');
  }

  const optionalMeta = ['description', 'rubric_version', 'locale', 'maxScale'];
  const missingOpt = optionalMeta.filter(f => !metadata[f]);
  if (missingOpt.length > 0) {
    suggestions.push(`Consider adding optional metadata fields: ${missingOpt.join(', ')}`);
  }

  // ── Version format ──
  if (metadata.version) {
    if (/^\d+\.\d+\.\d+$/.test(metadata.version)) {
      console.log(`  ✓ Version valid: ${metadata.version} (semver)`);
      // Warn on pre-release versions
      if (metadata.version.startsWith('0.')) {
        warnings.push(`Version ${metadata.version} is pre-release — stable packs should use ≥1.0.0`);
      }
    } else {
      errors.push(`metadata.version "${metadata.version}" is not valid semver`);
    }
  }

  // ── b. Recommendation consistency ──
  const dims = metadata.dimensions || [];
  const strengthKeys = reasons.strengths ? Object.keys(reasons.strengths) : [];
  const weaknessKeys = reasons.weaknesses ? Object.keys(reasons.weaknesses) : [];
  const actionKeys = Object.keys(actions || {});
  const labelKeys = Object.keys(metadata.labels || {});

  // Orphan checks
  const allReasonDims = new Set([...strengthKeys, ...weaknessKeys]);
  const allDims = new Set(dims);

  const orphanReasons = [...allReasonDims].filter(d => !allDims.has(d));
  const missingReasons = [...allDims].filter(d => !strengthKeys.includes(d) || !weaknessKeys.includes(d));
  const orphanActions = actionKeys.filter(d => !allDims.has(d));
  const missingActions = [...allDims].filter(d => !actionKeys.includes(d));

  if (orphanReasons.length > 0) {
    errors.push(`Orphan reasons (dimensions not in metadata): ${orphanReasons.join(', ')}`);
  }
  if (missingReasons.length > 0) {
    errors.push(`Missing reasons for dimensions: ${missingReasons.join(', ')}`);
  }
  if (orphanActions.length > 0) {
    errors.push(`Orphan actions (dimensions not in metadata): ${orphanActions.join(', ')}`);
  }
  if (missingActions.length > 0) {
    errors.push(`Missing actions for dimensions: ${missingActions.join(', ')}`);
  }

  if (orphanReasons.length === 0 && missingReasons.length === 0 && orphanActions.length === 0 && missingActions.length === 0) {
    console.log('  ✓ No orphan recommendations');
    console.log('  ✓ All dimensions have reasons + actions');
  } else {
    console.log('  ✗ Recommendation consistency: errors found');
  }

  // ── c. Threshold consistency ──
  const st = thresholds.strength_threshold;
  const wt = thresholds.weakness_threshold;

  if (typeof st !== 'number' || typeof wt !== 'number') {
    errors.push('Thresholds must be numbers');
  } else if (st <= wt) {
    errors.push(`strength_threshold (${st}) must be > weakness_threshold (${wt})`);
  } else {
    const gap = st - wt;
    if (gap < 10) {
      warnings.push(`Threshold gap is very small (${st} - ${wt} = ${gap}). Consider widening for clearer classification.`);
    } else if (gap < 20) {
      suggestions.push(`Threshold gap is moderate (${gap}). Adequate but consider reviewing.`);
    }
    console.log(`  ✓ Thresholds consistent (${st} > ${wt}, gap = ${gap})`);
  }

  // ── d. Code quality ──
  let consoleLogCount = 0;
  let todoCount = 0;
  let headerPresent = 0;
  let headerMissing = 0;

  for (const f of REQUIRED_FILES) {
    const content = fs.readFileSync(path.join(packDir, f), 'utf-8');

    // console.log check
    if (/console\.log/.test(content)) {
      errors.push(`${f} contains console.log — remove before production`);
      consoleLogCount++;
    }

    // TODO check
    const todoMatches = content.match(/TODO/g);
    if (todoMatches) {
      todoCount += todoMatches.length;
    }

    // Header comment check (should start with /* or //)
    const trimmed = content.trimStart();
    if (trimmed.startsWith('/*') || trimmed.startsWith('//') || trimmed.startsWith('/**')) {
      headerPresent++;
    } else {
      headerMissing++;
      warnings.push(`${f} is missing a header comment`);
    }
  }

  if (consoleLogCount === 0) {
    console.log('  ✓ No console.log in production code');
  }
  if (headerMissing === 0) {
    console.log('  ✓ Header comments present in all files');
  } else {
    console.log(`  ⚠ ${headerMissing} file(s) missing header comments`);
  }

  if (todoCount > 0) {
    warnings.push(`${todoCount} TODO marker(s) found across pack files`);
  }

  // ── e. File naming consistency ──
  const actualFiles = fs.readdirSync(packDir).filter(f => f.endsWith('.js'));
  const unexpected = actualFiles.filter(f => !REQUIRED_FILES.includes(f));
  if (unexpected.length > 0) {
    warnings.push(`Unexpected files in pack directory: ${unexpected.join(', ')}`);
  }

  const missingFromNaming = REQUIRED_FILES.filter(f => !actualFiles.includes(f));
  if (missingFromNaming.length === 0 && unexpected.length === 0) {
    console.log('  ✓ File naming consistent');
  }

  // ── Extra: label consistency ──
  const dimsWithoutLabels = [...allDims].filter(d => !labelKeys.includes(d));
  if (dimsWithoutLabels.length > 0) {
    errors.push(`Dimensions without labels: ${dimsWithoutLabels.join(', ')}`);
  }

  // ── Extra: template placeholder check ──
  const reasonsStr = JSON.stringify(reasons);
  const actionsStr = JSON.stringify(actions);
  if (reasonsStr.includes('[PLACEHOLDER')) {
    warnings.push('Reasons contain placeholder marker(s) — wording may be incomplete');
  }
  if (actionsStr.includes('[PLACEHOLDER')) {
    warnings.push('Actions contain placeholder marker(s) — wording may be incomplete');
  }

  // ── Print ──
  printResult(errors, warnings, suggestions);
  return { passed: errors.length === 0, errors, warnings, suggestions };
}

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

function printResult(errors, warnings, suggestions) {
  console.log('');
  if (errors.length > 0) {
    console.log('  Errors:');
    errors.forEach(e => console.log(`    ✗ ${e}`));
  }
  if (warnings.length > 0) {
    console.log('  Warnings:');
    warnings.forEach(w => console.log(`    ⚠ ${w}`));
  }
  if (suggestions.length > 0) {
    console.log('  Suggestions:');
    suggestions.forEach(s => console.log(`    💡 ${s}`));
  }

  const summary = [];
  if (errors.length === 0) summary.push('✅ PASSED — pack is lint-clean');
  else summary.push('❌ FAILED — pack has errors');
  if (warnings.length > 0 || suggestions.length > 0) {
    summary.push(`${warnings.length} warning(s), ${suggestions.length} suggestion(s)`);
  }
  console.log(`\n  ${summary.join('  |  ')}\n`);
}
