export function renderRecommendationSection(data) {
  const { recommendations = [] } = data;
  
  if (recommendations.length === 0) {
    return `
      <section class="mb-5">
        <h2 class="h3 mb-4">Recommendations</h2>
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle"></i> No recommendations available.
        </div>
      </section>
    `;
  }
  
  const items = recommendations.map(r => 
    `<li class="list-group-item">${r}</li>`
  ).join('');
  
  return `
    <section class="mb-5">
      <h2 class="h3 mb-4">Recommendations</h2>
      <ul class="list-group">
        ${items}
      </ul>
    </section>
  `;
}