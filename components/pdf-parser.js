// components/pdf-parser.js
// PDF Parser: extracts structured data from assessment PDFs.
// Uses pdfjs-dist for text extraction and regex-based parsing to produce
// a standardized JSON representation.

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

// Configure pdf.js worker (same as pdf-import.js)
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

/**
 * Extract raw text from a PDF source.
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
    const pageStr = txt.items.map(item => item.str).join(" ");
    fullText += pageStr + "\n";
  }
  return fullText;
}

/**
 * Helper – safely trim and collapse whitespace.
 */
function clean(str) {
  return (str || "").replace(/\s+/g, " ").trim();
}

/**
 * Parse participant information block.
 * Expected format (example):
 *   Name: John Doe
 *   Role: Manager
 *   Department: Sales
 */
function parseParticipantInfo(text) {
  const info = {};
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l);
  lines.forEach(line => {
    const [key, ...rest] = line.split(":");
    if (rest.length) {
      const value = rest.join(":").trim();
      const normKey = clean(key).toLowerCase().replace(/\s+/g, "_");
      info[normKey] = value;
    }
  });
  return info;
}

/**
 * Parse a competency table.
 * The table is assumed to be a series of rows like:
 *   Competency | Score | Comments
 *   Leadership | 4 | Strong
 *   Communication | 3 | Needs improvement
 */
function parseCompetencyTable(text) {
  const rows = [];
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l);
  const headerIdx = lines.findIndex(l => /competency/i.test(l));
  if (headerIdx === -1) return rows;
  const headers = lines[headerIdx]
    .split(/\s*[|\t]+\s*/)
    .map(h => clean(h).toLowerCase());
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(/\s*[|\t]+\s*/);
    if (cols.length !== headers.length) break;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = clean(cols[idx]);
    });
    rows.push(obj);
  }
  return rows;
}

/**
 * Extract a generic AI‑generated section using delimiters.
 * The PDF is expected to contain headings like "AI Summary", "Strengths",
 * "Development Areas". This function returns the text between a start heading
 * and the next heading (or end of document).
 */
function extractSection(text, heading) {
  const pattern = new RegExp(`${heading}[:\s]*([\s\S]*?)(?=\n[A-Z][a-z]+:|$)`, "i");
  const match = text.match(pattern);
  return match ? clean(match[1]) : "";
}

/**
 * Main parser – returns a standardized JSON object.
 * @param {Uint8Array|ArrayBuffer|string} source - PDF data or URL.
 * @returns {Promise<Object>} Parsed assessment data.
 */
export async function parsePdf(source) {
  const rawText = await extractPdfText(source);

  const participantBlock = extractSection(rawText, "Participant Information");
  const competencyBlock = extractSection(rawText, "Competency Table");
  const summary = extractSection(rawText, "AI Summary");
  const strengths = extractSection(rawText, "Strengths");
  const development = extractSection(rawText, "Development Areas");

  return {
    participantInfo: parseParticipantInfo(participantBlock),
    competencies: parseCompetencyTable(competencyBlock),
    aiSummary: summary,
    strengths: strengths,
    developmentAreas: development
  };
}

// Export for CommonJS environments (optional)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { parsePdf };
}
