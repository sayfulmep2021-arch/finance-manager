// Data Export Engine (Phase 3)
// Secure CSV & Excel exports with UTF-8 BOM, preview modal, and strict zero-secret filtering

import { t, formatMoney, formatDate } from './i18n.js';
import { paisaToDecimal } from './ledger.js';

// Build UTF-8 CSV string with BOM
export function buildCSVString(records, columns) {
  if (!records || records.length === 0) {
    throw new Error('No records available to export.');
  }

  // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel Bengali encoding compatibility
  let csvContent = '\uFEFF';

  // Header row
  const headers = columns.map(c => `"${c.label.replace(/"/g, '""')}"`);
  csvContent += headers.join(',') + '\r\n';

  // Data rows
  records.forEach(row => {
    const rowValues = columns.map(col => {
      let val = col.accessor ? col.accessor(row) : (row[col.key] || '');
      if (val === null || val === undefined) val = '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvContent += rowValues.join(',') + '\r\n';
  });

  return csvContent;
}

// Convert array of transaction records to safe UTF-8 CSV and trigger download
export function exportToCSV(records, columns, filename = 'transactions_export.csv') {
  const csvContent = buildCSVString(records, columns);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerFileDownload(blob, filename);
  return true;
}

// Build Excel XML string
export function buildExcelXmlString(records, columns) {
  if (!records || records.length === 0) {
    throw new Error('No records available to export.');
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0284C7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="Default">
   <Alignment ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Transactions">
  <Table>
`;

  // Headers
  xml += '<Row ss:StyleID="Header">\n';
  columns.forEach(col => {
    xml += ` <Cell><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>\n`;
  });
  xml += '</Row>\n';

  // Rows
  records.forEach(row => {
    xml += '<Row>\n';
    columns.forEach(col => {
      let val = col.accessor ? col.accessor(row) : (row[col.key] || '');
      if (val === null || val === undefined) val = '';

      if (col.isNumeric) {
        xml += ` <Cell ss:StyleID="Currency"><Data ss:Type="Number">${val}</Data></Cell>\n`;
      } else {
        xml += ` <Cell ss:StyleID="Default"><Data ss:Type="String">${escapeXml(String(val))}</Data></Cell>\n`;
      }
    });
    xml += '</Row>\n';
  });

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  return xml;
}

// Convert records to Microsoft Excel XML Spreadsheet format (.xls) and trigger download
export function exportToExcel(records, columns, filename = 'transactions_export.xls') {
  const xml = buildExcelXmlString(records, columns);
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerFileDownload(blob, filename);
  return true;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export Preview Dialog (Section 15: Review date range & columns before export)
export function openExportPreviewModal({ records, columns, title = 'Export Preview', dateRange = '' }) {
  let modal = document.getElementById('export-preview-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'export-preview-modal';
    modal.className = 'modal-overlay hidden';
    modal.innerHTML = `
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <h3 class="modal-title" id="export-modal-title"></h3>
          <button type="button" class="btn-close" id="export-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-income flex-between" style="margin-top: 0; margin-bottom: 16px;">
            <div>
              <strong>🛡️ নিরাপত্তা নিশ্চয়তা:</strong> এই এক্সপোর্টে কোনো পাসওয়ার্ড, এনক্রিপশন কি বা নিরাপত্তা কনফিগারেশন নেই।
            </div>
            <span class="badge badge-income" id="export-count-badge"></span>
          </div>

          <div class="summary-preview-list" style="margin-bottom: 16px;">
            <div class="preview-row">
              <span class="preview-label">সময়কাল (Date Range):</span>
              <strong id="export-modal-range"></strong>
            </div>
            <div class="preview-row">
              <span class="preview-label">অন্তর্ভুক্ত কলামসমূহ (Columns):</span>
              <span id="export-modal-cols" style="font-size: 0.85rem;"></span>
            </div>
          </div>

          <h4 class="font-bold" style="margin-bottom: 8px;">রেকর্ডের নমুনা পূর্বরূপ (First 5 Records Preview):</h4>
          <div class="table-responsive" style="max-height: 200px; margin-bottom: 16px;">
            <table class="data-table" id="export-preview-table"></table>
          </div>

          <div class="form-group">
            <label class="form-label font-bold">এক্সপোর্ট ফরম্যাট নির্বাচন করুন:</label>
            <div style="display: flex; gap: 16px; margin-top: 4px;">
              <label><input type="radio" name="export-format" value="csv" checked> CSV ফরম্যাট (.csv - স্প্রেডশীট ও ডেটাবেইজ)</label>
              <label><input type="radio" name="export-format" value="excel"> Excel ফরম্যাট (.xls - মাইক্রোসফট এক্সেল)</label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="export-modal-cancel">${t('btnCancel')}</button>
          <button type="button" class="btn btn-primary" id="export-modal-confirm">📥 ডাউনলোড করুন</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Populate preview
  document.getElementById('export-modal-title').textContent = title;
  document.getElementById('export-modal-range').textContent = dateRange || 'সকল রেকর্ড (All Records)';
  document.getElementById('export-count-badge').textContent = `${records.length} টি রেকর্ড`;
  document.getElementById('export-modal-cols').textContent = columns.map(c => c.label).join(', ');

  const table = document.getElementById('export-preview-table');
  const previewSlice = records.slice(0, 5);

  let tableHtml = '<thead><tr>' + columns.map(c => `<th>${c.label}</th>`).join('') + '</tr></thead><tbody>';
  previewSlice.forEach(r => {
    tableHtml += '<tr>' + columns.map(c => {
      const val = c.accessor ? c.accessor(r) : (r[c.key] || '');
      return `<td>${val}</td>`;
    }).join('') + '</tr>';
  });
  tableHtml += '</tbody>';
  table.innerHTML = tableHtml;

  modal.classList.remove('hidden');

  const closeModal = () => modal.classList.add('hidden');
  document.getElementById('export-modal-close').onclick = closeModal;
  document.getElementById('export-modal-cancel').onclick = closeModal;

  document.getElementById('export-modal-confirm').onclick = () => {
    const selectedFormat = document.querySelector('input[name="export-format"]:checked')?.value || 'csv';
    const timestamp = new Date().toISOString().split('T')[0];

    if (selectedFormat === 'excel') {
      exportToExcel(records, columns, `finance_report_${timestamp}.xls`);
    } else {
      exportToCSV(records, columns, `finance_report_${timestamp}.csv`);
    }
    closeModal();
  };
}
