import { trace, SpanStatusCode } from '@opentelemetry/api';

function withTrace(name, fn) {
  return async (...args) => {
    const tracer = trace.getTracer('assessment-engine');
    return tracer.startActiveSpan(name, async (span) => {
      try {
        const result = await fn(...args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw err;
      } finally {
        span.end();
      }
    });
  };
}

export { withTrace };
