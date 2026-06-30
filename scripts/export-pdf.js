import path from 'node:path';
import fs from 'node:fs';
import { exportHtmlReport } from '../components/html-export.js';
import { exportHtmlToPdf } from '../components/pdf-export.js';

const green = '\u001b[32m';
const red = '\u001b[31m';
const reset = '\u001b[0m';

async function main() {
  const jsonPath = path.resolve(process.cwd(), 'examples', 'sample-assessment.json');
  const tempHtmlPath = path.resolve(process.cwd(), 'output', 'report.html');
  const pdfPath = path.resolve(process.cwd(), 'output', 'report.pdf');

  console.log(`Starting PDF export...`);
  console.log(`Source JSON: ${jsonPath}`);
  console.log(`Intermediate HTML: ${tempHtmlPath}`);
  console.log(`Target PDF: ${pdfPath}`);

  try {
    // 1. Generate the HTML report
    console.log(`Generating intermediate HTML...`);
    await exportHtmlReport(jsonPath, tempHtmlPath);
    console.log(`${green}✔ Intermediate HTML report generated.${reset}`);

    // 2. Convert to PDF using Puppeteer
    console.log(`Converting HTML to PDF using Puppeteer...`);
    await exportHtmlToPdf(tempHtmlPath, pdfPath, {
      format: 'A4',
      landscape: false
    });
    console.log(`${green}✔ PDF Report exported successfully at: ${pdfPath}${reset}`);
    process.exit(0);
  } catch (error) {
    console.error(`${red}✘ Failed to export PDF Report:${reset}`);
    console.error(error);
    process.exit(1);
  }
}

main();
