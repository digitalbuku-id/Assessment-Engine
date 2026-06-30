const fs = require('fs');

const content = `import { parsePDF } from './pdf-parser.js';
import { validateAssessment } from './json-schema.js';
import { exportToHTML } from './html-export.js';
import { exportToPDF } from './pdf-export.js';
import { readFileSync } from 'fs';

/**
 * Build assessment report from various input types.
 * @param {string|Object} input - PDF file path, JSON file path, or JSON object
 * @param {Object} options - Build options
 * @returns {Promise<Object>} Build result
 */
export async function buildAssessment(input, options = {}) {
  const result = {
    success: false,
    files: {},
    data: null,
    stage: null,
    error: null
  };

  try {
    let assessmentData;

    // Step 1: Determine input type and extract data
    if (typeof input === 'string') {
      // Input is a file path
      if (input.toLowerCase().endsWith('.pdf')) {
        result.stage = 'PDF Parser';
        console.log('  Parsing PDF...');
        const parsed = await parsePDF(input);
        // TODO: Extract structured data from parsed text
        // For now, throw error as PDF parsing to JSON is not implemented
        throw new Error('PDF to JSON extraction not yet implemented. Please provide JSON input.');
      } else if (input.toLowerCase().endsWith('.json')) {
        result.stage = 'JSON Loader';
        console.log('  Loading JSON file...');
        const jsonContent = readFileSync(input, 'utf8');
        assessmentData = JSON.parse(jsonContent);
      } else {
        throw new Error('Input file must be .pdf or .json');
      }
    } else if (typeof input === 'object' && input !== null) {
      // Input is already a JSON object
      result.stage = 'Input Validation';
      console.log('  Using provided JSON object...');
      assessmentData = input;
    } else {
      throw new Error('Input must be a file path (string) or JSON object');
    }

    // Step 2: Validate
    result.stage = 'Validation';
    console.log('  Validating schema...');
    validateAssessment(assessmentData);

    // Step 3: Generate HTML
    result.stage = 'HTML Export';
    const htmlPath = options.htmlPath || 'report.html';
    console.log('  Generating HTML...');
    const htmlContent = await exportToHTML(assessmentData, htmlPath);

    // Step 4: Generate PDF
    result.stage = 'PDF Export';
    const pdfPath = options.pdfPath || 'report.pdf';
    console.log('  Generating PDF...');
    await exportToPDF(htmlContent, pdfPath);

    // Success
    result.success = true;
    result.files = {
      html: htmlPath,
      pdf: pdfPath
    };
    result.data = assessmentData;

    return result;

  } catch (error) {
    result.success = false;
    result.error = error.message;
    return result;
  }
}

export default { buildAssessment };
`;

fs.writeFileSync('components/assessment-builder.js', content, 'utf8');
console.log('✅ components/assessment-builder.js rewritten');