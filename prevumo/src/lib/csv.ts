const FORMULA = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

/** Text that a spreadsheet would run as a formula gets a leading quote. */
function cell(v: string | number): string {
  let s = String(v);
  if (typeof v === "string" && FORMULA.test(s) && !PLAIN_NUMBER.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
