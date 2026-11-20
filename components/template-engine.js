import Handlebars from 'handlebars';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const templateCache = new Map();

function getCompiledTemplate(name) {
  if (templateCache.has(name)) return templateCache.get(name);
  const templatePath = resolve(__dirname, '..', 'templates', `${name}.html`);
  const raw = readFileSync(templatePath, 'utf-8');
  const compiled = Handlebars.compile(raw);
  templateCache.set(name, compiled);
  return compiled;
}

export function renderTemplate(templateNameOrContext, maybeData) {
  if (typeof templateNameOrContext === 'string') {
    const tmpl = getCompiledTemplate(templateNameOrContext);
    return tmpl(maybeData || {});
  }
  // Fallback for single-argument context callers
  const tmpl = getCompiledTemplate('report');
  return tmpl(templateNameOrContext || {});
}

export default { renderTemplate };
