// Chart Engine Utility
// Provides a reusable function to generate Chart.js configuration objects
// Supports chart types: Radar, Bar, Line, Horizontal Bar, Doughnut

/**
 * Generate a Chart.js configuration object.
 *
 * @param {string} type - Chart type. One of: 'radar', 'bar', 'line', 'horizontalBar', 'doughnut'.
 * @param {Array<string>} labels - Labels for the data points / axes.
 * @param {Array<Object>} datasets - Array of dataset objects as expected by Chart.js.
 * @param {Object} [customOptions={}] - Optional Chart.js options to merge/override defaults.
 * @returns {Object} Chart.js configuration object.
 */
export function getChartConfig(type, labels, datasets, customOptions = {}) {
  // Validate chart type
  const supported = ['radar', 'bar', 'line', 'horizontalBar', 'doughnut'];
  if (!supported.includes(type)) {
    throw new Error(`Unsupported chart type "${type}". Supported types: ${supported.join(', ')}`);
  }

  // Base config common to all chart types
  const baseConfig = {
    type: type === 'horizontalBar' ? 'bar' : type,
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // Default options can be overridden by customOptions
    },
  };

  // Adjust options for specific chart types
  if (type === 'horizontalBar') {
    // Chart.js v3+ uses indexAxis to flip orientation
    baseConfig.options.indexAxis = 'y';
  }

  // Merge custom options (shallow merge - deep merge can be added if needed)
  const finalConfig = {
    ...baseConfig,
    options: { ...baseConfig.options, ...customOptions },
  };

  return finalConfig;
}

// Example usage (commented out for production):
// const config = getChartConfig(
//   'bar',
//   ['Jan', 'Feb', 'Mar'],
//   [{ label: 'Sales', data: [10, 20, 30], backgroundColor: 'rgba(75,192,192,0.4)' }]
// );
// const myChart = new Chart(ctx, config);

// components/chart-engine.js
export function renderCharts(scores, validatedData) {
  // Dummy chart data
  return {
    labels: validatedData?.competencies?.map(c => c.name) || [],
    datasets: validatedData?.participants?.map(p => ({
      label: p.name,
      data: validatedData.competencies.map(c => scores[p.id]?.[c.id] ?? 0)
    })) || []
  };
}
