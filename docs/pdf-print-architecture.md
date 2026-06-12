# PDF Print Architecture — Official Development Guideline

**Product:** equify BY SBC · Valuation PDF  
**Stack:** Next.js 14 · React · Tailwind · Puppeteer/Chromium  
**Reference standard:** Dirobot-style block atomization (non-clipping, multi-page A4)

---

## 1. Theoretical Architecture & Comparison

### 1.1 How headless PDF compilation works

Puppeteer/Chromium does **not** screenshot a viewport. It:

1. Loads HTML + CSS into a layout engine (Blink).
2. Applies `@media print` and `@page` rules.
3. **Fragments** the document into discrete pages using CSS fragmentation properties (`break-inside`, `break-after`, `orphans`, `widows`).
4. Renders each page to PDF vector/raster output.

The PDF engine treats the DOM as a **paginated document**, not a scrollable app shell. Anything that assumes infinite vertical scroll or a fixed viewport will fail.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser UI model          │  Print/PDF model               │
├────────────────────────────┼────────────────────────────────┤
│  flex/grid + overflow:auto │  block flow + page boxes       │
│  h-screen / 100vh          │  @page { size: A4 }            │
│  position:sticky           │  fragmentation + orphans       │
│  transform / clip-path     │  break-inside: avoid on atoms  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Why flex/grid + overflow-hidden causes clipping

| Anti-pattern | Screen behavior | PDF failure mode |
|--------------|-----------------|------------------|
| `overflow: hidden` on card wrappers | Clips decorative bleed, enables scroll siblings | Content below fold is **discarded**, not paginated |
| `h-screen`, `min-h-screen`, `100vh` | Fills one viewport | Engine allocates **one page height**; remainder vanishes or overlaps |
| `flex` / `grid` with fixed row heights | Equal-height bento tiles | Fragmentation cannot split flex items predictably → **mid-card slices** |
| `overflow-y: auto` on dashboard shell | Internal scroll | Print engine prints **visible viewport only** |
| Heavy `py-20`, `my-32` in capture tree | Marketing whitespace | Creates **orphan headers** and blank voids between pages |

**Root cause:** Print layout uses **block fragmentation**, not flex allocation. A flex child with implicit height becomes an unbreakable box; if it exceeds the page, Chromium either clips or splits at arbitrary glyph boundaries.

### 1.3 Block-level atomization model (Dirobot standard)

Instead of responsive containers that trap content, compose PDFs from **semantic atoms**:

```
PdfPrintReportRoot          ← A4 root, overflow: visible, height: auto
 └── PdfPrintSection        ← break-inside: avoid (header + body group)
      ├── h2.section-header-title   ← break-after: avoid
      └── print-block-flow
           ├── PdfPrintMetricCard   ← print-card-safe
           ├── PdfPrintMetricCard
           └── PdfPrintTable         ← tr { break-inside: avoid }
```

**Principles:**

1. **Natural height** — every node `height: auto`; never `vh` inside `#valubot-report-capture`.
2. **Visible overflow** — `overflow: visible !important` on capture subtree.
3. **Grid/flex demotion** — in print, `.grid` / `.flex` → `display: block` so children stack and paginate.
4. **Atomic cards** — financial metrics, bento tiles, charts wrapped in `.print-card-safe`.
5. **Tables are special** — keep `display: table` on `<table>`, `table-row` on `<tr>`; only rows are break-avoid units.
6. **Header glue** — `h1–h3` + `.section-header-title` use `break-after: avoid-page`.

### 1.4 Dual activation paths

| Path | Trigger | CSS activation |
|------|---------|----------------|
| Browser print | `window.print()` / Cmd+P | `@media print` |
| Puppeteer | `page.pdf()` after `page.emulateMediaType('print')` | `@media print` |
| Pre-print DOM capture | class on root before PDF | `.valubot-pdf-capturing`, `.pdf-mode`, `.equify-pdf-capturing` |

Always mirror rules in **both** `@media print` and capture classes so live preview matches Puppeteer output.

---

## 2. Master Print Utility Stylesheet

**Canonical file:** `lib/pdf/print/print-compliance.css`  
**Imported by:** `app/globals.css`  
**Puppeteer injection:** `getPrintComplianceCss()` in `lib/pdf/print/print-compliance.ts`  
**Appended in:** `buildPrintReportCss()` (`lib/pdf/print/print_styles.ts`)

### 2.1 A4 page contract

```css
@page {
  size: A4 portrait;
  margin: 15mm 12mm; /* block inline */
}

html, body, .pdf-root-container {
  width: 210mm !important;
  max-width: 210mm !important;
  height: auto !important;
  overflow: visible !important;
}
```

### 2.2 Overflow & viewport remediation

```css
.pdf-report-subtree .overflow-hidden,
.pdf-report-subtree .overflow-y-auto {
  overflow: visible !important;
}

.h-screen, .min-h-screen, .h-[100vh] {
  height: auto !important;
  min-height: 0 !important;
}
```

### 2.3 Immutable break-inside lines

```css
.print-card-safe,
.pdf-card-contain,
.metric-card,
.diagnostic-block,
.bento-item,
.chart-wrapper,
.chart-wrapper-block {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
  display: block !important;
  overflow: visible !important;
  height: auto !important;
}
```

> **Note:** Do **not** set `display: block` on `<tr>` — use `display: table-row` so column alignment survives. Cards and bento tiles use `display: block`; table rows use table display types.

### 2.4 Orphan header elimination

```css
h1, h2, h3, .section-header-title {
  page-break-after: avoid !important;
  break-after: avoid-page !important;
}

.print-section-group,
.pdf-section-group {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}
```

### 2.5 Tailwind class registry

| Class | Purpose |
|-------|---------|
| `print-a4-root` | Top-level 210mm capture root |
| `print-a4-sheet` | Inner padding safety zone |
| `print-card-safe` | Non-splittable metric/bento card |
| `print-section-group` | Header + body fragmentation unit |
| `print-section-header` | Title row with break-after avoid |
| `print-block-flow` | Block-level child stack |
| `print-table-safe` | Full-width fixed-layout table |
| `print-chart-safe` | Chart/canvas non-clip wrapper |
| `pdf-root-container` | Existing dashboard capture hook |
| `pdf-report-subtree` | Report content boundary |
| `data-pdf-exclude` | Hidden in print (nav, CTAs) |

**Helper functions** (`print-compliance.ts`):

```ts
import { printSafeClasses, printSectionClasses } from '@/lib/pdf/print/print-compliance';

<div className={printSafeClasses('metric-card', 'rounded-2xl')} />
<section className={printSectionClasses('my-6')} />
```

---

## 3. Practical Implementation — Next.js / React

### 3.1 Report page skeleton

```tsx
import {
  PdfPrintReportRoot,
  PdfPrintSection,
  PdfPrintMetricCard,
  PdfPrintTable,
} from '@/components/pdf/PdfPrintSection';

export function ValuationReportPrintTree() {
  return (
    <PdfPrintReportRoot id="valubot-report-capture">
      <PdfPrintSection title="מדדים פיננסיים מרכזיים" subtitle="תרחיש בסיס">
        <PdfPrintMetricCard label="שווי פעילות משוקלל" value="8.9M ₪" />
        <PdfPrintMetricCard label="הכנסות שנתיות" value="5.0M ₪" />
      </PdfPrintSection>

      <PdfPrintSection title="נספח טכני — לוח DCF מפורט">
        <PdfPrintTable
          caption="תרחיש בסיס — תזרים מפורט (₪)"
          headers={['שנה', 'הכנסות', 'EBIT', 'תזרים חופשי']}
          rows={[
            ['Y1', '5.6M', '1.1M', '634K'],
            ['Y2', '5.9M', '1.2M', '680K'],
          ]}
        />
      </PdfPrintSection>
    </PdfPrintReportRoot>
  );
}
```

### 3.2 Puppeteer capture sequence

```ts
import { PDF_CAPTURE_ROOT_CLASS } from '@/lib/pdf/print/print-compliance';

await page.emulateMediaType('print');
await page.evaluate((cls) => {
  document.getElementById('valubot-report-capture')?.classList.add(cls);
}, PDF_CAPTURE_ROOT_CLASS);

await page.pdf({
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
});
```

### 3.3 Pre-flight checklist

- [ ] Root uses `print-a4-root` + `height: auto` (no `min-h-screen` inside subtree)
- [ ] All cards use `print-card-safe` or `metric-card`
- [ ] Section titles inside `print-section-group`
- [ ] No `overflow-hidden` on ancestors of tables/charts
- [ ] Interactive chrome marked `data-pdf-exclude`
- [ ] Capture class applied before `page.pdf()`
- [ ] Visual diff against Dirobot reference: no mid-row splits, no orphan headers

### 3.4 Files in this system

| File | Role |
|------|------|
| `docs/pdf-print-architecture.md` | This guideline |
| `lib/pdf/print/print-compliance.css` | Master CSS module |
| `lib/pdf/print/print-compliance.ts` | CSS loader + class helpers |
| `lib/pdf/print/print_styles.ts` | Puppeteer chapter styles + compliance merge |
| `components/pdf/PdfPrintSection.tsx` | Reference React primitives |
| `app/globals.css` | Imports compliance CSS for app + print preview |

---

## 4. Debugging clipped PDFs

1. **Toggle print preview** in Chrome DevTools → Rendering → Emulate CSS media `print`.
2. Add `.valubot-pdf-capturing` to root in DevTools and inspect computed `overflow` / `height`.
3. Search for `overflow-hidden`, `h-screen`, `max-h-` in ancestors of clipped node.
4. Wrap orphaned header + content in `.pdf-section-group`.
5. If a card is taller than one page, split content into multiple `.print-card-safe` sections intentionally — never rely on flex shrink.

---

*Last updated: 2026-06-11 · Owner: PDF Platform Engineering*
