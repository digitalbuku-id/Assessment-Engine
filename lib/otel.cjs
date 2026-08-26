require('dotenv/config');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const token = process.env.TRACEWAY_TOKEN || process.env.OTEL_EXPORTER_OTLP_HEADERS?.replace('Authorization=Bearer ','') || '85f5a2d34e434c7fa3bea3397624e129';
const endpoint = process.env.TRACEWAY_OTLP_ENDPOINT || 'http://localhost';

const traceExporter = new OTLPTraceExporter({
  url: `${endpoint}/api/otel/v1/traces`,
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-traceway-token': token,
  }
});

const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: process.env.OTEL_SERVICE_NAME || 'assessment-engine',
});

sdk.start();
console.log('[otel] SDK started ->', endpoint);

module.exports = sdk;
module.exports.default = sdk;
