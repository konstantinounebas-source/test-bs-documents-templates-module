import ExcelJS from 'exceljs';

// Helper to export as CSV instead of Excel (no external dependencies needed)
function exportToCSV(headers, rows, filename) {
  const csvContent = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportDataTabToExcel(gridRows, operationColumns, bundleName) {
  const headers = ['Item Code', ...operationColumns.map(col => col.label), 'Notes'];
  const rows = gridRows.map(row => [
    row.item_code,
    ...operationColumns.map(col => row[col.operation] || ''),
    row.notes || ''
  ]);
  exportToCSV(headers, rows, `${bundleName || 'Standards'}_Data.csv`);
}

export async function exportQCTabToExcel(filteredItems, gridData, mode, selectedOperation, selectedQCType, selectedQCLevel, bundleName) {
  const rows = [
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
    ],
    ...filteredItems.map(item => {
      const data = gridData[item.item_code] || {};
      const qc_value = parseFloat(data.qc_value) || 0;
      const calculated = mode === 'percent' ? item.base_time * (qc_value / 100) : qc_value;
      return [
        item.item_code,
        item.base_time,
        data.qc_value || '',
        qc_value > 0 ? calculated : '',
        data.notes || ''
      ];
    })
  ];
  
  const csvContent = rows.map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bundleName || 'QC'}_${selectedOperation}_${selectedQCType}_${selectedQCLevel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportProfilesToExcel(profiles, operations, bundleName) {
  const headers = ['Profile Name', 'Operations', 'Description', 'Status'];
  const rows = profiles.map(profile => {
    const profileOps = (profile.operations_required || [])
      .map(opId => operations.find(o => o.id === opId)?.name)
      .filter(Boolean)
      .join(', ');
    return [profile.name, profileOps, profile.description || '', profile.is_active ? 'Active' : 'Inactive'];
  });
  exportToCSV(headers, rows, `${bundleName || 'Profiles'}_OperationProfiles.csv`);
}

export async function exportScheduledDataToExcel(filteredLines, getProfileName, selectedDate, bundleName) {
  const headers = ['Date', 'Item Code', 'Profile', 'Ops Qty', 'Ops Total', 'QC Total', 'Grand Total', 'Notes'];
  const rows = filteredLines.map(line => [
    line.date,
    line.item_code,
    getProfileName(line.operation_profile_id),
    line.ops_qty,
    (line.ops_total_min || 0).toFixed(2),
    (line.qc_total_min || 0).toFixed(2),
    (line.grand_total_min || 0).toFixed(2),
    line.notes || ''
  ]);
  exportToCSV(headers, rows, `${bundleName || 'Scheduled'}_${selectedDate || 'All'}.csv`);
}