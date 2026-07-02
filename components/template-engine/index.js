import { renderHeader } from './header.js';
import { renderExecutiveSummary } from './executive-summary.js';
import { renderCompetencyTable } from './competency-table.js';
import { renderInsightSection } from './insight-section.js';
import { renderRecommendationSection } from './recommendation-section.js';
import { renderFooter } from './footer.js';
import { generateInsights } from '../insight/insight-generator.js';
import { generateCharts } from '../charts/index.js';  // ← ADD THIS

export function renderTemplate(context) {
  const insights = generateInsights(context);
  const charts = generateCharts(context);  // ← ADD THIS
  
  const enrichedContext = {
    ...context,
    insights: { summary: insights.summary, details: insights.details },
    recommendations: insights.recommendations
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${enrichedContext.title || 'Assessment Report'}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .card { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .score-display { font-size: 3rem; font-weight: bold; }
    @media print {
      .no-print { display: none; }
      body { font-size: 12pt; }
      .card { box-shadow: none; border: 1px solid #ddd; }
    }
  </style>
</head>
<body>
  ${renderHeader(enrichedContext)}
  
  <main class="container">
    ${renderExecutiveSummary(enrichedContext)}
    ${charts.containers}  <!-- ADD THIS -->
    ${renderCompetencyTable(enrichedContext)}
    ${renderInsightSection(enrichedContext)}
    ${renderRecommendationSection(enrichedContext)}
  </main>
  
  ${renderFooter()}
  
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  ${charts.scripts}  <!-- ADD THIS -->
</body>
</html>`;
}

export default { renderTemplate };