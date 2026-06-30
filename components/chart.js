// components/chart.js
// Reusable Chart.js wrapper for Radar, Bar, and Line charts.
// Requires Chart.js v4+ to be loaded on the page (via CDN or bundler).

/**
 * Create a responsive Radar chart.
 * @param {CanvasRenderingContext2D|HTMLCanvasElement} ctx - Canvas context or element.
 * @param {object} data - Chart.js data object ({labels, datasets}).
 * @param {object} [options={}] - Additional Chart.js options.
 * @returns {Chart} Chart instance.
 */
export function createRadarChart(ctx, data, options = {}) {
  const config = {
    type: 'radar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...options,
    },
  };
  return new Chart(ctx, config);
}

/**
 * Create a responsive Bar chart.
 */
export function createBarChart(ctx, data, options = {}) {
  const config = {
    type: 'bar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...options,
    },
  };
  return new Chart(ctx, config);
}

/**
 * Create a responsive Line chart.
 */
export function createLineChart(ctx, data, options = {}) {
  const config = {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...options,
    },
  };
  return new Chart(ctx, config);
}

/**
 * Create a responsive Horizontal Bar chart.
 */
export function createHorizontalBarChart(ctx, data, options = {}) {
  const config = {
    type: 'bar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      ...options,
    },
  };
  return new Chart(ctx, config);
}

/**
 * Create a responsive Doughnut chart.
 */
export function createDoughnutChart(ctx, data, options = {}) {
  const config = {
    type: 'doughnut',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...options,
    },
  };
  return new Chart(ctx, config);
}

/**
 * Helper to deep‑merge default options with custom overrides.
 * @private
 */
function mergeOptions(defaults, custom) {
  return { ...defaults, ...custom };
}
