const { ValidationError, EngineError } = require('./core/errors');
const { Logger } = require('./core/logger');

// Test errors
try {
  throw new ValidationError('Test error', 'field1', 'value1');
} catch (error) {
  console.log('✓ ValidationError works:', error.code);
}

// Test logger
const logger = new Logger({ level: 'INFO', enableHistory: true });
logger.info('Test message', { test: true });
console.log('✓ Logger works, history:', logger.getHistory().length, 'entries');

console.log('\n✅ Core files working correctly!');