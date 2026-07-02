/**
 * Renders Chart.js datasets into HTML containers and initialization scripts.
 * This module only handles rendering, no data transformation.
 */

/**
 * Render charts into HTML containers and scripts.
 * @param {Object} datasets - Chart datasets from builder
 * @returns {Object} { containers: string, scripts: string }
 */
export function renderCharts(datasets) {
  if (!datasets) {
    return { containers: '', scripts: '' };
  }
  
  const containers = `
    <section class="mb-5">
      <h2 class="h3 mb-4">Visual Analytics</h2>
      <div class="row g-4">
        <div class="col-lg-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Competency Profile</h5>
              <div style="position: relative; height: 400px;">
                <canvas id="radarChart"></canvas>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Score Distribution</h5>
              <div style="position: relative; height: 400px;">
                <canvas id="barChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
  
  const scripts = `
    <script src="assets/vendor/chart.umd.js"></script>
    <script>
      (function() {
        const datasets = ${JSON.stringify(datasets)};
        
        document.addEventListener('DOMContentLoaded', function() {
          // Fallback if Chart.js not loaded
          if (typeof Chart === 'undefined') {
            console.warn('Chart.js unavailable');
            window.__chartsReady = true;
            return;
          }
          
          // Disable animations for PDF export stability
          Chart.defaults.animation = false;
          Chart.defaults.animations = {};
          Chart.defaults.transitions = {};
          
          // Render Radar Chart
          try {
            const radarCtx = document.getElementById('radarChart');
            if (radarCtx && datasets.radar) {
              new Chart(radarCtx, {
                type: 'radar',
                data: datasets.radar,
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        stepSize: 20,
                        font: { size: 10 }
                      },
                      pointLabels: {
                        font: { size: 11, weight: '500' }
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { font: { size: 11 } }
                    }
                  }
                }
              });
            }
          } catch (e) {
            console.error('Radar chart error:', e);
          }
          
          // Render Bar Chart
          try {
            const barCtx = document.getElementById('barChart');
            if (barCtx && datasets.bar) {
              new Chart(barCtx, {
                type: 'bar',
                data: datasets.bar,
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: { font: { size: 11 } }
                    },
                    x: {
                      ticks: { font: { size: 10 } }
                    }
                  },
                  plugins: {
                    legend: { display: false }
                  }
                }
              });
            }
          } catch (e) {
            console.error('Bar chart error:', e);
          }
          
          // Signal that charts are ready (for Puppeteer PDF export)
          window.__chartsReady = true;
        });
      })();
    </script>
  `;
  
  return { containers, scripts };
}

export default { renderCharts };