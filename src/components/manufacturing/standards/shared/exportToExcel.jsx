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
  const wsData = [
    ['Operation', selectedOperation],
    ['QC Type', selectedQCType],
    ['QC Level', selectedQCLevel],
    ['Mode', mode === 'percent' ? 'Percentage' : 'Fixed Minutes'],
    [],
    [
      'Item Code',
      'Base Time (min)',
      mode === 'percent' ? 'QC Value (%)' : 'QC Value (min)',
      'Calculated Extra Time (min)',
      'Notes'
    ]
  ];

  filteredItems.forEach(item => {
    const data = gridData[item.item_code] || {};
    const qc_value = parseFloat(data.qc_value) || 0;
    const calculated = mode === 'percent' ? item.base_time * (qc_value / 100) : qc_value;
    
    wsData.push([
      item.item_code,
      item.base_time,
      data.qc_value || '',
      qc_value > 0 ? calculated : '',
      data.notes || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 15 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'QC Standards');
  XLSX.writeFile(wb, `${bundleName || 'QC'}_${selectedOperation}_${selectedQCType}_${selectedQCLevel}.xlsx`);
}

export async function exportProfilesToExcel(profiles, operations, bundleName) {
  const headers = ['Profile Name', 'Operations', 'Description', 'Status'];
  const data = profiles.map(profile => {
    const profileOps = (profile.operations_required || [])
      .map(opId => operations.find(o => o.id === opId)?.name)
      .filter(Boolean)
      .join(', ');
    
    return [
      profile.name,
      profileOps,
      profile.description || '',
      profile.is_active ? 'Active' : 'Inactive'
    ];
  });

  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 20 }, { wch: 30 }, { wch: 35 }, { wch: 12 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Operation Profiles');
  XLSX.writeFile(wb, `${bundleName || 'Profiles'}_OperationProfiles.xlsx`);
}

export async function exportScheduledDataToExcel(filteredLines, getProfileName, selectedDate, bundleName) {
  const headers = ['Date', 'Item Code', 'Profile', 'Ops Qty', 'Ops Total', 'QC Total', 'Grand Total', 'Notes'];
  const data = filteredLines.map(line => [
    line.date,
    line.item_code,
    getProfileName(line.operation_profile_id),
    line.ops_qty,
    (line.ops_total_min || 0).toFixed(2),
    (line.qc_total_min || 0).toFixed(2),
    (line.grand_total_min || 0).toFixed(2),
    line.notes || ''
  ]);

  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Scheduled Data');
  XLSX.writeFile(wb, `${bundleName || 'Scheduled'}_${selectedDate || 'All'}.xlsx`);
}