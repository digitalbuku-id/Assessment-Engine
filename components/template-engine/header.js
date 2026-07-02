export function renderHeader(data) {
  const { title, assessmentId, formattedDate } = data;
  return `
    <div class="bg-primary text-white py-5 mb-4">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-md-8">
            <h1 class="display-4 fw-bold mb-2">${title || 'Assessment Report'}</h1>
            <p class="lead mb-0">
              <i class="bi bi-hash"></i> ID: ${assessmentId || '-'}
            </p>
          </div>
          <div class="col-md-4 text-md-end">
            <p class="mb-1"><strong>Generated:</strong> ${formattedDate || new Date().toLocaleDateString()}</p>
            <p class="mb-0"><small>DigitalBuku Assessment Engine v1.0</small></p>
          </div>
        </div>
      </div>
    </div>
  `;
}