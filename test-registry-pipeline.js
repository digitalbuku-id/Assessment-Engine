const { BaseEngine } = require('./core/engine');
const { EngineRegistry } = require('./core/registry');
const { Pipeline } = require('./core/pipeline');
const { AssessmentContext } = require('./core/context');

// Test Engine 1
class Engine1 extends BaseEngine {
  constructor() {
    super('engine1', { version: '1.0.0' });
  }
  async execute(context) {
    context.setFormulas({ score: 75 }, this.name);
    return context;
  }
}

// Test Engine 2
class Engine2 extends BaseEngine {
  constructor() {
    super('engine2', { version: '1.0.0' });
  }
  async execute(context) {
    context.setRules({ category: 'Medium' }, this.name);
    return context;
  }
}

async function test() {
  // Test Registry
  const registry = new EngineRegistry();
  registry.register(new Engine1());
  registry.register(new Engine2());
  
  console.log('✓ Registry size:', registry.size);
  console.log('✓ Has engine1:', registry.has('engine1'));

  // Test Pipeline
  const pipeline = new Pipeline({ name: 'test-pipeline', registry });
  pipeline
    .addStage('engine1', { required: true })
    .addStage('engine2', { required: true });

  pipeline.on('afterPipeline', (context) => {
    console.log('✓ Hook afterPipeline executed');
  });

  const context = await pipeline.run({
    participant: { name: 'Test User' },
    responses: { q1: 4 }
  });

  console.log('✓ Pipeline completed');
  console.log('✓ Formulas:', context.getFormulas());
  console.log('✓ Rules:', context.getRules());
  console.log('✓ Context frozen:', context.isFrozen);
  console.log('✓ Audit entries:', context.getAuditTrail().length);

  console.log('REGISTRY & PIPELINE OK');
}

test().catch(err => {
  console.error('✗ Error:', err.message);
  console.error(err.stack);
});