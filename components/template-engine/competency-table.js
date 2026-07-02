export function renderCompetencyTable(data) {
  const { participants = [], competencies = [] } = data;
  
  let tableRows = '';
  participants.forEach(p => {
    let row = `<tr><td class="fw-bold">${p.name || 'Unknown'}</td>`;
    
    (p.competencyScores || []).forEach(cs => {
      row += `
        <td>
          <span class="badge bg-${cs.statusClass}">${cs.score}</span>
          <small class="text-muted d-block">${cs.status}</small>
        </td>
      `;
    });
    
    row += '</tr>';
    tableRows += row;
  });
  
  const headers = competencies.map(c => 
    `<th title="${c.description || ''}">${c.name}</th>`
  ).join('');
  
  return `
    <section class="mb-5">
      <h2 class="h3 mb-4">Competency Scores</h2>
      <div class="table-responsive">
        <table class="table table-striped table-hover table-bordered">
          <thead class="table-light">
            <tr>
              <th style="width: 25%;">Participant</th>
              ${headers}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </section>
  `;
}