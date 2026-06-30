/**
 * Template Engine for DigitalBuku Assessment Engine.
 * Uses Handlebars-style syntax ({{var}}, {{#each}}, {{#if}}) as approved.
 * Loads HTML templates from the 	emplates/ folder and renders them with provided data.
 */

import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve this module's directory (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load a raw template file.
 * @param {string} name Template file name without extension (e.g.,  layout loads layout.html).
 * @returns {string} Template contents.
 */
function loadTemplate(name) {
  const templatePath = resolve(__dirname, '..', 'templates', `${name}.html`);
  return readFileSync(templatePath, 'utf-8');
}

/**
 * Compile and cache a Handlebars template.
 * @param {string} name Template name.
 * @returns {Handlebars.TemplateDelegate} Compiled template function.
 */
const templateCache = new Map();
function getCompiledTemplate(name) {
  if (templateCache.has(name)) return templateCache.get(name);
  const raw = loadTemplate(name);
  const compiled = Handlebars.compile(raw);
  templateCache.set(name, compiled);
  return compiled;
}

/**
 * Render a template with data.
 * @param {string} templateName Name of the template (without .html).
 * @param {Object} data Data object to inject into the template.
 * @returns {string} Rendered HTML string.
 */
export function renderTemplate(templateName, data) {
  const tmpl = getCompiledTemplate(templateName);
  return tmpl(data);
}

/**
 * Register a Handlebars helper.
 * This allows the engine to be extended (e.g., date formatting) without editing core code.
 * @param {string} name Helper name.
 * @param {Function} fn Helper implementation.
 */
export function registerHelper(name, fn) {
  Handlebars.registerHelper(name, fn);
}

/**
 * Register a Handlebars partial.
 * Useful for reusable snippets (headers, footers, etc.).
 * @param {string} name Partial name.
 * @param {string} content Partial HTML content.
 */
export function registerPartial(name, content) {
  Handlebars.registerPartial(name, content);
}

export default {
  renderTemplate,
  registerHelper,
  registerPartial
};
