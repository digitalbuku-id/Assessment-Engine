/**
 * Unit tests: Persistence Adapter (ADR-006 Sprint P-1)
 *
 * Cakupan:
 *  - Import audit: hanya supabase-client.js yang mengimpor SDK Supabase
 *  - Recommendation Engine tetap zero Supabase reference
 *  - Base class (contract) melempar "must be implemented"
 *  - Concrete repository mewarisi contract (instanceof)
 *  - CRUD behavior (mocked Supabase client)
 *  - Error ownership: write throw raw; read not-found → null/[]
 */

const path = require('path');

let passed = 0;
let failed = 0;
const pending = [];

function test(name, fn) {
  pending.push(
    Promise.resolve()
      .then(fn)
      .then(
        () => { passed++; console.log(`  \u2713 ${name}`); },
        (err) => { failed++; console.error(`  \u2717 ${name}`); console.error(`    ${err && err.message ? err.message : err}`); }
      )
  );
}

// ─────────────────────────────────────────────────
//  Mock Supabase client (thenable fluent builder)
// ─────────────────────────────────────────────────

function mockSupabase(response) {
  const builder = {
    insert: () => builder,
    update: () => builder,
    select: () => builder,
    eq: () => builder,
    single: () => builder,
    then(resolve) {
      resolve(response.error
        ? { data: null, error: response.error }
        : { data: response.data, error: null });
    },
  };
  return { from: () => builder };
}

// Inject mock client into require cache for supabase-client module
function loadConcrete(relPath, mockClient) {
  const repoPath = require.resolve(path.join(__dirname, '..', relPath));
  const clientPath = require.resolve(path.join(__dirname, '..', 'src/infrastructure/persistence/supabase-client'));

  delete require.cache[repoPath];
  delete require.cache[clientPath];

  require.cache[clientPath] = {
    id: clientPath,
    filename: clientPath,
    loaded: true,
    exports: mockClient,
  };

  return require(repoPath);
}

// ─────────────────────────────────────────────────
//  Import audit
// ─────────────────────────────────────────────────

console.log('\n\u2550\u2550\u2550 Import Audit \u2550\u2550\u2550');

test('only supabase-client.js imports @supabase/supabase-js', () => {
  const { execSync } = require('child_process');
  const out = execSync(
    'grep -rl "@supabase/supabase-js" src/ engines/ --include="*.js" 2>/dev/null || true',
    { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
  ).trim();
  const files = out.split('\n').filter(Boolean);
  if (files.length !== 1) throw new Error(`expected 1 file, got ${files.length}: ${files.join(', ')}`);
  if (files[0] !== 'src/infrastructure/persistence/supabase-client.js') {
    throw new Error(`expected supabase-client.js, got ${files[0]}`);
  }
});

test('Recommendation Engine has zero supabase reference', () => {
  const { execSync } = require('child_process');
  const out = execSync(
    'grep -rl "supabase" engines/recommendation/ --include="*.js" 2>/dev/null || true',
    { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
  ).trim();
  if (out) throw new Error(`engine must not reference supabase: ${out}`);
});

// ─────────────────────────────────────────────────
//  Contract (base class)
// ─────────────────────────────────────────────────

console.log('\n\u2550\u2550\u2550 Contract (base class) \u2550\u2550\u2550');

test('AssessmentSessionRepository.create throws must-be-implemented', async () => {
  const { AssessmentSessionRepository } = require('../src/infrastructure/persistence/assessment-session.repository');
  const repo = new AssessmentSessionRepository();
  let threw = false;
  try { await repo.create({ assessment_code: 'x', pack_id: 'y' }); } catch (e) { threw = true; }
  if (!threw) throw new Error('expected throw');
});

test('AssessmentResultRepository.createBatch throws must-be-implemented', async () => {
  const { AssessmentResultRepository } = require('../src/infrastructure/persistence/assessment-result.repository');
  const repo = new AssessmentResultRepository();
  let threw = false;
  try { await repo.createBatch('s1', []); } catch (e) { threw = true; }
  if (!threw) throw new Error('expected throw');
});

test('AssessmentReportRepository.create throws must-be-implemented', async () => {
  const { AssessmentReportRepository } = require('../src/infrastructure/persistence/assessment-report.repository');
  const repo = new AssessmentReportRepository();
  let threw = false;
  try { await repo.create({ session_id: 's1', snapshot_json: {} }); } catch (e) { threw = true; }
  if (!threw) throw new Error('expected throw');
});

// ─────────────────────────────────────────────────
//  Concrete: Session
// ─────────────────────────────────────────────────

console.log('\n\u2550\u2550\u2550 SupabaseAssessmentSessionRepository \u2550\u2550\u2550');

test('extends AssessmentSessionRepository (instanceof)', () => {
  const { AssessmentSessionRepository } = require('../src/infrastructure/persistence/assessment-session.repository');
  const { SupabaseAssessmentSessionRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-session.repository.js',
    mockSupabase({ data: null, error: null })
  );
  const repo = new SupabaseAssessmentSessionRepository();
  if (!(repo instanceof AssessmentSessionRepository)) throw new Error('not instanceof base');
});

test('create returns inserted session row', async () => {
  const row = { id: 's1', assessment_code: 'LEAD', pack_id: 'leadership', status: 'started' };
  const { SupabaseAssessmentSessionRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-session.repository.js',
    mockSupabase({ data: row, error: null })
  );
  const repo = new SupabaseAssessmentSessionRepository();
  const result = await repo.create({ assessment_code: 'LEAD', pack_id: 'leadership' });
  if (result.id !== 's1') throw new Error('id mismatch');
  if (result.status !== 'started') throw new Error('status mismatch');
});

test('updateStatus sets status and completed_at', async () => {
  const row = { id: 's1', status: 'completed', completed_at: '2026-08-03T00:00:00Z' };
  const { SupabaseAssessmentSessionRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-session.repository.js',
    mockSupabase({ data: row, error: null })
  );
  const repo = new SupabaseAssessmentSessionRepository();
  const result = await repo.updateStatus('s1', 'completed', '2026-08-03T00:00:00Z');
  if (result.status !== 'completed') throw new Error('status mismatch');
  if (result.completed_at !== '2026-08-03T00:00:00Z') throw new Error('completed_at mismatch');
});

test('findById returns null on PGRST116 (not found, not error)', async () => {
  const { SupabaseAssessmentSessionRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-session.repository.js',
    mockSupabase({ data: null, error: { code: 'PGRST116' } })
  );
  const repo = new SupabaseAssessmentSessionRepository();
  const result = await repo.findById('nope');
  if (result !== null) throw new Error(`expected null, got ${JSON.stringify(result)}`);
});

test('findById THROWS raw error on non-PGRST116', async () => {
  const { SupabaseAssessmentSessionRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-session.repository.js',
    mockSupabase({ data: null, error: { code: 'SOME_DB_ERROR', message: 'boom' } })
  );
  const repo = new SupabaseAssessmentSessionRepository();
  let threw = false;
  try { await repo.findById('s1'); } catch (e) {
    threw = true;
    if (e.code !== 'SOME_DB_ERROR') throw new Error(`expected raw error code, got ${e.code}`);
  }
  if (!threw) throw new Error('expected throw on non-PGRST116');
});

// ─────────────────────────────────────────────────
//  Concrete: Result
// ─────────────────────────────────────────────────

console.log('\n\u2550\u2550\u2550 SupabaseAssessmentResultRepository \u2550\u2550\u2550');

test('extends AssessmentResultRepository (instanceof)', () => {
  const { AssessmentResultRepository } = require('../src/infrastructure/persistence/assessment-result.repository');
  const { SupabaseAssessmentResultRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-result.repository.js',
    mockSupabase({ data: [], error: null })
  );
  if (!(new SupabaseAssessmentResultRepository() instanceof AssessmentResultRepository)) {
    throw new Error('not instanceof base');
  }
});

test('createBatch inserts multiple results', async () => {
  const rows = [
    { id: 'r1', session_id: 's1', dimension: 'motivation', raw_score: 4, normalized_score: 80 },
    { id: 'r2', session_id: 's1', dimension: 'feedback', raw_score: 2, normalized_score: 40 },
  ];
  const { SupabaseAssessmentResultRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-result.repository.js',
    mockSupabase({ data: rows, error: null })
  );
  const repo = new SupabaseAssessmentResultRepository();
  const result = await repo.createBatch('s1', [
    { dimension: 'motivation', raw_score: 4, normalized_score: 80 },
    { dimension: 'feedback', raw_score: 2, normalized_score: 40 },
  ]);
  if (result.length !== 2) throw new Error(`expected 2, got ${result.length}`);
  if (result[0].dimension !== 'motivation') throw new Error('dimension mismatch');
});

test('createBatch THROWS raw error on Supabase failure', async () => {
  const { SupabaseAssessmentResultRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-result.repository.js',
    mockSupabase({ data: null, error: { code: 'FK_VIOLATION', message: 'bad' } })
  );
  const repo = new SupabaseAssessmentResultRepository();
  let threw = false;
  try { await repo.createBatch('s1', [{ dimension: 'x', raw_score: 1, normalized_score: 1 }]); }
  catch (e) { threw = true; if (e.code !== 'FK_VIOLATION') throw new Error('raw code mismatch'); }
  if (!threw) throw new Error('expected throw');
});

test('findBySessionId returns array', async () => {
  const rows = [{ id: 'r1', session_id: 's1', dimension: 'motivation' }];
  const { SupabaseAssessmentResultRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-result.repository.js',
    mockSupabase({ data: rows, error: null })
  );
  const repo = new SupabaseAssessmentResultRepository();
  const result = await repo.findBySessionId('s1');
  if (result.length !== 1) throw new Error(`expected 1, got ${result.length}`);
});

// ─────────────────────────────────────────────────
//  Concrete: Report
// ─────────────────────────────────────────────────

console.log('\n\u2550\u2550\u2550 SupabaseAssessmentReportRepository \u2550\u2550\u2550');

test('extends AssessmentReportRepository (instanceof)', () => {
  const { AssessmentReportRepository } = require('../src/infrastructure/persistence/assessment-report.repository');
  const { SupabaseAssessmentReportRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-report.repository.js',
    mockSupabase({ data: null, error: null })
  );
  if (!(new SupabaseAssessmentReportRepository() instanceof AssessmentReportRepository)) {
    throw new Error('not instanceof base');
  }
});

test('create returns inserted report row', async () => {
  const row = { id: 'rp1', session_id: 's1', snapshot_json: { type: 'leadership' }, engine_version: '1.0.0' };
  const { SupabaseAssessmentReportRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-report.repository.js',
    mockSupabase({ data: row, error: null })
  );
  const repo = new SupabaseAssessmentReportRepository();
  const result = await repo.create({ session_id: 's1', snapshot_json: { type: 'leadership' }, engine_version: '1.0.0' });
  if (result.id !== 'rp1') throw new Error('id mismatch');
});

test('findBySessionId returns null on PGRST116', async () => {
  const { SupabaseAssessmentReportRepository } = loadConcrete(
    'src/infrastructure/persistence/supabase-assessment-report.repository.js',
    mockSupabase({ data: null, error: { code: 'PGRST116' } })
  );
  const repo = new SupabaseAssessmentReportRepository();
  const result = await repo.findBySessionId('nope');
  if (result !== null) throw new Error(`expected null, got ${JSON.stringify(result)}`);
});

// ─────────────────────────────────────────────────
Promise.all(pending)
  .then(() => {
    console.log(`\n${'\u2550'.repeat(40)}`);
    console.log(`  Passed : ${passed}`);
    console.log(`  Failed : ${failed}`);
    console.log(`${'\u2550'.repeat(40)}\n`);

    if (failed > 0) process.exit(1);
    console.log('All persistence adapter tests passed.\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test runner failure:', err);
    process.exit(1);
  });
