const { EngineRegistry } = require('./core/registry');
const { Pipeline } = require('./core/pipeline');
const { FormulaEngine, formulaRegistry } = require('./engines/formula');
const { RuleEngine } = require('./engines/rule');
const leadershipConfig = require('./assessments/leadership/config.json');

async function test() {
  console.log('=== Testing Formula & Rule Engine ===\n');

  // Test 1: Formula Registry
  console.log('✓ Formula Registry:');
  formulaRegistry.list().forEach(f => {
    console.log(`  - ${f.id} (v${f.version}): ${f.description}`);
  });
  console.log();

  // Test 2: Setup Pipeline
  const registry = new EngineRegistry();
  registry
    .register(new FormulaEngine())
    .register(new RuleEngine());

  const pipeline = new Pipeline({ name: 'assessment', registry });
  pipeline
    .addStage('formula', { required: true })
    .addStage('rule', { required: true });

  // Test 3: Run dengan skor tinggi
  console.log('--- Test: High Score ---');
  const context1 = await pipeline.run({
    assessment: leadershipConfig,
    participant: { name: 'Budi Santoso' },
    responses: { q1: 5, q2: 5, q3: 5, q4: 5 }
  });

  const formulas1 = context1.getFormulas();
  console.log('Dimension scores:');
  for (const [dim, result] of Object.entries(formulas1.results)) {
    if (dim !== 'overall') {
      console.log(`  ${dim}: ${result.value}`);
    }
  }
  console.log(`Overall: ${formulas1.results.overall.value}`);
  console.log(`Category: ${context1.getRules().results[0]?.action.category}`);
  console.log();

  // Test 4: Run dengan skor medium
  console.log('--- Test: Medium Score ---');
  const context2 = await pipeline.run({
    assessment: leadershipConfig,
    participant: { name: 'Siti Aminah' },
    responses: { q1: 4, q2: 3, q3: 4, q4: 3 }
  });

  const formulas2 = context2.getFormulas();
  console.log(`Overall: ${formulas2.results.overall.value}`);
  console.log(`Category: ${context2.getRules().results[0]?.action.category}`);
  console.log();

  // Test 5: Run dengan skor rendah
  console.log('--- Test: Low Score ---');
  const context3 = await pipeline.run({
    assessment: leadershipConfig,
    participant: { name: 'Ahmad Dahlan' },
    responses: { q1: 2, q2: 2, q3: 3, q4: 2 }
  });

  const formulas3 = context3.getFormulas();
  console.log(`Overall: ${formulas3.results.overall.value}`);
  console.log(`Category: ${context3.getRules().results[0]?.action.category}`);
  console.log();

  console.log('FORMULA & RULE ENGINE OK');
}

test().catch(err => {
  console.error('✗ Error:', err.message);
  console.error(err.stack);
});