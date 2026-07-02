export function renderFooter() {
  return `
    <footer class="bg-light py-4 mt-5">
      <div class="container">
        <div class="row">
          <div class="col-md-6">
            <p class="mb-1"><strong>DigitalBuku Assessment Engine</strong></p>
            <p class="text-muted mb-0">Professional assessment and reporting platform</p>
          </div>
          <div class="col-md-6 text-md-end">
            <p class="mb-1"><small>Generated: ${new Date().toISOString()}</small></p>
            <p class="text-muted mb-0"><small>&copy; 2026 DigitalBuku. All rights reserved.</small></p>
          </div>
        </div>
      </div>
    </footer>
  `;
}