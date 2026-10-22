function cell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(sections: { title: string; header: string[]; rows: (string | number)[][] }[]): string {
  return sections
    .map((s) => [s.title, s.header.map(cell).join(","), ...s.rows.map((r) => r.map(cell).join(","))].join("\n"))
    .join("\n\n");
}

export function download(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob(["﻿", text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
