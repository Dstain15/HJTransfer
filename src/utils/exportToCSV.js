export function exportToCSV(data, filename, columns) {
  if (!data || data.length === 0) return;
  
  // Create CSV header
  const header = columns.map(col => col.header).join(',');
  
  // Create CSV rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
      // Handle arrays
      if (Array.isArray(value)) {
        return `"${value.join('; ')}"`;
      }
      // Handle null/undefined
      if (value == null) {
        return '';
      }
      // Escape quotes and wrap in quotes if contains comma
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });
  
  // Combine and download
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}