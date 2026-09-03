// =========================================================
// Excel export (client-side, via SheetJS — works on static
// Firebase Hosting with no server needed).
// Loaded from CDN in each page:
//   <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
// =========================================================

/** rows: array of plain objects. Keys become column headers. */
export function exportToExcel(rows, filename = "export.xlsx", sheetName = "Sheet1"){
  if (!window.XLSX){
    alert("Excel library not loaded.");
    return;
  }
  const ws = window.XLSX.utils.json_to_sheet(rows);
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
  window.XLSX.writeFile(wb, filename);
}
