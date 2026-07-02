/**
 * Chart module facade.
 * Provides simple API for generating charts from assessment data.
 */

import { buildChartData } from './builder.js';
import { renderCharts } from './renderer.js';

/**
 * Generate charts from assessment data.
 * @param {Object} data - Preprocessed assessment data
 * @returns {Object} { containers: string, scripts: string }
 */
export function generateCharts(data) {
  const datasets = buildChartData(data);
  return renderCharts(datasets);
}

export default { generateCharts };