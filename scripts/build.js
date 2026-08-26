import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import sdk from '../lib/otel.cjs';

import { withTrace } from '../lib/traceway.js';
import { buildAssessment } from '../components/assessment-builder.js';
import { readFileSync } from 'fs';

const green = '\u001b[32m';
const red = '\u001b[31m';
const yellow = '\u001b[33m';
const reset = '\u001b[0m';

async function main() {
  console.log(`${yellow}Building Assessment Report...${reset}\n`);

  const inputData = JSON.parse(
    readFileSync('examples/sample-assessment.json', 'utf8')
  );

  const tracedBuild = withTrace('assessment.build', buildAssessment);
  const result = await tracedBuild(inputData);

  if (result.success) {
    console.log(`${green}Assessment built successfully!${reset}`);
    console.log(`  HTML: ${result.files.html}`);
    console.log(`  PDF:  ${result.files.pdf}`);
  } else {
    console.log(`${red}Build failed at ${result.stage}${reset}`);
    console.log(`  Error: ${result.error}`);
  }

  try {
    await sdk.shutdown();
    console.log('[Traceway] Spans flushed');
  } catch (e) {
    console.error('[Traceway] flush failed:', e.message);
  }

  if (!result.success) {
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error(`${red}Fatal error:${reset}`, err);
  try { await sdk.shutdown(); } catch {}
  process.exit(1);
});