// components/template-engine.js
export function renderTemplate(context) {
  // Simple template: generate HTML from context
  const { title, assessmentId, participants, competencies, scores, insights, recommendations } = context;
  let tableRows = '';
  participants?.forEach(p => {
    let row = `<tr><td>${p.name}</td>`;
    competencies?.forEach(c => {
      row += `<td>${scores[p.id]?.[c.id] ?? '-'}</td>`;
    });
    row += '</tr>';
    tableRows += row;
  });

  return `
<!DOCTYPE html>
<html>
<head><title>${title || 'Assessment Report'}</title>
<style>
  body { font-family: Arial; padding: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px; }
  th { background: #f2f2f2; }
</style>
</head>
<body>
  <h1>${title || 'Assessment'}</h1>
  <p><strong>ID:</strong> ${assessmentId}</p>
  <h2>Scores</h2>
  <table><thead><tr><th>Participant</th>${competencies?.map(c => `<th>${c.name}</th>`).join('')}</tr></thead>
  <tbody>${tableRows}</tbody></table>
  <h2>Insights</h2>
  <p>${insights?.summary || ''}</p>
  <h2>Recommendations</h2>
  <ul>${recommendations?.map(r => `<li>${r}</li>`).join('')}</ul>
  <p><small>Generated: ${new Date().toISOString()}</small></p>
</body>
</html>
  `;
}