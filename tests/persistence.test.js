/**
 * Unit tests: Persistence Adapter (ADR-006 Sprint P-1)
 *
 * Tests repository behavior with a mocked Supabase client.
 * No production credentials required.
 */

const path = require('path');

// ── Test helpers ──
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

// ── Mock Supabase client factory ──
function createMockClient() {
  const calls = [];
  const mockChain = {
    _calls: calls,
    _nextResponse: null,
    _nextError: null,

    from(table) {
      calls.push(`from(${table})`);
      return this;
    },
    insert(data) {
      calls.push(`insert(${JSON.stringify(data)})`);
      return this;
    },
    update(data) {
      calls.push(`update(${JSON.stringify(data)})`);
      return this;
    },
    select(columns = '*') {
      calls.push(`select(${columns})`);
      return this;
    },
    eq(col, val) {
      calls.push(`eq(${col}, ${val})`);
      return this;
    },
    single() {
      calls.push('single()');
      return this;
    },
    // Resolve the chain — returns { data, error } based on preset
    async then(resolve) {
      if (this._nextError) {
        resolve({ data: null, error: this._nextError });
      } else {
        resolve({ data: this._nextResponse, error: null });
      }
      return this._nextResponse;
    },
    setResponse(data) {
      this._nextResponse = data;
      this._nextError = null;
      return this;
    },
    setError(error) {
      this._nextError = error;
      this._nextResponse = null;
      return this;
    },
  };
  return mockChain;
}

// ─────────────────────────────────────────────────
//  Test: supabase-client.js is the only file importing SDK
// ─────────────────────────────────────────────────

console.log('\n\u2550\u2550\u2550 Persistence Adapter — Import Audit \u2550\u2550\u2550');

test('only supabase-client.js imports @supabase/supabase-js', () => {
  const { execSync } = require('child_process');
  // Use grep -r (not git grep) since files may not be committed yet
  const result = execSync(
    'grep -rl "@supabase/supabase-js" src/ engines/ --include="*.js" 2>/dev/null || true',
    { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
  ).trim();
  const files = result.split('\n').filter(Boolean);
  const expected = 'src/infrastructure/persistence/supabase-client.js';
  if (files.length !== 1) {
    throw new Error(`expected exactly 1 file importing SDK, got ${files.length}: ${files.join(', ')}`);
  }
  if (files[0] !== expected) {
    throw new Error(`expected ${expected}, got ${files[0]}`);
  }
});

test('no supabase import in engines/recommendation/', () => {
  const { execSync } = require('child_process');
  const result = execSync(
    'grep -rl "supabase" engines/recommendation/ --include="*.js" 2>/dev/null || true',
    { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
  ).trim();
  if (result) {
    throw new Error(`Recommendation Engine must not reference supabase: ${result}`);
  }
});

// ─────────────────────────────────────────────────
//  Test: Repository CRUD with mocked client
// ─────────────────────────────────────────────────

console.log('\n\u2550\u2550\u2550 Assessment Session Repository \u2550\u2550\u2550');

test('create() returns the inserted session row', async () => {
  const mockRow = { id: 's1', assessment_code: 'LEAD', pack_id: 'leadership', status: 'started' };
  const mock = createMockClient().setResponse(mockRow);
  const repo = mockRequire('../src/infrastructure/persistence/assessment-session.repository', mock);

  const result = await repo.create({ assessment_code: 'LEAD', pack_id: 'leadership' });
  if (result.id !== 's1') throw new Error('id mismatch');
  if (result.status !== 'started') throw new Error('status mismatch');
});

test('findById() returns the session row', async () => {
  const mockRow = { id: 's1', assessment_code: 'LEAD' };
  const mock = createMockClient().setResponse(mockRow);
  const repo = mockRequire('../src/infrastructure/persistence/assessment-session.repository', mock);

  const result = await repo.findById('s1');
  if (result.id !== 's1') throw new Error('id mismatch');
});

test('findById() returns null for not found (PGRST116)', async () => {
  const mock = createMockClient().setError({ code: 'PGRST116', message: 'no rows' });
  const repo = mockRequire('../src/infrastructure/persistence/assessment-session.repository', mock);

  const result = await repo.findById('nonexistent');
  if (result !== null) throw new Error(`expected null, got ${JSON.stringify(result)}`);
});

test('updateStatus() updates and returns the row', async () => {
  const mockRow = { id: 's1', status: 'completed', completed_at: '2026-08-03T00:00:00Z' };
  const mock = createMockClient().setResponse(mockRow);
  const repo = mockRequire('../src/infrastructure/persistence/assessment-session.repository', mock);

  const result = await repo.updateStatus('s1', 'completed', '2026-08-03T00:00:00Z');
  if (result.status !== 'completed') throw new Error('status mismatch');
  if (result.completed_at !== '2026-08-03T00:00:00Z') throw new Error('completed_at mismatch');
});

console.log('\n\u2550\u2550\u2550 Assessment Result Repository \u2550\u2550\u2550');

test('createBatch() inserts multiple results', async () => {
  const mockRows = [
    { id: 'r1', session_id: 's1', dimension: 'motivation', raw_score: 88, normalized_score: 88 },
    { id: 'r2', session_id: 's1', dimension: 'feedback', raw_score: 35, normalized_score: 35 },
  ];
  const mock = createMockClient().setResponse(mockRows);
  const repo = mockRequire('../src/infrastructure/persistence/assessment-result.repository', mock);

  const results = [
    { dimension: 'motivation', raw_score: 88, normalized_score: 88 },
    { dimension: 'feedback', raw_score: 35, normalized_score: 35 },
  ];
  const result = await repo.createBatch('s1', results);
  if (result.length !== 2) throw new Error(`expected 2 rows, got ${result.length}`);
  if (result[0].dimension !== 'motivation') throw new Error('first dimension mismatch');
});

test('findBySessionId() returns results for the session', async () => {
  const mockRows = [{ id: 'r1', session_id: 's1', dimension: 'motivation' }];
  const mock = createMockClient().setResponse(mockRows);
  const repo = mockRequire('../src/infrastructure/persistence/assessment-result.repository', mock);

  const result = await repo.findBySessionId('s1');
  if (result.length !== 1) throw new Error(`expected 1 row, got ${result.length}`);
});

console.log('\n\u2550\u2550\u2550 Assessment Report Repository \u2550\u2550\u2550');

test('create() inserts a report with snapshot_json', async () => {
  const mockRow = { id: 'rp1', session_id: 's1', snapshot_json: { type: 'leadership' }, engine_version: '2.0.0' };
  const mock = createMockClient().setResponse(mockRow);
  const repo = mockRequire('../src/infrastructure/persistence/assessment-report.repository', mock);

  const result = await repo.create({
    session_id: 's1',
    snapshot_json: { type: 'leadership' },
    engine_version: '2.0.0',
  });
  if (result.id !== 'rp1') throw new Error('id mismatch');
  if (result.engine_version !== '2.0.0') throw new Error('version mismatch');
});

test('findBySessionId() returns the report for a session', async () => {
  const mockRow = { id: 'rp1', session_id: 's1' };
  const mock = createMockClient().setResponse(mockRow);
  const repo = mockRequire('../src/infrastructure/persistence/assessment-report.repository', mock);

  const result = await repo.findBySessionId('s1');
  if (result.id !== 'rp1') throw new Error('id mismatch');
});

test('findBySessionId() returns null for not found', async () => {
  const mock = createMockClient().setError({ code: 'PGRST116' });
  const repo = mockRequire('../src/infrastructure/persistence/assessment-report.repository', mock);

  const result = await repo.findBySessionId('nonexistent');
  if (result !== null) throw new Error(`expected null, got ${JSON.stringify(result)}`);
});

// ─────────────────────────────────────────────────
//  Helper: mock require()
// ─────────────────────────────────────────────────

const Module = require('module');
const originalRequire = Module.prototype.require;

function mockRequire(modulePath, mockClient) {
  const absPath = require.resolve(path.join(__dirname, '..', modulePath));
  // Clear any existing cache for the target module and supabase-client
  delete require.cache[absPath];
  delete require.cache[require.resolve(path.join(__dirname, '..', 'src/infrastructure/persistence/supabase-client'))];

  // Intercept require to inject mock client
  Module.prototype.require = function (id) {
    if (id === './supabase-client' || id.endsWith('/supabase-client.js')) {
      return mockClient;
    }
    return originalRequire.apply(this, arguments);
  };

  try {
    return require(absPath);
  } finally {
    Module.prototype.require = originalRequire;
  }
}

// ─────────────────────────────────────────────────
console.log(`\n${'═'.repeat(40)}`);
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log(`${'═'.repeat(40)}\n`);

if (failed > 0) process.exit(1);
console.log('All persistence adapter tests passed.\n');
process.exit(0);
