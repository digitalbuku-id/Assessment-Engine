import { createRequire } from 'module';
import { readFileSync } from 'fs';

// Create require function for CommonJS modules
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Parse PDF file and extract text content
 * @param {string|Buffer} input - File path or Buffer
 * @returns {Promise<Object>} Parsed data with text and metadata
 */
export async function parsePDF(input) {
  try {
    let dataBuffer;
    
    if (typeof input === 'string') {
      // Input is file path
      dataBuffer = readFileSync(input);
    } else if (Buffer.isBuffer(input)) {
      // Input is already a Buffer
      dataBuffer = input;
    } else {
      throw new Error('Input must be a file path (string) or Buffer');
    }

    const data = await pdfParse(dataBuffer);
    
    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info,
      metadata: data.metadata,
      version: data.version
    };
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

export default { parsePDF };