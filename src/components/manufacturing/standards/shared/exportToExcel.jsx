
import ExcelJS from 'exceljs';
import XLSX from 'xlsx';

export async function exportDataTabToExcel(gridRows, operationColumns, bundleName) {
  // Prepare data
  const headers = ['Item Code', ...operationColumns.map(col => col.label), 'Notes'];
  const data = gridRows.map(row => [
    row.item_code,
    ...operationColumns.map(col => row[col.operation] || ''),
    row.notes || ''
  ]);

  // Create workbook
  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Style header row (this is for column width in XLSX, actual styling is more complex and not directly supported in this simple approach for XLSX)
  const headerRange = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });
  if (!ws['!cols']) ws['!cols'] = [];
  headers.forEach((_, i) => {
    // Calculate max length for each column based on header and data
    let maxLength = 0;
    // Check header length
    if (headers[i]) {
      maxLength = Math.max(maxLength, headers[i].toString().length);
    }
    // Check data column length
    data.forEach(row => {
      if (row[i]) {
        maxLength = Math.max(maxLength, row[i].toString().length);
      }
    });

    if (!ws['!cols'][i]) ws['!cols'][i] = {};
    ws['!cols'][i].wch = Math.min(maxLength + 2, 30); // Add 2 for padding, cap at 30
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Standards Data');
  XLSX.writeFile(wb, `${bundleName || 'Standards'}_Data.xlsx`);
}

export async function exportQCTabToExcel(filteredItems, gridData, mode, selectedOperation, selectedQCType, selectedQCLevel, bundleName) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('QC Standards');

  // Headers
  worksheet.addRow(['Operation', selectedOperation]);
  worksheet.addRow(['QC Type', selectedQCType]);
  worksheet.addRow(['QC Level', selectedQCLevel]);
  worksheet.addRow(['Mode', mode === 'percent' ? 'Percentage' : 'Fixed Minutes']);
  worksheet.addRow([]);

  const headers = [
    'Item Code',
    'Base Time (min)',
    mode === 'percent' ? 'QC Value (%)' : 'QC Value (min)',
    'Calculated Extra Time (min)',
    'Notes'
  ];
  worksheet.addRow(headers);
  
  const headerRow = worksheet.lastRow;
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add data
  filteredItems.forEach(item => {
    const data = gridData[item.item_code] || {};
    const qc_value = parseFloat(data.qc_value) || 0;
    const calculated = mode === 'percent' ? item.base_time * (qc_value / 100) : qc_value;
    
    worksheet.addRow([
      item.item_code,
      item.base_time,
      data.qc_value || '',
      qc_value > 0 ? calculated : '',
      data.notes || ''
    ]);
  });

  // Auto-size
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const length = cell.value ? cell.value.toString().length : 10;
      if (length > maxLength) maxLength = length;
    });
    column.width = Math.min(maxLength + 2, 30);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bundleName || 'QC'}_${selectedOperation}_${selectedQCType}_${selectedQCLevel}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportProfilesToExcel(profiles, operations, bundleName) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Operation Profiles');

  const headers = ['Profile Name', 'Operations', 'Description', 'Status'];
  worksheet.addRow(headers);
  
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  profiles.forEach(profile => {
    const profileOps = (profile.operations_required || [])
      .map(opId => operations.find(o => o.id === opId)?.name)
      .filter(Boolean)
      .join(', ');
    
    worksheet.addRow([
      profile.name,
      profileOps,
      profile.description || '',
      profile.is_active ? 'Active' : 'Inactive'
    ]);
  });

  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const length = cell.value ? cell.value.toString().length : 10;
      if (length > maxLength) maxLength = length;
    });
    column.width = Math.min(maxLength + 2, 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bundleName || 'Profiles'}_OperationProfiles.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportScheduledDataToExcel(filteredLines, getProfileName, selectedDate, bundleName) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Scheduled Data');

  const headers = ['Date', 'Item Code', 'Profile', 'Ops Qty', 'Ops Total', 'QC Total', 'Grand Total', 'Notes'];
  worksheet.addRow(headers);
  
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  filteredLines.forEach(line => {
    worksheet.addRow([
      line.date,
      line.item_code,
      getProfileName(line.operation_profile_id),
      line.ops_qty,
      (line.ops_total_min || 0).toFixed(2),
      (line.qc_total_min || 0).toFixed(2),
      (line.grand_total_min || 0).toFixed(2),
      line.notes || ''
    ]);
  });

  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const length = cell.value ? cell.value.toString().length : 10;
      if (length > maxLength) maxLength = length;
    });
    column.width = Math.min(maxLength + 2, 30);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bundleName || 'Scheduled'}_${selectedDate || 'All'}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
