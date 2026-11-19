const { BaseEngine } = require('./core/engine');
const { AssessmentContext } = require('./core/context');

// Test 1: BaseEngine
class TestEngine extends BaseEngine {
  constructor() {
    super('test-engine', {
      version: '1.0.0',
      provides: ['test.capability'],
      requires: ['context.responses']
    });
  }

  async execute(context) {
    context.setFormulas({ score: 85 }, this.name);
    return context;
  }
}

// Test 2: Context
const context = new AssessmentContext({
  participant: { name: 'Budi', email: 'budi@test.com' },
  responses: { q1: 4, q2: 5 }
});

console.log('✓ Context created:', context.getSummary().id);

// Test 3: Engine execution
const engine = new TestEngine();
engine.run(context).then(() => {
  console.log('✓ Engine executed, formulas:', context.getFormulas());
  console.log('✓ Formulas sealed:', context.isSealed('formulas'));
  console.log('✓ Audit entries:', context.getAuditTrail().length);
  console.log('ENGINE & CONTEXT OK');
}).catch(err => {
  console.error('✗ Error:', err.message);
});