const { EngineRegistry } = require('./core/registry');
const { Pipeline } = require('./core/pipeline');
const { DefinitionEngine } = require('./engines/definition');
const { FormulaEngine } = require('./engines/formula');
const { RuleEngine } = require('./engines/rule');
const { VersionEngine } = require('./engines/version');
const { ExecutionGraphEngine } = require('./engines/execution-graph');
const { SnapshotEngine } = require('./engines/snapshot');
const leadershipConfig = require('./assessments/leadership/config.json');

async function test() {
  console.log('=== Testing Tier A Engines ===\n');

  const registry = new EngineRegistry();
  registry
    .register(new DefinitionEngine())
    .register(new FormulaEngine())
    .register(new RuleEngine())
    .register(new VersionEngine())
    .register(new ExecutionGraphEngine())
    .register(new SnapshotEngine());

  console.log(`✓ Registry: ${registry.size} engines registered\n`);

  const pipeline = new Pipeline({ name: 'full-assessment', registry });
  pipeline
    .addStage('definition', { required: true })
    .addStage('formula', { required: true })
    .addStage('rule', { required: true })
    .addStage('version', { required: true })
    .addStage('execution-graph', { required: true })
    .addStage('snapshot', { required: true });

  console.log('✓ Pipeline: 6 stages configured\n');

  const context = await pipeline.run({
    assessment: leadershipConfig,
    participant: { name: 'Test User', email: 'test@example.com' },
    responses: { q1: 5, q2: 4, q3: 5, q4: 4 }
  });
  console.log('--- Results ---');
  console.log(`Overall Score: ${context.getFormulas().results.overall.value}`);
  console.log(`Category: ${context.getRules().results[0]?.action.category}`);
  console.log(`Version: ${context.getVersion().version}`);
  console.log(`Config Hash: ${context.getVersion().configHash.substring(0, 16)}...`);
  console.log(`Snapshot ID: ${context.getSnapshot().snapshotId}`);
  console.log(`Snapshot Signature: ${context.getSnapshot().signature.substring(0, 16)}...`);
  console.log(`Execution Graph Engines: ${context.getExecutionGraph().dependency.engines.join(', ')}`);
  console.log(`Audit Entries: ${context.getAuditTrail().length}`);
  console.log(`Context Frozen: ${context.isFrozen}`);

  console.log('\nTIER A ENGINES OK');
}

test().catch(err => {
  console.error('✗ Error:', err.message);
  console.error(err.stack);
});