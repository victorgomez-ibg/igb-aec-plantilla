// IGB AEC Suite — branded PDF generation in the browser (jsPDF + autotable, vendored).
//
// Usage:
//   const pdf = await createPdf({ title: 'Presupuesto', subtitle: 'Casa habitación', disclaimer: '…' });
//   pdf.keyValues([['Proyecto', 'X'], ['Fecha', '…']]);
//   pdf.heading('Partidas');
//   pdf.table({ head: [['Clave', 'Descripción']], body: [...] });
//   pdf.save('presupuesto.pdf');

import { loadScript, LOGO_URL, fmt, downloadBlob } from './ui-components.js';

const COLORS = {
  ink: [15, 20, 25],
  text: [26, 26, 26],
  dim: [107, 107, 107],
  line: [227, 225, 220],
  accent: [27, 94, 126],
  accentWash: [232, 241, 245],
  sunken: [242, 241, 237],
  warn: [201, 130, 47],
};

const PAGE = { margin: 16, headerH: 22, footerH: 16 }; // mm

let logoPromise;
function logoDataUrl() {
  logoPromise ??= fetch(LOGO_URL)
    .then((r) => r.blob())
    .then((b) => new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(b);
    }))
    .catch(() => null);
  return logoPromise;
}

async function loadLibs() {
  await loadScript('vendor/jspdf.umd.min.js');
  await loadScript('vendor/jspdf.plugin.autotable.min.js');
  return window.jspdf.jsPDF;
}

/**
 * @param {object} opts
 * @param {string} opts.title        Document title (e.g. "Presupuesto paramétrico")
 * @param {string} [opts.subtitle]
 * @param {string} [opts.docId]      Folio shown top-right
 * @param {string} [opts.disclaimer] Printed at the end and in small type in every footer
 * @param {'portrait'|'landscape'} [opts.orientation]
 */
export async function createPdf({ title, subtitle = '', docId = '', disclaimer = '', orientation = 'portrait' }) {
  const [JsPDF, logo] = await Promise.all([loadLibs(), logoDataUrl()]);
  const doc = new JsPDF({ unit: 'mm', format: 'letter', orientation });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const contentW = W - PAGE.margin * 2;
  const TOP = PAGE.margin + PAGE.headerH - 2;
  let y = TOP;

  const runTable = (opts) => (typeof doc.autoTable === 'function'
    ? doc.autoTable(opts)
    : window.jspdf_autotable.autoTable(doc, opts));

  function drawChrome() {
    // Header
    if (logo) doc.addImage(logo, 'PNG', PAGE.margin, PAGE.margin - 4, 22, 12.2);
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...COLORS.ink);
    doc.text(title, PAGE.margin + 27, PAGE.margin + 2);
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...COLORS.dim);
    if (subtitle) doc.text(subtitle, PAGE.margin + 27, PAGE.margin + 7);
    doc.text('IGB AEC Suite', W - PAGE.margin, PAGE.margin + 2, { align: 'right' });
    if (docId) doc.text(docId, W - PAGE.margin, PAGE.margin + 7, { align: 'right' });
    doc.setDrawColor(...COLORS.accent).setLineWidth(0.6);
    doc.line(PAGE.margin, PAGE.margin + PAGE.headerH - 10, W - PAGE.margin, PAGE.margin + PAGE.headerH - 10);
  }

  function ensureSpace(h) {
    if (y + h > H - PAGE.footerH - 4) {
      doc.addPage();
      drawChrome();
      y = TOP;
    }
  }

  drawChrome();

  const api = {
    doc,

    heading(text) {
      ensureSpace(12);
      y += 2;
      doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(...COLORS.accent);
      doc.text(text.toUpperCase(), PAGE.margin, y);
      y += 2;
      doc.setDrawColor(...COLORS.line).setLineWidth(0.2).line(PAGE.margin, y, W - PAGE.margin, y);
      y += 5;
      return api;
    },

    paragraph(text, { size = 9.5, color = COLORS.text, bold = false } = {}) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size).setTextColor(...color);
      const lines = doc.splitTextToSize(String(text ?? ''), contentW);
      const lh = size * 0.42;
      for (const line of lines) {
        ensureSpace(lh);
        doc.text(line, PAGE.margin, y);
        y += lh;
      }
      y += 2;
      return api;
    },

    bullets(items, opts = {}) {
      for (const item of items) api.paragraph(`•  ${item}`, opts);
      return api;
    },

    keyValues(pairs, { columns = 2 } = {}) {
      const rows = [];
      for (let i = 0; i < pairs.length; i += columns) {
        const row = [];
        for (let c = 0; c < columns; c++) {
          const p = pairs[i + c];
          row.push(p ? p[0] : '', p ? String(p[1] ?? '—') : '');
        }
        rows.push(row);
      }
      const columnStyles = {};
      for (let c = 0; c < columns; c++) {
        columnStyles[c * 2] = { fontStyle: 'bold', textColor: COLORS.dim, cellWidth: 30 };
      }
      api.table({ body: rows, theme: 'plain', columnStyles, styles: { fontSize: 8.5, cellPadding: 1.4 } });
      return api;
    },

    /** Thin wrapper over autotable with the brand styles. */
    table({ head, body, foot, columnStyles = {}, theme = 'grid', styles = {}, didParseCell }) {
      runTable({
        startY: y,
        head, body, foot, theme, columnStyles, didParseCell,
        showHead: 'everyPage', showFoot: 'lastPage',
        margin: { left: PAGE.margin, right: PAGE.margin, top: TOP, bottom: PAGE.footerH + 4 },
        styles: { font: 'helvetica', fontSize: 7.8, cellPadding: 1.6, lineColor: COLORS.line, lineWidth: 0.1, textColor: COLORS.text, ...styles },
        headStyles: { fillColor: COLORS.accent, textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: COLORS.sunken, textColor: COLORS.ink, fontStyle: 'bold' },
        alternateRowStyles: theme === 'grid' ? { fillColor: [252, 252, 250] } : undefined,
        willDrawPage: (data) => { if (data.pageNumber > 1) drawChrome(); },
      });
      y = doc.lastAutoTable.finalY + 6;
      return api;
    },

    /** Signature lines, e.g. ['Residente de obra', 'Supervisión']. */
    signatures(names) {
      ensureSpace(30);
      y += 14;
      const cols = Math.min(names.length, 3);
      const colW = contentW / cols;
      names.forEach((name, i) => {
        const col = i % cols;
        if (i > 0 && col === 0) { y += 26; ensureSpace(26); }
        const x = PAGE.margin + col * colW;
        doc.setDrawColor(...COLORS.ink).setLineWidth(0.3).line(x + 6, y, x + colW - 6, y);
        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...COLORS.dim);
        doc.text(doc.splitTextToSize(name, colW - 12), x + colW / 2, y + 4, { align: 'center' });
      });
      y += 12;
      return api;
    },

    space(mm = 4) { y += mm; return api; },

    /** Finish the document (disclaimer + footers) and return it as a Blob. */
    blob() {
      finalize();
      return doc.output('blob');
    },

    save(filename) {
      downloadBlob(api.blob(), filename);
    },
  };

  let finalized = false;
  function finalize() {
    if (finalized) return;
    finalized = true;
    if (disclaimer) {
      ensureSpace(18);
      y += 2;
      doc.setFillColor(...COLORS.accentWash);
      const lines = doc.setFontSize(8).splitTextToSize(disclaimer, contentW - 6);
      const h = lines.length * 3.4 + 5;
      ensureSpace(h);
      doc.rect(PAGE.margin, y, contentW, h, 'F');
      doc.setFont('helvetica', 'normal').setTextColor(...COLORS.ink);
      doc.text(lines, PAGE.margin + 3, y + 4.5);
      y += h + 4;
    }
    // Footers with page numbers
    const pages = doc.getNumberOfPages();
    const stamp = `Generado el ${fmt.date()} · IGB AEC Suite`;
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...COLORS.line).setLineWidth(0.2).line(PAGE.margin, H - PAGE.footerH + 2, W - PAGE.margin, H - PAGE.footerH + 2);
      doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...COLORS.dim);
      doc.text(stamp, PAGE.margin, H - PAGE.footerH + 6);
      doc.text(`Página ${i} de ${pages}`, W - PAGE.margin, H - PAGE.footerH + 6, { align: 'right' });
    }
  }
  return api;
}
