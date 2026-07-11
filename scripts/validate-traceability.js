#!/usr/bin/env node

/**
 * validate-traceability.js — TM/RD Traceability Validator (TASK-023b)
 *
 * Validates that every word in reasons.js and actions.js can be traced
 * back to RD-001 via TM-001. This catches bugs like Intent(High) vs
 * Intent(Low) that structural validators and linters cannot detect.
 *
 * === CLI ===
 *   node scripts/validate-traceability.js <domain>   # validate single domain
 *   node scripts/validate-traceability.js --all       # validate all domains
 *   node scripts/validate-traceability.js --help      # show usage
 *
 * === Exit code ===
 *   0 = all valid
 *   1 = errors found
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const RUBRICS_DIR = path.join(DOCS_DIR, 'rubrics');
const PACKS_DIR = path.join(__dirname, '..', 'engines', 'recommendation', 'packs');

// ──────────────────────────────────────────────
//  CLI
// ──────────────────────────────────────────────

const arg = process.argv[2];

if (!arg || arg === '--help' || arg === '-h') {
  console.log('Usage:');
  console.log('  node scripts/validate-traceability.js <domain>   # validate single domain');
  console.log('  node scripts/validate-traceability.js --all       # validate all domains');
  console.log('  node scripts/validate-traceability.js --help      # show this help');
  process.exit(0);
}

if (arg === '--all') {
  const domains = findDomains();
  if (domains.length === 0) { console.log('No domains found.\n'); process.exit(0); }
  console.log(`\nValidating traceability for ${domains.length} domain(s)...\n`);
  const allResults = domains.map(d => validateTraceability(d));
  const totalErrors = allResults.reduce((s, r) => s + r.errors.length, 0);
  process.exit(totalErrors > 0 ? 1 : 0);
}

const result = validateTraceability(arg);
process.exit(result.errors.length > 0 ? 1 : 0);

// ──────────────────────────────────────────────
//  Core validation
// ──────────────────────────────────────────────

function validateTraceability(domainId) {
  const errors = [];
  const warnings = [];

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Traceability Validation — ${domainId}`);
  console.log(`${'═'.repeat(50)}`);

  // ── 1. Find RD and TM files ──
  let rdFile, tmFile, rdNum, tmNum;

  if (!fs.existsSync(RUBRICS_DIR)) {
    errors.push(`Rubrics directory not found: ${RUBRICS_DIR}`);
    printResult(errors, warnings);
    return { valid: false, errors, warnings };
  }

  const rubricFiles = fs.readdirSync(RUBRICS_DIR);

  // Find RD-XXX-<domain>.md
  for (const f of rubricFiles) {
    const m = f.match(/^RD-(\d+)-(.+)\.md$/);
    if (m && m[2] === domainId) { rdFile = path.join(RUBRICS_DIR, f); rdNum = m[1]; break; }
  }
  // Also try RD-001-leadership.md etc (without domain suffix? no, format is RD-XXX-domain.md)
  if (!rdFile) {
    // Try alternate pattern: RD-XXX.md (just number, no domain suffix)
    for (const f of rubricFiles) {
      const m = f.match(/^RD-(\d+)\.md$/);
      if (m) { rdFile = path.join(RUBRICS_DIR, f); rdNum = m[1]; break; }
    }
  }

  // Find TM-XXX-<domain>-mapping.md
  for (const f of rubricFiles) {
    const m = f.match(/^TM-(\d+)-(.+)-mapping\.md$/);
    if (m && m[2] === domainId) { tmFile = path.join(RUBRICS_DIR, f); tmNum = m[1]; break; }
  }

  if (!rdFile) {
    errors.push(`RD file not found for domain '${domainId}' in ${RUBRICS_DIR}`);
  } else {
    console.log(`  ✓ RD-${rdNum} found: ${path.relative(DOCS_DIR, rdFile)}`);
  }
  if (!tmFile) {
    errors.push(`TM file not found for domain '${domainId}' in ${RUBRICS_DIR}`);
  } else {
    console.log(`  ✓ TM-${tmNum} found: ${path.relative(DOCS_DIR, tmFile)}`);
  }

  if (!rdFile || !tmFile) {
    printResult(errors, warnings);
    return { valid: false, errors, warnings };
  }

  // ── 2. Parse TM mapping table ──
  const tmContent = fs.readFileSync(tmFile, 'utf-8');
  const tmEntries = parseTM(tmContent);

  if (tmEntries.length === 0) {
    errors.push('TM mapping table is empty or could not be parsed');
    printResult(errors, warnings);
    return { valid: false, errors, warnings };
  }

  const dimsInTm = [...new Set(tmEntries.map(e => e.dimension))];
  console.log(`  ✓ TM mapping table parsed: ${tmEntries.length} entries for ${dimsInTm.length} dimensions`);

  // ── 3. Load pack metadata ──
  let metadata;
  try {
    metadata = require(path.join(PACKS_DIR, domainId, 'metadata.js'));
  } catch (err) {
    errors.push(`Cannot load pack metadata: ${err.message}`);
    printResult(errors, warnings);
    return { valid: false, errors, warnings };
  }

  const packDims = metadata.dimensions || [];

  // ── 4. Load implementation files ──
  let reasons, actions;
  try {
    reasons = require(path.join(PACKS_DIR, domainId, 'reasons.js'));
    actions = require(path.join(PACKS_DIR, domainId, 'actions.js'));
  } catch (err) {
    errors.push(`Cannot load pack files: ${err.message}`);
    printResult(errors, warnings);
    return { valid: false, errors, warnings };
  }

  // ── 5. Verify dimension consistency ──
  const tmDims = new Set(dimsInTm);
  const packDimsSet = new Set(packDims);

  for (const d of packDims) {
    if (!tmDims.has(d)) {
      errors.push(`Dimension '${d}' in metadata but missing from TM`);
    }
  }
  for (const d of dimsInTm) {
    if (!packDimsSet.has(d)) {
      warnings.push(`Dimension '${d}' in TM but missing from metadata`);
    }
  }

  if (!errors.some(e => e.includes('missing from TM'))) {
    console.log('  ✓ All dimensions in metadata have TM entries');
  }

  // ── 6. Verify each TM entry has corresponding code ──
  let allTmHaveCode = true;
  let allWordingMatch = true;

  // Collect orphan code dimensions
  const reasonStrengthDims = new Set(Object.keys(reasons.strengths || {}));
  const reasonWeaknessDims = new Set(Object.keys(reasons.weaknesses || {}));
  const actionDims = new Set(Object.keys(actions || {}));

  for (const entry of tmEntries) {
    const { dimension, target, expectedText } = entry;

    // Determine which file and key to check
    let actualText = null;
    let targetDesc = '';

    if (target.includes('reasons.strengths')) {
      actualText = reasons.strengths ? reasons.strengths[dimension] : undefined;
      targetDesc = `reasons.strengths.${dimension}`;
    } else if (target.includes('reasons.weaknesses')) {
      actualText = reasons.weaknesses ? reasons.weaknesses[dimension] : undefined;
      targetDesc = `reasons.weaknesses.${dimension}`;
    } else if (target.includes('actions.')) {
      const actionEntry = actions[dimension];
      if (!actionEntry) {
        errors.push(`TM entry #${entry.num} maps to actions.${dimension} but no such action exists`);
        allTmHaveCode = false;
        continue;
      }

      // For actions, extract action and rationale from TM
      const tmActionText = entry.actionText;
      const tmRationaleText = entry.rationaleText;

      // Check action
      if (tmActionText && !fuzzyContains(actionEntry.action, tmActionText)) {
        errors.push(
          `TRACEABILITY BROKEN: actions.${dimension}.action does not match TM row ${entry.num}\n` +
          `    Expected in code: "${tmActionText.substring(0, 80)}"\n` +
          `    Actual in code:   "${(actionEntry.action || '').substring(0, 80)}"\n` +
          `    → actions.js ${dimension}.action may use wrong RD-001 intent`
        );
        allWordingMatch = false;
      }

      // Check rationale
      if (tmRationaleText && !fuzzyContains(actionEntry.rationale, tmRationaleText)) {
        warnings.push(
          `actions.${dimension}.rationale may not match TM row ${entry.num}`
        );
      }
      continue; // action handled separately above
    }

    // For reasons: check that the code exists and wording matches
    if (actualText === undefined || actualText === null) {
      errors.push(`TM entry #${entry.num} maps to ${targetDesc} but no code found`);
      allTmHaveCode = false;
    } else if (typeof actualText !== 'string' || actualText.length < 10) {
      warnings.push(`${targetDesc} is too short or empty`);
    } else if (expectedText && !fuzzyContains(actualText, expectedText)) {
      errors.push(
        `TRACEABILITY BROKEN: ${targetDesc} does not match TM row ${entry.num}\n` +
        `    Expected in code: "${expectedText.substring(0, 80)}"\n` +
        `    Actual in code:   "${actualText.substring(0, 80)}"`
      );
      allWordingMatch = false;
    }
  }

  if (allTmHaveCode) {
    console.log('  ✓ All TM entries have corresponding code in reasons.js/actions.js');
  } else {
    console.log('  ✗ Some TM entries missing code');
  }

  if (allWordingMatch) {
    console.log('  ✓ All reasons.js wording traceable to RD-001');
    console.log('  ✓ All actions.js wording traceable to RD-001');
  }

  // ── 7. Check for orphan code ──
  const orphanReasons = [...reasonStrengthDims, ...reasonWeaknessDims].filter(
    d => !tmDims.has(d) && packDimsSet.has(d)
  );
  const orphanActions = [...actionDims].filter(
    d => !tmDims.has(d) && packDimsSet.has(d)
  );

  if (orphanReasons.length > 0) {
    warnings.push(`Orphan reasons not in TM: ${[...new Set(orphanReasons)].join(', ')}`);
  }
  if (orphanActions.length > 0) {
    warnings.push(`Orphan actions not in TM: ${orphanActions.join(', ')}`);
  }

  if (orphanReasons.length === 0 && orphanActions.length === 0) {
    console.log('  ✓ No orphan mappings');
    console.log('  ✓ No orphan code');
  }

  // ── 8. Verify all actions use Recommendation Intent (Low) ──
  const lowIntentViolations = [];
  for (const entry of tmEntries) {
    if (entry.target.includes('actions.') && !entry.source.includes('Low')) {
      lowIntentViolations.push(`TM row ${entry.num}: actions.${entry.dimension} uses ${entry.source} (should be Recommendation Intent (Low))`);
    }
  }
  if (lowIntentViolations.length > 0) {
    errors.push(`Actions must use Recommendation Intent (Low): ${lowIntentViolations.join('; ')}`);
  } else {
    const actionCount = tmEntries.filter(e => e.target.includes('actions.')).length;
    console.log(`  ✓ All ${actionCount} actions use Recommendation Intent (Low) from RD-001`);
  }

  // ── Print result ──
  printResult(errors, warnings);
  return { valid: errors.length === 0, errors, warnings };
}

// ──────────────────────────────────────────────
//  TM Parser
// ──────────────────────────────────────────────

function parseTM(content) {
  const entries = [];
  const lines = content.split('\n');
  let inTable = false;

  for (const line of lines) {
    // Detect table: starts with | and contains |---| (header separator)
    if (line.startsWith('|---')) { inTable = true; continue; }
    if (!inTable) continue;
    if (!line.startsWith('|')) { inTable = false; continue; }

    // Parse row: | # | Source | Section | Template Target | File | Result |
    const cols = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cols.length < 6) continue;

    const num = parseInt(cols[0]);
    if (isNaN(num)) continue; // header row

    const source = cols[1];
    const section = cols[2];
    const target = cols[3].replace(/`/g, '');
    const resultText = cols[5];

    // Extract dimension from target (e.g., "reasons.strengths.motivation" → "motivation")
    const dimMatch = target.match(/\.(\w+)$/);
    const dimension = dimMatch ? dimMatch[1] : 'unknown';

    // Parse compound result (action + rationale)
    let expectedText = resultText;
    let actionText = null;
    let rationaleText = null;

    if (resultText.includes('**action:**')) {
      const actionMatch = resultText.match(/\*\*action:\*\*\s*(.+?)(?:\s*\*\*rationale:|$)/);
      const rationaleMatch = resultText.match(/\*\*rationale:\*\*\s*(.+)$/);
      if (actionMatch) actionText = actionMatch[1].trim();
      if (rationaleMatch) rationaleText = rationaleMatch[1].trim();
      expectedText = resultText;
    }

    entries.push({
      num, source, section, target, dimension,
      resultText, expectedText, actionText, rationaleText,
    });
  }

  return entries;
}

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

/**
 * Fuzzy contains: check if actualText contains the expected substring,
 * normalized by collapsing whitespace and ignoring {score} differences.
 */
function fuzzyContains(actual, expected) {
  if (!actual || !expected) return false;

  // Normalize: collapse whitespace
  const norm = (s) => s.replace(/\s+/g, ' ').trim();

  const a = norm(actual);
  const e = norm(expected);

  // Exact match after normalization
  if (a === e) return true;

  // Check if expected text is a substring of actual (after normalization)
  // But first, try to extract the pure text without {score} variants
  const eWithoutScore = e.replace(/\{score\}/g, '');
  const aWithoutScore = a.replace(/\{score\}/g, '');

  // Direct substring after removing score placeholders
  if (aWithoutScore.includes(eWithoutScore)) return true;

  // For short expected text, check significant words
  if (e.length < 30) return a.includes(e) || norm(a).includes(norm(e));

  // Check if at least 80% of expected text's significant words appear
  const eWords = eWithoutScore.split(' ').filter(w => w.length > 3);
  const aWords = aWithoutScore.split(' ').filter(w => w.length > 3);
  const matchCount = eWords.filter(w => aWords.includes(w)).length;
  return matchCount >= Math.ceil(eWords.length * 0.8);
}

function findDomains() {
  const domains = new Set();

  // Scan rubrics for RD-XXX-<domain>.md
  if (fs.existsSync(RUBRICS_DIR)) {
    for (const f of fs.readdirSync(RUBRICS_DIR)) {
      const m = f.match(/^RD-\d+-(.+)\.md$/);
      if (m) domains.add(m[1]);
    }
  }

  // Also check packs directory
  if (fs.existsSync(PACKS_DIR)) {
    for (const f of fs.readdirSync(PACKS_DIR)) {
      if (fs.statSync(path.join(PACKS_DIR, f)).isDirectory()) {
        domains.add(f);
      }
    }
  }

  return [...domains];
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
    console.log('  ✅ PASSED — traceability is complete');
  } else {
    console.log('  ❌ FAILED — traceability broken');
  }
  console.log('');
}
