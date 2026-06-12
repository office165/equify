/** עיצוב דוח PDF 7 עמודים — פורט מדויק מ-equify-pdf.html */
export function buildEquifyPdfCss(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700;900&family=Assistant:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
:root{
  --pine:#163530; --pine-deep:#0F2E29; --turq:#00A89F; --turq-bright:#00C2B8;
  --gold:#A8842E; --ink:#1E3A36; --dim:#527570; --line:#D6E8E4; --bg:#FFFFFF; --tint:#F0F8F6;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Assistant',sans-serif;color:var(--ink);background:#E6EDEB;font-size:11.5px;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.num{font-family:'IBM Plex Mono',monospace;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}
.sheet{width:210mm;height:296mm;background:var(--bg);margin:0 auto;position:relative;overflow:hidden;page-break-after:always;display:flex;flex-direction:column}
.sheet:last-of-type{page-break-after:auto}
@media print{body{background:#fff}.sheet{margin:0}}
@page{size:A4;margin:0}
.head{display:flex;justify-content:space-between;align-items:center;padding:11mm 14mm 0}
.logo{font-family:'Frank Ruhl Libre',serif;font-weight:900;font-size:17px;color:var(--pine)}
.logo em{font-style:normal;color:var(--turq-bright)}
.logo small{font-family:'IBM Plex Mono',monospace;font-size:7.5px;letter-spacing:.22em;color:var(--gold);margin-inline-start:5px;font-weight:600}
.head .rid{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:.08em}
.rule{height:2px;margin:5mm 14mm 0;background:linear-gradient(90deg,var(--turq-bright),var(--gold))}
.body{flex:1;padding:8mm 14mm 0}
.foot{display:flex;justify-content:space-between;align-items:center;padding:0 14mm 8mm;font-family:'IBM Plex Mono',monospace;font-size:7.5px;color:var(--dim);letter-spacing:.06em}
.foot .pg b{color:var(--turq)}
.eyebrow{display:inline-flex;align-items:center;gap:7px;font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:.2em;color:var(--turq);text-transform:uppercase;font-weight:600}
.eyebrow::before{content:"";width:20px;height:1px;background:var(--turq)}
h2{font-family:'Frank Ruhl Libre',serif;font-weight:900;font-size:24px;color:var(--pine);line-height:1.15;margin:8px 0 6px}
.sub{color:var(--dim);font-size:11px;max-width:150mm}
.cover .body{display:flex;flex-direction:column;justify-content:center;text-align:center;position:relative}
.cv-rings{position:absolute;inset:0;display:grid;place-items:center;z-index:0}
.cover .cwrap{position:relative;z-index:1}
.c-comp{font-family:'Frank Ruhl Libre',serif;font-weight:700;font-size:21px;color:var(--pine);margin-top:14px}
.c-meta{font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:var(--dim);letter-spacing:.12em;margin-top:4px}
.c-id{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:.08em;margin-top:3px}
.c-val{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:64px;color:var(--pine);margin:12mm 0 2mm;direction:ltr}
.c-val em{font-style:normal;color:var(--turq-bright)}
.c-cap{font-size:11px;color:var(--dim)}
.c-cap b{color:var(--ink)}
.seal{display:inline-flex;align-items:center;gap:7px;margin-top:11mm;border:1px solid var(--gold);color:var(--gold);font-family:'IBM Plex Mono',monospace;font-size:7.5px;letter-spacing:.18em;padding:7px 16px;border-radius:40px;font-weight:600}
.seal i{width:5px;height:5px;border-radius:50%;background:var(--gold)}
.c-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:13mm;text-align:center}
.c-grid div{border:1px solid var(--line);border-radius:8px;padding:5mm 2mm;background:var(--tint)}
.c-grid b{font-family:'IBM Plex Mono',monospace;font-size:15px;display:block;color:var(--pine);direction:ltr}
.c-grid span{font-size:9px;color:var(--dim)}
.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:7mm}
.kcard{border:1px solid var(--line);border-radius:8px;padding:5mm;background:var(--tint)}
.kcard .kv{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:16px;color:var(--pine);direction:ltr;text-align:right}
.kcard .kv.hl{color:var(--turq)}
.kcard .kv.gd{color:var(--gold)}
.kcard .kl{font-size:9px;color:var(--dim);margin-top:2px}
table{width:100%;border-collapse:collapse;margin-top:5mm;font-size:10.5px}
th{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:.1em;color:var(--dim);text-align:right;font-weight:600;padding:6px 8px;border-bottom:1.5px solid var(--pine)}
td{padding:7px 8px;border-bottom:1px solid var(--line)}
td.n{font-family:'IBM Plex Mono',monospace;direction:ltr;text-align:left}
tr.sum td{font-weight:700;color:var(--pine);border-bottom:none;border-top:1.5px solid var(--pine);background:var(--tint)}
tr.sum td.n{color:var(--turq)}
.box{border:1px solid var(--line);border-radius:10px;padding:6mm;margin-top:6mm;background:#fff}
.box h3{font-family:'Frank Ruhl Libre',serif;font-size:14px;color:var(--pine);font-weight:700;margin-bottom:3mm}
.note{font-size:9px;color:var(--dim);background:var(--tint);border-inline-start:3px solid var(--turq-bright);padding:4mm 5mm;border-radius:0 6px 6px 0;margin-top:6mm}
.axis{font-family:'IBM Plex Mono',monospace;font-size:8px;fill:#527570}
.gridln{stroke:#D6E8E4}
.wf-row{display:grid;grid-template-columns:34mm 1fr 24mm;align-items:center;gap:4mm;margin-bottom:4mm;font-size:10px}
.wf-row .lbl{color:var(--dim)}
.wf-track{height:8mm;border-radius:4px;background:#F0F8F6;position:relative;overflow:hidden}
.wf-fill{position:absolute;top:0;bottom:0;border-radius:4px}
.wf-row b{font-family:'IBM Plex Mono',monospace;direction:ltr;text-align:left;font-weight:600}
`;
}
