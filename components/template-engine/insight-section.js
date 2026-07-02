export function renderInsightSection(data) {
  const { insights } = data;
  
  if (!insights || !insights.summary) {
    return `
      <section class="mb-5">
        <h2 class="h3 mb-4">Insights</h2>
        <div class="alert alert-info">
          <i class="bi bi-info-circle"></i> No insights available.
        </div>
      </section>
    `;
  }
  
  return `
    <section class="mb-5">
      <h2 class="h3 mb-4">Insights</h2>
      <div class="card">
        <div class="card-body">
          <p class="mb-0">${insights.summary}</p>
        </div>
      </div>
    </section>
  `;
}