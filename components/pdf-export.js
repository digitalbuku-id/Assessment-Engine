import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

/**
 * Converts a generated HTML report file to a PDF report.
 * @param {string} htmlPath - File path to the source HTML report.
 * @param {string} pdfPath - File path where the target PDF should be written.
 * @param {Object} [options={}] - Export and layout configuration options.
 * @param {string} [options.format='A4'] - Page format (e.g. 'A4', 'Letter').
 * @param {boolean} [options.landscape=false] - Whether layout is landscape orientation.
 * @param {Object} [options.margin] - Margins for page layout.
 * @param {string} [options.headerTemplate] - HTML template for custom header.
 * @param {string} [options.footerTemplate] - HTML template for custom footer.
 */
export async function exportHtmlToPdf(htmlPath, pdfPath, options = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const absoluteHtmlPath = path.resolve(htmlPath);
    const url = `file://${absoluteHtmlPath}`;

    // Navigate to page and wait until network is completely idle (to load CDN Chart.js and render charts)
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Wait for all custom fonts (e.g. Google Fonts Inter) to be loaded and ready
    await page.evaluateHandle('document.fonts.ready');

    // Default headers and footers with page number support
    const headerTemplate = options.headerTemplate || `
      <div style="font-size: 8px; font-family: 'Inter', Helvetica, Arial, sans-serif; width: 100%; text-align: center; color: #888888; border-bottom: 1px solid #eeeeee; padding-bottom: 5px; margin: 0 40px;">
        Assessment Report
      </div>
    `;

    const footerTemplate = options.footerTemplate || `
      <div style="font-size: 8px; font-family: 'Inter', Helvetica, Arial, sans-serif; width: 100%; display: flex; justify-content: space-between; color: #888888; border-top: 1px solid #eeeeee; padding-top: 5px; margin: 0 40px;">
        <span>DigitalBuku Assessment Engine</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `;

    const pdfOptions = {
      path: path.resolve(pdfPath),
      format: options.format || 'A4',
      landscape: !!options.landscape,
      printBackground: true,
      margin: options.margin || {
        top: '60px',
        bottom: '60px',
        left: '40px',
        right: '40px'
      },
      displayHeaderFooter: options.displayHeaderFooter !== false,
      headerTemplate,
      footerTemplate
    };

    // Ensure parent directory exists
    const parentDir = path.dirname(pdfOptions.path);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await page.pdf(pdfOptions);
  } finally {
    await browser.close();
  }
}

export default {
  exportHtmlToPdf
};
