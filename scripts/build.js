import fs from 'node:fs';
import path from 'node:path';

const requiredFolders = ['templates', 'schema', 'components'];
const cwd = process.cwd();
let missing = [];
for (const folder of requiredFolders) {
  if (!fs.existsSync(path.join(cwd, folder))) missing.push(folder);
}
// Check at least one template file exists
const templateDir = path.join(cwd, 'templates');
if (fs.existsSync(templateDir) && fs.readdirSync(templateDir).filter(f => f.endsWith('.html')).length === 0) {
  missing.push('templates (no .html files)');
}
if (missing.length) {
  console.error('Build failed. Missing:', missing.join(', '));
  process.exit(1);
}
console.log('Build completed');
process.exit(0);
