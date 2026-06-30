// excel-import.js
// Module to import Excel files using SheetJS (xlsx) and return normalized JSON.

import * as XLSX from "xlsx";

/**
 * Fetches a file from a URL and returns it as an ArrayBuffer.
 * @param {string} url - The URL of the file.
 * @returns {Promise<ArrayBuffer>} The fetched data.
 */
async function fetchArrayBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Excel file: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

/**
 * Normalizes a worksheet to an array of objects using the first row as headers.
 * @param {object} worksheet - SheetJS worksheet object.
 * @returns {Array<Object>} Normalized rows.
 */
function normalizeWorksheet(worksheet) {
  const json = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  return json;
}

/**
 * Main import function.
 * Accepts a File/Blob, ArrayBuffer, or URL pointing to an Excel workbook.
 * Returns a JSON object where each key is a sheet name and the value is an
 * array of row objects (normalized).
 *
 * @param {File|Blob|ArrayBuffer|string} source - Excel source.
 * @returns {Promise<Object>} Normalized workbook JSON.
 */
export async function importExcel(source) {
  let data;
  if (typeof source === "string") {
    // Assume URL string
    data = await fetchArrayBuffer(source);
  } else if (source instanceof ArrayBuffer) {
    data = source;
  } else if (source instanceof Uint8Array) {
    data = source.buffer;
  } else if (source instanceof Blob) {
    data = await source.arrayBuffer();
  } else {
    throw new Error("Unsupported source type for Excel import.");
  }

  // Read workbook
  const workbook = XLSX.read(data, { type: "array" });

  const result = {};
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    result[sheetName] = normalizeWorksheet(worksheet);
  });

  return result;
}

// Export for CommonJS environments (optional)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { importExcel };
}
