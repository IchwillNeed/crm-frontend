export function exportCsv(filename: string, columns: string[], rows: (string | number | null)[][]) {
  const escape = (value: string | number | null) => {
    const raw = String(value ?? '');
    const text = typeof value === 'string' && /^\s*[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv = '\uFEFF' + [columns, ...rows].map(row => row.map(escape).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
