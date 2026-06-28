import { buildPdfFontFaceCss } from '../pdf_font_faces';

export function buildValuationPdfSheetCss(): string {
  const fontFaces = buildPdfFontFaceCss();

  return `
${fontFaces}
:root{
  --pine:#163530; --pine-deep:#0F2E29; --turq:#00A89F; --turq-bright:#00C2B8;
  --gold:#A8842E; --ink:#1E3A36; --dim:#527570; --line:#D6E8E4; --bg:#FFFFFF; --tint:#F0F8F6;
  --pdf-fs-body:12px;
  --pdf-fs-sub:13px;
  --pdf-fs-table:12px;
  --pdf-fs-table-head:12px;
  --pdf-fs-h2:20px;
  --pdf-fs-h3:14px;
  --pdf-fs-meta:11px;
  --pdf-lh-body:1.5;
  --pdf-cell-pad-v:6px;
  --pdf-cell-pad-h:4px;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{
  font-family:'Heebo','Assistant',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  color:var(--ink);background:#E6EDEB;font-size:var(--pdf-fs-body);line-height:var(--pdf-lh-body);
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
  direction:rtl;
}
.num{font-family:'IBM Plex Mono',ui-monospace,monospace;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}
.sheet{
  width:210mm;height:296mm;background:var(--bg);margin:0 auto;position:relative;
  overflow:hidden;page-break-after:always;display:flex;flex-direction:column;
}
.sheet.cover{display:flex;flex-direction:column}
.sheet:last-of-type{page-break-after:auto}
@page{size:A4;margin:0}

.head{display:flex;justify-content:space-between;align-items:center;gap:6mm;padding:11mm 14mm 0}
.head img{display:block;object-fit:contain;margin:0;padding:0;border:none;background:transparent;flex-shrink:0}
.equify-brand-logo{height:28pt;width:auto;max-width:42mm;object-fit:contain;display:block;flex-shrink:0;margin:0;padding:0;border:none;background:transparent}
.logo{font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:900;font-size:17px;color:var(--pine)}
.logo em{font-style:normal;color:var(--turq-bright)}
.logo small{font-family:'IBM Plex Mono',monospace;font-size:7.5px;letter-spacing:.22em;color:var(--gold);margin-inline-start:5px;font-weight:600}
.head .rid{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:.08em}
.rule{height:2px;margin:5mm 14mm 0;background:linear-gradient(90deg,var(--turq-bright),var(--gold))}
.cover .body{overflow:visible}
.cover .body.cover-layout{
  flex:1 1 0;
  display:flex;
  flex-direction:column;
  justify-content:flex-start;
  align-items:stretch;
  text-align:center;
  position:relative;
  overflow:visible;
  min-height:0;
  padding-top:4mm;
  padding-bottom:6mm;
  gap:0;
}
.body{flex:1;padding:5mm 14mm 0;overflow:hidden;line-height:var(--pdf-lh-body)}
.foot{display:flex;justify-content:space-between;align-items:center;padding:0 14mm 6mm;font-family:'IBM Plex Mono',monospace;font-size:var(--pdf-fs-meta);color:var(--dim);letter-spacing:.04em;line-height:var(--pdf-lh-body)}
.foot .pg b{color:var(--turq)}

.eyebrow{display:inline-flex;align-items:center;gap:7px;font-family:'IBM Plex Mono',monospace;font-size:var(--pdf-fs-meta);letter-spacing:.14em;color:var(--turq);text-transform:uppercase;font-weight:700;line-height:var(--pdf-lh-body)}
.eyebrow::before{content:"";width:20px;height:1px;background:var(--turq)}
h2{font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:900;font-size:var(--pdf-fs-h2);color:var(--pine);line-height:var(--pdf-lh-tight,1.35);margin:6px 0 4px}
h3{font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:700;font-size:var(--pdf-fs-h3);color:var(--pine);line-height:var(--pdf-lh-body);margin-bottom:2mm}
.sub{color:var(--dim);font-size:var(--pdf-fs-sub);max-width:150mm;line-height:var(--pdf-lh-body);font-weight:500}

.body.page-body--distributed{
  flex:1 1 0;
  display:flex;
  flex-direction:column;
  min-height:0;
  padding-bottom:8mm;
}
.page-intro{flex:0 0 auto;margin-bottom:6mm}
.page-intro .sub{margin-bottom:3mm}
.page-stack{
  flex:1 1 auto;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  gap:9mm;
  min-height:168mm;
  padding-top:2mm;
  padding-bottom:5mm;
}
.page-section{flex:0 0 auto;width:100%}
.page-body--exec .page-section--kpi .kgrid{margin:0}
.page-body--exec .page-section--waterfall .box{margin:0;padding:5mm}
.page-body--exec .page-section--blend .report-table{margin-top:0;margin-bottom:3mm}
.page-body--exec .page-section--blend .note{margin-top:0;margin-bottom:0}
.dcf-wacc-layout{display:grid;grid-template-columns:64mm 1fr;gap:7mm;align-items:start;width:100%}
.dcf-wacc-layout .box{margin:0;padding:5mm;text-align:center}
.dcf-wacc-layout .box h3{text-align:right}
.dcf-wacc-table-wrap .report-table{margin-top:0}
.page-body--dcf .page-section--horizon .report-table{margin-top:0;margin-bottom:3mm}
.page-body--dcf .page-section--horizon .note{margin-top:0;margin-bottom:0}
.page-body--multiples .page-section--tracks .box{margin:0;padding:5mm}
.page-body--multiples .page-section--comps .report-table{margin:0}
.page-body--multiples .page-section--compare .report-table{margin:0}

.cover-hero-zone{
  position:relative;
  z-index:1;
  flex:0 1 auto;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:flex-start;
  gap:4mm;
  width:100%;
  min-height:0;
  padding:2mm 0 0;
  margin-bottom:0;
}
.cover-header{
  position:relative;
  z-index:3;
  width:100%;
  max-width:170mm;
  margin:0 auto;
  flex:0 0 auto;
  text-align:center;
}
.cover-header .c-comp{margin-top:3mm;margin-bottom:2mm}
.cover-header .c-meta{margin-top:2mm;margin-bottom:1.5mm}
.cover .cover-header > .eyebrow,.cover .cover-header > .cover-eyebrow{justify-content:center;margin-bottom:6mm}
.cover-circle-stage{
  position:relative;
  width:min(68%,118mm);
  max-width:118mm;
  aspect-ratio:1;
  flex:0 0 auto;
  margin:2mm auto 0;
  display:block;
}
.cover-circle-stage .cover-rings-layer{
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  pointer-events:none;
  z-index:0;
  overflow:visible;
}
.cover-circle-stage .cover-rings-layer .cv-rings{
  position:static;
  width:100%;
  height:100%;
  max-width:none;
  max-height:none;
  aspect-ratio:1;
  flex:none;
}
.cover-bullseye{
  position:absolute;
  top:50%;
  left:50%;
  z-index:2;
  width:58%;
  height:58%;
  transform:translate(-50%,-50%);
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  overflow:hidden;
}
.cover-bullseye-inner{
  display:flex;
  align-items:center;
  justify-content:center;
  max-width:100%;
  white-space:nowrap;
  line-height:1.05;
  font-family:'IBM Plex Mono',monospace;
  font-weight:700;
  font-size:56px;
  color:var(--pine);
  direction:ltr;
}
.cover-bullseye .c-val,.cover-bullseye .num{
  margin:0!important;
  font:inherit;
  font-weight:inherit;
  color:inherit;
  direction:ltr;
  white-space:nowrap;
  max-width:100%;
  text-align:center;
}
.cover-bullseye .c-val em,.cover-bullseye .num em{font-style:normal;color:var(--turq-bright)}
.cover-bullseye.cover-val--lg .cover-bullseye-inner{font-size:46px}
.cover-bullseye.cover-val--xl .cover-bullseye-inner{font-size:36px}
.cover-lower-stack{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:flex-start;
  gap:4mm;
  width:100%;
  max-width:170mm;
  margin:6mm auto 0;
  flex:0 0 auto;
  position:relative;
  z-index:2;
  padding-bottom:2mm;
}
.cover-lower-stack .c-cap{
  margin:0;
  max-width:100%;
  font-size:11px;
  line-height:1.45;
  letter-spacing:.02em;
  white-space:nowrap;
}
.cover-lower-stack .seal{
  margin:0;
  font-size:11px;
  line-height:1.35;
  letter-spacing:.08em;
  padding:4px 12px;
  white-space:nowrap;
}
.cover-lower-stack .cover-metrics{width:100%;margin:0;padding:0}
.cover .cwrap > .eyebrow,.cover-eyebrow{justify-content:center;margin-bottom:9mm}
.cover-metrics{
  position:relative;
  z-index:2;
  flex:0 0 auto;
  width:100%;
}
.c-comp{font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:900;font-size:28px;color:var(--pine);margin-top:5mm;margin-bottom:4mm;line-height:1.12;letter-spacing:-0.01em}
.c-meta{font-family:'IBM Plex Mono',monospace;font-size:var(--pdf-fs-meta);color:var(--dim);letter-spacing:.06em;margin-top:3mm;margin-bottom:2.5mm;line-height:var(--pdf-lh-body)}
.c-val{font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:64px;color:var(--pine);margin:0;direction:ltr}
.c-val em{font-style:normal;color:var(--turq-bright)}
.c-cap{font-size:var(--pdf-fs-body);color:var(--dim);line-height:var(--pdf-lh-body);font-weight:500}
.c-cap b{color:var(--ink);font-weight:700}
.seal{display:inline-flex;align-items:center;gap:7px;margin-top:7mm;margin-bottom:0;border:1px solid var(--gold);color:var(--gold);font-family:'IBM Plex Mono',monospace;font-size:var(--pdf-fs-meta);letter-spacing:.12em;padding:7px 16px;border-radius:40px;font-weight:700;line-height:var(--pdf-lh-body)}
.seal i{width:5px;height:5px;border-radius:50%;background:var(--gold)}
.c-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4.5mm;margin-top:13mm;text-align:center}
.cover .c-grid,.c-grid--cover,.cover-metrics .c-grid{
  margin-top:0;
  padding-top:0;
  position:relative;
  z-index:2;
  gap:4mm;
}
.c-grid div{
  border:1px solid var(--line);
  border-radius:9px;
  padding:4mm 3mm;
  min-height:24mm;
  background:var(--tint);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2mm;
  overflow:visible;
}
.c-grid b{
  font-family:'IBM Plex Mono',monospace;
  font-size:24px;
  font-weight:700;
  line-height:1.12;
  display:block;
  color:var(--pine);
  direction:ltr;
  text-align:center;
  overflow:visible;
}
.cover .c-grid b,.c-grid--cover b{font-size:28px}
.c-grid span{
  font-size:11.5px;
  font-weight:600;
  line-height:1.35;
  color:var(--dim);
}
.cover .c-grid span,.c-grid--cover span{
  font-size:13px;
  font-weight:700;
  color:var(--ink);
  margin-top:1.5mm;
}

.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:7mm}
.kcard{
  border:1px solid var(--line);
  border-radius:9px;
  padding:5mm 3.5mm;
  min-height:22mm;
  background:var(--tint);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2mm;
  text-align:center;
  overflow:visible;
}
.kcard .kv{
  font-family:'IBM Plex Mono',monospace;
  font-weight:700;
  font-size:20px;
  line-height:1.15;
  color:var(--pine);
  direction:ltr;
  text-align:center;
  overflow:visible;
}
.kcard .kv.hl{color:var(--turq)}
.kcard .kv.gd{color:var(--gold)}
.kcard .kl{font-size:var(--pdf-fs-body);font-weight:600;color:var(--dim);margin-top:1mm;line-height:var(--pdf-lh-body)}
table{width:100%;border-collapse:collapse;margin-top:3mm;font-size:var(--pdf-fs-table);line-height:var(--pdf-lh-body)}
th{font-family:'IBM Plex Mono',monospace;font-size:var(--pdf-fs-table-head);letter-spacing:.04em;color:var(--dim);text-align:right;font-weight:700;padding:var(--pdf-cell-pad-v) var(--pdf-cell-pad-h);border-bottom:1.5px solid var(--pine);line-height:var(--pdf-lh-body)}
td{padding:var(--pdf-cell-pad-v) var(--pdf-cell-pad-h);border-bottom:1px solid var(--line);font-size:var(--pdf-fs-table);font-weight:500;line-height:var(--pdf-lh-body)}
td.n{font-family:'IBM Plex Mono',monospace;direction:ltr;text-align:left;font-weight:700}
table.report-table{width:100%;table-layout:fixed;border-collapse:collapse;margin-top:3mm;font-size:var(--pdf-fs-table);line-height:var(--pdf-lh-body)}
table.report-table th,table.report-table td{padding:var(--pdf-cell-pad-v) var(--pdf-cell-pad-h);vertical-align:middle;border-bottom:1px solid var(--line);box-sizing:border-box;overflow:hidden;word-wrap:break-word}
table.report-table th{font-family:'IBM Plex Mono',monospace;font-size:var(--pdf-fs-table-head);letter-spacing:.04em;color:var(--dim);font-weight:700;background:var(--tint);border-bottom:1.5px solid var(--pine);line-height:var(--pdf-lh-body)}
table.report-table th:first-child,table.report-table td:first-child{text-align:right;font-family:'Assistant',sans-serif;font-weight:600;color:var(--ink);font-size:var(--pdf-fs-table)}
table.report-table th:not(:first-child),table.report-table td:not(:first-child){text-align:center;font-family:'IBM Plex Mono',monospace;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;font-weight:600}
table.report-table td.n,table.report-table th.n{text-align:center;direction:ltr;font-weight:700}
table.report-table--multiples td.interp-cell,table.report-table--multiples th:last-child{text-align:right;font-family:'Assistant',sans-serif;font-weight:500;direction:rtl;unicode-bidi:plaintext;font-size:var(--pdf-fs-body);line-height:var(--pdf-lh-body);white-space:normal;overflow-wrap:anywhere}
tr.sum td{font-weight:700;color:var(--pine);border-bottom:none;border-top:1.5px solid var(--pine);background:var(--tint)}
tr.sum td.n{color:var(--turq)}
table.report-table tr.sum td{font-weight:700;background:var(--tint);border-top:1.5px solid var(--pine)}
table.report-table tr.sum td.n{color:var(--turq)}
.box{border:1px solid var(--line);border-radius:10px;padding:4mm;margin-top:3mm;background:#fff;line-height:var(--pdf-lh-body)}
.box h3{font-family:'Frank Ruhl Libre',Georgia,serif;font-size:var(--pdf-fs-h3);color:var(--pine);font-weight:700;margin-bottom:2mm;line-height:var(--pdf-lh-body)}
.note{font-size:var(--pdf-fs-body);color:var(--dim);background:var(--tint);border-inline-start:3px solid var(--turq-bright);padding:3mm 4mm;border-radius:0 6px 6px 0;margin-top:3mm;line-height:var(--pdf-lh-body);font-weight:500}
.axis{font-family:'IBM Plex Mono',monospace;font-size:10px;fill:#527570}
.gridln{stroke:#D6E8E4}

.wf-row{display:grid;grid-template-columns:34mm 1fr 24mm;align-items:center;gap:3mm;margin-bottom:3mm;font-size:var(--pdf-fs-body);line-height:var(--pdf-lh-body)}
.wf-row .lbl{color:var(--dim);font-weight:600}
.wf-track{height:7mm;border-radius:4px;background:#F0F8F6;position:relative;overflow:hidden}
.wf-fill{position:absolute;top:0;bottom:0;border-radius:4px}
.wf-row b{font-family:'IBM Plex Mono',monospace;direction:ltr;text-align:left;font-weight:700;font-size:var(--pdf-fs-table)}

.blend-bar{display:flex;height:13mm;border-radius:8px;overflow:hidden;border:1px solid var(--line);margin:5mm auto 0;max-width:150mm;width:100%}
.blend-seg{display:grid;place-items:center;font-family:'IBM Plex Mono',monospace;font-size:var(--pdf-fs-body);font-weight:700;line-height:var(--pdf-lh-body)}

.multiples-compare-table td.interp-cell,
td.interp-cell{
  font-size:var(--pdf-fs-body);
  line-height:var(--pdf-lh-body);
  color:var(--ink);
  text-align:right;
  vertical-align:top;
  max-width:58mm;
  min-width:42mm;
  white-space:normal;
  word-wrap:break-word;
  overflow-wrap:anywhere;
  hyphens:auto;
  padding:var(--pdf-cell-pad-v) var(--pdf-cell-pad-h);
  font-weight:500;
}
.multiples-compare-table th:last-child{min-width:42mm}

@media print{
  body{background:#ffffff !important}
  .sheet{
    width:210mm !important;
    height:296mm !important;
    overflow:hidden !important;
    page-break-after:always !important;
    display:flex !important;
    flex-direction:column !important;
    background:#ffffff !important;
    margin:0 !important;
  }
  .sheet:last-of-type{page-break-after:auto !important}
}
`;
}
