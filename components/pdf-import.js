// pdf-import.js
// Module to import PDF using pdf.js and extract data via AI services.

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

/**
 * Extract text content from a PDF source (ArrayBuffer, Uint8Array, or URL).
 * @param {Uint8Array|ArrayBuffer|string} source - PDF data or URL.
 * @returns {Promise<string>} Concatenated text of all pages.
 */
async function extractPdfText(source) {
  const loadingTask = typeof source === "string"
    ? pdfjsLib.getDocument(source)
    : pdfjsLib.getDocument({ data: source });
  const pdf = await loadingTask.promise;
  const maxPages = pdf.numPages;
  let fullText = "";
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const txt = await page.getTextContent();
    const pageStr = txt.items.map(item => item.str).join('');
    fullText += pageStr + "\n";
  }
  return fullText;
}

/**
 * Placeholder AI extraction function.
 * Replace `YOUR_AI_ENDPOINT` with actual AI service endpoint.
 * @param {string} text - PDF extracted text.
 * @param {string} type - Extraction type (summary, competency, derailer, chart).
 * @returns {Promise<any>} Parsed JSON result from AI.
 */
async function aiExtract(text, type) {
  const endpointMap = {
    summary: "/extract/summary",
    competency: "/extract/competency",
    derailer: "/extract/derailer",
    chart: "/extract/chart"
  };
  const response = await fetch(`https://api.example.com${endpointMap[type]}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!response.ok) {
    throw new Error(`AI service error for ${type}: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Main import function.
 * @param {Uint8Array|ArrayBuffer|string} source - PDF data or URL.
 * @returns {Promise<Object>} JSON containing all extracted sections.
 */
export async function importPdf(source) {
  const text = await extractPdfText(source);
  const [summary, competency, derailer, chartData] = await Promise.all([
    aiExtract(text, "summary"),
    aiExtract(text, "competency"),
    aiExtract(text, "derailer"),
    aiExtract(text, "chart")
  ]);
  return {
    summary,
    competency,
    derailer,
    chartData
  };
}

// Export for CommonJS environments (optional)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { importPdf };
}
