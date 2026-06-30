import path from 'node:path';
import { exportHtmlReport } from '../components/html-export.js';

const green = '\u001b[32m';
const red = '\u001b[31m';
const reset = '\u001b[0m';

async function main() {
  const jsonPath = path.resolve(process.cwd(), 'examples', 'sample-assessment.json');
  const outputPath = path.resolve(process.cwd(), 'output', 'report.html');

  console.log(`Starting HTML export...`);
  console.log(`Source JSON: ${jsonPath}`);
  console.log(`Target HTML: ${outputPath}`);

  try {
    await exportHtmlReport(jsonPath, outputPath);
    console.log(`${green}✔ HTML Report exported successfully at: ${outputPath}${reset}`);
    process.exit(0);
  } catch (error) {
    console.error(`${red}✘ Failed to export HTML Report:${reset}`);
    console.error(error);
    process.exit(1);
  }
}

main();
