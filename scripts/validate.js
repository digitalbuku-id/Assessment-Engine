import fs from 'node:fs';
import path from 'node:path';
import { validateAssessment, ValidationError } from '../components/json-schema.js';

const green = '\u001b[32m';
const red = '\u001b[31m';
const reset = '\u001b[0m';

const examplesDir = path.resolve(process.cwd(), 'examples');
if (!fs.existsSync(examplesDir)) {
  console.error('No examples directory found. Please create ./examples/ with test JSON files.');
  process.exit(1);
}

let hasError = false;

fs.readdirSync(examplesDir).forEach(file => {
  if (file.endsWith('.json')) {
    const filePath = path.join(examplesDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      validateAssessment(data);
      console.log(green + '✔ ' + file + ' passed validation' + reset);
    } catch (e) {
      hasError = true;
      if (e instanceof ValidationError) {
        console.error(red + '✘ ' + file + ' validation failed:' + reset + ' ' + e.message);
      } else {
        console.error(red + '✘ ' + file + ' could not be processed:' + reset + ' ' + e.message);
      }
    }
  }
});

if (!hasError) {
  console.log('\n' + green + 'All files passed validation.' + reset);
}

process.exit(hasError ? 1 : 0);