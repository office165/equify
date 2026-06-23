/** עיצוב דוח 8 עמודים — מבוסס equify-report-source.html */
export function buildPdfTemplateCss(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;400;700;900&family=Assistant:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --pine:#163530;--pine2:#0F2E29;--turq:#00A89F;--turqB:#00C2B8;--gold:#A8842E;--goldL:#C9A84C;
  --red:#C24A4A;--ink:#1E3A36;--dim:#527570;--line:#D6E8E4;--tint:#F0F8F6;--bg:#FFFFFF;
}
html,body{background:#E8ECEB;font-family:'Assistant',sans-serif;font-size:11px;color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.mono{font-family:'IBM Plex Mono',monospace;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}
.num{font-family:'IBM Plex Mono',monospace;direction:ltr;text-align:left}
.page{width:210mm;min-height:296mm;background:var(--bg);margin:6mm auto;display:flex;flex-direction:column;position:relative;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.18)}
@media print{
  @page{size:A4;margin:0}
  body{background:#fff}
  .page{margin:0;box-shadow:none;page-break-after:always}
  .page:last-child{page-break-after:auto}
}
.lh{padding:9mm 13mm 0;display:flex;justify-content:space-between;align-items:flex-start}
.logo-txt{font-family:'Frank Ruhl Libre',serif;font-weight:900;font-size:19px;color:var(--pine)}
.logo-txt em{font-style:normal;color:var(--turqB)}
.logo-txt small{font-family:'IBM Plex Mono',monospace;font-size:7px;letter-spacing:.2em;color:var(--gold);margin-inline-start:5px}
.rid{font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--dim);letter-spacing:.07em;text-align:left}
.rule-grad{height:2.5px;margin:4mm 13mm 0;background:linear-gradient(90deg,var(--turqB) 0%,var(--gold) 55%,var(--turq) 100%);border-radius:2px}
.body{flex:1;padding:6mm 13mm 0}
.foot{padding:0 13mm 7mm;margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:4mm;margin-top:6mm}
.foot-l,.foot-r{font-size:7px;color:var(--dim);font-family:'IBM Plex Mono',monospace}
.foot-pg b{color:var(--turq)}
.eyebrow{display:inline-flex;align-items:center;gap:6px;font-family:'IBM Plex Mono',monospace;font-size:7px;letter-spacing:.2em;color:var(--turq);text-transform:uppercase;font-weight:600;margin-bottom:3mm}
.eyebrow::before{content:"";width:18px;height:1.5px;background:var(--turq)}
.section-divider{display:flex;align-items:center;gap:8px;margin:6mm 0 4mm}
.section-divider h2{font-family:'Frank Ruhl Libre',serif;font-weight:900;font-size:16px;color:var(--pine)}
.section-divider h3{font-family:'Frank Ruhl Libre',serif;font-weight:700;font-size:12px;color:var(--pine)}
.section-divider .sd-line{flex:1;height:1px;background:linear-gradient(90deg,var(--line),transparent)}
.section-num{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--dim);margin-inline-end:2px}
h2{font-family:'Frank Ruhl Libre',serif;font-weight:900;font-size:18px;color:var(--pine);line-height:1.2;margin-bottom:2mm}
h3{font-family:'Frank Ruhl Libre',serif;font-weight:700;font-size:12px;color:var(--pine);margin-bottom:2mm}
h4{font-family:'Assistant',sans-serif;font-weight:700;font-size:10.5px;color:var(--ink);margin-bottom:1.5mm}
p{line-height:1.65;color:var(--ink);margin-bottom:2mm}
.sub{color:var(--dim);font-size:10px;line-height:1.6}
.cover-hero{text-align:center;padding:8mm 0 6mm;position:relative}
.cover-rings{position:absolute;inset:0;pointer-events:none}
.cover-content{position:relative;z-index:1}
.cv-company{font-family:'Frank Ruhl Libre',serif;font-weight:700;font-size:22px;color:var(--pine);margin-bottom:1.5mm}
.cv-meta{font-family:'IBM Plex Mono',monospace;font-size:7.5px;color:var(--dim);letter-spacing:.1em;margin-bottom:8mm}
.cv-big{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:64px;color:var(--pine);direction:ltr;line-height:1;margin-bottom:1.5mm}
.cv-big span{color:var(--turqB)}
.cv-range{font-size:9.5px;color:var(--dim);margin-bottom:5mm}
.cv-range b{color:var(--ink)}
.seal{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--gold);color:var(--gold);font-family:'IBM Plex Mono',monospace;font-size:7px;letter-spacing:.16em;padding:5px 14px;border-radius:30px;font-weight:600;margin-bottom:7mm}
.seal i{width:5px;height:5px;border-radius:50%;background:var(--gold);display:inline-block}
.krow{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin:4mm 0}
.kc{border:1px solid var(--line);border-radius:9px;padding:5mm 3.5mm;min-height:24mm;background:var(--tint);position:relative;overflow:visible;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;text-align:center}
.kc::before{content:"";position:absolute;bottom:0;inset-inline:0;height:2.5px;background:var(--turq)}
.kc b{font-family:'IBM Plex Mono',monospace;font-size:24px;font-weight:700;line-height:1.15;display:block;direction:ltr;text-align:center;color:var(--pine);overflow:visible}
.kc b.hl{color:var(--turqB)}.kc b.gd{color:var(--gold)}.kc b.rd{color:var(--red)}
.kc span{font-size:10px;font-weight:500;color:var(--dim);line-height:1.3;margin-top:1mm}
.kc-label{font-size:12px;font-weight:700;color:var(--ink);margin-top:1mm;line-height:1.35}
table{width:100%;border-collapse:collapse;margin-bottom:3mm;font-size:9.5px}
th{font-family:'IBM Plex Mono',monospace;font-size:7px;letter-spacing:.1em;color:var(--dim);text-align:right;font-weight:600;padding:5px 7px;background:var(--tint);border-bottom:2px solid var(--pine);border-top:1px solid var(--line)}
td{padding:5.5px 7px;border-bottom:1px solid var(--line);vertical-align:middle}
td.n{font-family:'IBM Plex Mono',monospace;direction:ltr;text-align:left}
tr:nth-child(even){background:rgba(240,248,246,.45)}
tr.sum td{font-weight:700;background:var(--tint);border-top:2px solid var(--pine);border-bottom:2px solid var(--pine)}
tr.sum td.n{color:var(--turq)}
tr.bear-val{color:var(--red);font-weight:600}
tr.base-row td{background:rgba(0,168,159,.06)}
tr.base-row td.n-val{color:var(--turq);font-weight:700}
tr.bull-val{color:var(--gold);font-weight:600}
tr.hl-row td{font-weight:700}
.box{border:1px solid var(--line);border-radius:9px;padding:5mm;margin:3mm 0;background:var(--bg)}
.box.tint{background:var(--tint)}
.callout{border-inline-start:3px solid var(--turqB);padding:3mm 5mm;background:var(--tint);border-radius:0 7px 7px 0;margin:3mm 0;font-size:9.5px}
.callout.gold{border-color:var(--gold)}
.callout.red{border-color:var(--red)}
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.cols3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm}
.cols-6-4{display:grid;grid-template-columns:1.5fr 1fr;gap:5mm;align-items:start}
.cols-4-6{display:grid;grid-template-columns:1fr 1.5fr;gap:5mm;align-items:start}
.chart-title{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:.1em;color:var(--dim);margin-bottom:2mm;text-transform:uppercase}
.chart-wrap{border:1px solid var(--line);border-radius:9px;padding:4mm;background:var(--tint);margin:3mm 0}
.disclaimer{font-size:7.5px;color:var(--dim);border-top:1px solid var(--line);padding-top:3mm;margin-top:4mm;line-height:1.6}
.pill{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:7px;letter-spacing:.1em;padding:2px 8px;border-radius:20px;font-weight:600}
.pill-green{background:rgba(0,168,159,.12);color:var(--turq);border:1px solid rgba(0,168,159,.3)}
.pill-gold{background:rgba(168,132,46,.12);color:var(--gold);border:1px solid rgba(168,132,46,.3)}
.pill-red{background:rgba(194,74,74,.1);color:var(--red);border:1px solid rgba(194,74,74,.25)}
.sens-grid table td.center-cell{background:rgba(0,168,159,.18);font-weight:700;color:var(--pine)}
.sens-grid table td.low{color:var(--red)}
.sens-grid table td.high{color:var(--turq)}
.flow{display:flex;align-items:stretch;gap:0;margin:3mm 0}
.flow-step{flex:1;background:var(--tint);border:1px solid var(--line);padding:3mm;text-align:center;position:relative;font-size:9px}
.flow-step:not(:last-child)::after{content:"←";position:absolute;inset-inline-end:-8px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--turq);z-index:1;background:white;padding:0 1px}
.flow-step .fs-num{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:var(--turqB);display:block;margin-bottom:1mm}
.flow-step .fs-lbl{font-weight:700;color:var(--pine);font-size:8.5px}
.flow-step .fs-sub{color:var(--dim);font-size:7.5px;margin-top:1mm}
.axis{font-family:'IBM Plex Mono',monospace;font-size:8px;fill:#527570}
`;
}
