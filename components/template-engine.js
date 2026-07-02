// components/template-engine.js
/**
 * Render assessment data into HTML using preprocessed data.
 * @param {Object} context - Preprocessed assessment data
 * @returns {string} Rendered HTML
 */
export function renderTemplate(context) {
  const { 
    title, 
    assessmentId, 
    participants = [], 
    competencies = [], 
    insights, 
    recommendations = [],
    formattedDate 
  } = context;

  // Generate table rows from preprocessed data
  let tableRows = '';
  participants.forEach(p => {
    let row = `<tr><td><strong>${p.name || 'Unknown'}</strong></td>`;
    
    // Use preprocessed competencyScores
    (p.competencyScores || []).forEach(cs => {
      const scoreClass = cs.statusClass || '';
      row += `<td class="${scoreClass}">${cs.score ?? '-'} <small>(${cs.status})</small></td>`;
    });
    
    row += '</tr>';
    tableRows += row;
  });

  // Generate competency headers
  const competencyHeaders = competencies.map(c => 
    `<th title="${c.description || ''}">${c.name}</th>`
  ).join('');

  // Generate recommendations list
  const recommendationsList = recommendations.length > 0
    ? recommendations.map(r => `<li>${r}</li>`).join('')
    : '<li class="text-muted">No recommendations available.</li>';

  // Generate insights
  const insightsContent = insights?.summary 
    ? `<p>${insights.summary}</p>`
    : '<p class="text-muted">No insights available.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Assessment Report'}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
    .score-excellent { color: #198754; font-weight: bold; }
    .score-good { color: #0dcaf0; font-weight: bold; }
    .score-satisfactory { color: #ffc107; font-weight: bold; }
    .score-danger { color: #dc3545; font-weight: bold; }
    table { margin: 20px 0; }
    th { background: #f8f9fa; }
    .header { background: #0d6efd; color: white; padding: 20px; margin-bottom: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title || 'Assessment Report'}</h1>
      <p class="mb-0"><strong>ID:</strong> ${assessmentId || '-'}</p>
      <p class="mb-0"><strong>Date:</strong> ${formattedDate || new Date().toLocaleDateString()}</p>
    </div>

    <section class="mb-4">
      <h2>Participants</h2>
      <ul>
        ${participants.map(p => `<li><strong>${p.name}</strong> - ${p.position || 'N/A'} (${p.email || 'N/A'})</li>`).join('')}
      </ul>
    </section>

    <section class="mb-4">
      <h2>Competency Scores</h2>
      <div class="table-responsive">
        <table class="table table-bordered table-hover">
          <thead>
            <tr>
              <th>Participant</th>
              ${competencyHeaders}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </section>

    <section class="mb-4">
      <h2>Insights</h2>
      ${insightsContent}
    </section>

    <section class="mb-4">
      <h2>Recommendations</h2>
      <ul>
        ${recommendationsList}
      </ul>
    </section>

    <footer class="text-center text-muted mt-5">
      <small>Generated: ${new Date().toISOString()}</small>
    </footer>
  </div>
</body>
</html>`;
}

export default { renderTemplate };
