export function toCsv(rows, columns) {
  const escape = (value) => {
    const text = value == null ? '' : String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const header = columns.map((col) => escape(col.label)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((col) => escape(typeof col.value === 'function' ? col.value(row) : row[col.key]))
      .join(','),
  );
  return [header, ...lines].join('\n');
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
