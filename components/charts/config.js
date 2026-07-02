/**
 * Chart configuration — offline-ready, production grade.
 * All colors, defaults, and utilities in one place.
 */
const COLORS = {
  primary: '#1B2A4A',
  secondary: '#0077B6',
  success: '#198754',
  info: '#0dcaf0',
  warning: '#ffc107',
  danger: '#dc3545',
  light: '#f8f9fa',
  dark: '#343a40',
  grey: '#6c757d'
};

// Palet untuk multi-dataset
const CHART_PALETTE = [
  '#1B2A4A',
  '#0077B6',
  '#198754',
  '#ffc107',
  '#dc3545',
  '#0dcaf0',
  '#6c757d',
  '#fd7e14'
];

// Background colors (dengan alpha)
const CHART_BG_PALETTE = CHART_PALETTE.map(c => c + '33'); // 0.2 alpha

function getScoreColor(score) {
  if (score >= 85) return COLORS.success;
  if (score >= 70) return COLORS.info;
  if (score >= 50) return COLORS.warning;
  return COLORS.danger;
}

function getScoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Satisfactory';
  return 'Needs Improvement';
}

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false, // Penting untuk PDF stability
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        font: { family: 'Segoe UI, sans-serif', size: 11 },
        color: '#1B2A4A'
      }
    }
  }
};

module.exports = {
  COLORS,
  CHART_PALETTE,
  CHART_BG_PALETTE,
  getScoreColor,
  getScoreLabel,
  CHART_DEFAULTS
};