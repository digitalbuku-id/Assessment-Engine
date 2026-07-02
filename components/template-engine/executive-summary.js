export function renderExecutiveSummary(data) {
  const { participants = [], competencies = [], scores = {} } = data;
  
  // Calculate overall score
  let totalScore = 0;
  let scoreCount = 0;
  
  Object.values(scores).forEach(participantScores => {
    Object.values(participantScores).forEach(score => {
      totalScore += score;
      scoreCount++;
    });
  });
  
  const overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
  
  let category = 'Needs Improvement';
  let categoryClass = 'danger';
  
  if (overallScore >= 85) {
    category = 'Excellent';
    categoryClass = 'success';
  } else if (overallScore >= 70) {
    category = 'Good';
    categoryClass = 'info';
  } else if (overallScore >= 50) {
    category = 'Satisfactory';
    categoryClass = 'warning';
  }
  
  return `
    <section class="mb-5">
      <h2 class="h3 mb-4">Executive Summary</h2>
      <div class="row g-4">
        <div class="col-md-3">
          <div class="card border-${categoryClass} h-100">
            <div class="card-body text-center">
              <h6 class="text-muted mb-2">Overall Score</h6>
              <div class="display-4 fw-bold text-${categoryClass}">${overallScore}</div>
              <span class="badge bg-${categoryClass} mt-2">${category}</span>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <h6 class="text-muted mb-2">Participants</h6>
              <div class="display-4 fw-bold text-primary">${participants.length}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <h6 class="text-muted mb-2">Competencies</h6>
              <div class="display-4 fw-bold text-primary">${competencies.length}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <h6 class="text-muted mb-2">Assessment Date</h6>
              <div class="h4 fw-bold text-primary mt-3">${data.formattedDate || '-'}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}