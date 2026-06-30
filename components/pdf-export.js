import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Exports HTML content to PDF file using Puppeteer.
 * @param {string} htmlContent - The HTML content to convert to PDF.
 * @param {string} outputPath - Path where the PDF file should be saved.
 * @param {Object} options - PDF options (optional).
 * @returns {Promise<string>} The output file path.
 */
export async function exportToPDF(htmlContent, outputPath, options = {}) {
  let browser;
  
  try {
    // Launch browser in headless mode
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create new page
    const page = await browser.newPage();
    
    // Set HTML content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });
    
    // Generate PDF with options
    const pdfOptions = {
      path: outputPath,
      format: options.format || 'A4',
      printBackground: options.printBackground !== false,
      margin: options.margin || {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      },
      ...options
    };
    
    await page.pdf(pdfOptions);
    
    // Close browser
    await browser.close();
    
    return outputPath;
    
  } catch (error) {
    // Ensure browser is closed on error
    if (browser) {
      await browser.close();
    }
    throw new Error(`PDF export failed: ${error.message}`);
  }
}

/**
 * Exports HTML file to PDF.
 * @param {string} htmlFilePath - Path to the HTML file.
 * @param {string} outputPath - Path where the PDF file should be saved.
 * @param {Object} options - PDF options (optional).
 * @returns {Promise<string>} The output file path.
 */
export async function exportHtmlFileToPDF(htmlFilePath, outputPath, options = {}) {
  const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
  return exportToPDF(htmlContent, outputPath, options);
}

export default {
  exportToPDF,
  exportHtmlFileToPDF
};