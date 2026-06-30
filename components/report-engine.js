// components/report-engine.js
// Report Engine: reads JSON data, merges it with an HTML template, generates charts using Chart.js (via chartjs-node-canvas), and produces final HTML output.

const fs = require('fs');
const path = require('path');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

/**
 * Utility to read a JSON file and parse its contents.
 * @param {string} jsonFilePath - Absolute path to the JSON data file.
 * @returns {Promise<Object>} Parsed JSON object.
 */
async function readJson(jsonFilePath) {
  const absolutePath = path.resolve(jsonFilePath);
  const raw = await fs.promises.readFile(absolutePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Simple placeholder templating – replaces {{key}} tokens with corresponding values.
 * @param {string} template - The HTML template string.
 * @param {Object} data - Key/value pairs to inject.
 * @returns {string} Template with tokens replaced.
 */
function mergeTemplate(template, data) {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const value = key.split('.').reduce((obj, prop) => (obj ? obj[prop] : ''), data);
    return value !== undefined && value !== null ? value : '';
  });
}

/**
 * Generates a chart image (Base64 PNG) using Chart.js.
 * @param {Object} chartConfig - Chart.js configuration object.
 * @param {number} width - Width of the canvas in pixels.
 * @param {number} height - Height of the canvas in pixels.
 * @returns {Promise<string>} Base64 data URL of the rendered chart.
 */
async function generateChart(chartConfig, width = 800, height = 600) {
  const canvasRenderService = new ChartJSNodeCanvas({ width, height, backgroundColour: 'transparent' });
  const image = await canvasRenderService.renderToDataURL(chartConfig);
  return image;
}

/**
 * Generates multiple charts based on an array of Chart.js configs.
 * @param {Array<Object>} chartConfigs - Array of Chart.js configuration objects.
 * @returns {Promise<Array<string>>} Array of Base64 PNG data URLs.
 */
async function generateCharts(chartConfigs) {
  const promises = chartConfigs.map(cfg => generateChart(cfg));
  return Promise.all(promises);
}

/**
 * Assembles the final HTML by injecting chart images and merged data.
 * @param {string} mergedTemplate - HTML string after data merge.
 * @param {Array<string>} chartDataUrls - Base64 image URLs for the charts.
 * @returns {string} Complete HTML ready for rendering or saving.
 */
function generateHtml(mergedTemplate, chartDataUrls) {
  let html = mergedTemplate;
  chartDataUrls.forEach((url, idx) => {
    const placeholder = `{{chart${idx}}}`;
    html = html.replace(new RegExp(placeholder, 'g'), `<img src="${url}" alt="Chart ${idx}"/>`);
  });
  return html;
}

/**
 * High‑level helper that ties everything together.
 * @param {string} jsonPath - Path to the JSON input.
 * @param {string} templatePath - Path to the HTML template file.
 * @param {Array<Object>} chartConfigs - Chart.js config objects.
 * @returns {Promise<string>} Final HTML output.
 */
async function buildReport(jsonPath, templatePath, chartConfigs) {
  const data = await readJson(jsonPath);
  const templateRaw = await fs.promises.readFile(path.resolve(templatePath), 'utf-8');
  const merged = mergeTemplate(templateRaw, data);
  const chartDataUrls = await generateCharts(chartConfigs);
  return generateHtml(merged, chartDataUrls);
}
