// excel-export.js
// Export utility using SheetJS (XLSX) to generate Excel files.
// This module provides a single function `exportToExcel` that accepts data
// in a tabular format and triggers a download of an .xlsx file in the browser.

/**
 * Convert the provided data into a worksheet and export as an Excel file.
 *
 * @param {Array<Object>|Array<Array<any>>} data - Array of objects (keyed by column name) or array of arrays (rows).
 * @param {string} [sheetName='Sheet1'] - Name of the worksheet within the workbook.
 * @param {string} [fileName='export.xlsx'] - Desired file name for the downloaded Excel file.
 */
export function exportToExcel(data, sheetName = 'Sheet1', fileName = 'export.xlsx') {
  // Dynamically import SheetJS to avoid bundling it unless needed.
  // This works in environments that support ES2020 dynamic import.
  import('xlsx').then((XLSX) => {
    // Convert data to a worksheet. SheetJS can handle both array of objects
    // and array of arrays.
    const ws = XLSX.utils.json_to_sheet(data);

    // Create a new workbook and append the worksheet.
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate binary string and trigger download.
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }).catch((err) => {
    console.error('Failed to load SheetJS (xlsx) library for Excel export:', err);
  });
}
