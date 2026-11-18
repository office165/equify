/**
 * Real Chrome PDF harness for the customer report (round 2).
 * Builds the HTML exactly like the customer path (mapWizardToValuationData then buildPdfHtml),
 * renders it with renderHtmlToPdfBuffer (the function /api/generate-pdf uses), rasterizes each
 * PDF page to PNG with PDFKit (tests/pdf/rasterize.swift), and checks the layout in Chrome.
 *
 * Chrome: PUPPETEER_EXECUTABLE_PATH, a system Chrome, or Chrome for Testing from the
 * Playwright cache (~/Library/Caches/ms-playwright). Fonts load from Google Fonts like in production.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer, { type Browser } from 'puppeteer-core';
import { buildPdfHtml, PDF_PAGE_COUNT, reportPageCount } from '../../lib/pdf-template';
import { mapWizardToValuationData } from '../../lib/pdf-template/map-from-wizard';
import type { ValuationData } from '../../lib/pdf-template/types';
import type { EquifyWizardCredit } from '../../lib/wizard/map_equify_wizard';
import { buildWizardState } from '../lib/fixtures';
import { TEST_FX } from '../lib/run_case';
import { renderHtmlToPdfBuffer } from '../../lib/pdf/render_html_pdf';
import { probeLocalChromeExecutable } from '../../lib/pdf/resolve_chrome_executable';
import { ANCHOR_CASES, type CaseSpec } from '../lib/fixtures';
import { GOLDEN_CASES } from '../lib/golden';
import { withQuietConsole } from '../lib/quiet';

export const ROOT = path.join(__dirname, '..', '..');

const GOLDEN_FOR_PDF = [
  'golden-restaurant',
  'golden-boutique-hotel',
  'golden-b2b-saas',
  'golden-manufacturing',
  'golden-income-re',
  'golden-large-industrial',
];

/** Round 4: CREDIT_CHAPTER=on renders every case with credit answers (the chapter is page 4 of 9). */
export function creditMode(): boolean {
  return process.env.CREDIT_CHAPTER?.trim().toLowerCase() === 'on';
}

/** Round 4: the case with every credit question answered (owner loans, a bank lien, a subsidiary). */
export const CREDIT_FULL_CASE_ID = 'credit-full-subsidiary';

/** Basic answers for the 13 cases: a monthly loan payment of 0.6% of the gross debt, nothing else. */
export function caseCredit(spec: CaseSpec): EquifyWizardCredit {
  if (spec.id === CREDIT_FULL_CASE_ID) {
    return {
      monthlyDebtServiceK: Math.round(spec.grossDebt * 0.006),
      ownerLoans: { has: true, amountK: Math.round(spec.grossDebt * 0.3) },
      liens: { has: true, holder: 'bank', type: 'floating' },
      nonOperating: { has: true, holdingPct: 75, preTaxProfitK: Math.round(spec.y[2][1] * 0.25), estimatedValueK: 0 },
    };
  }
  return {
    monthlyDebtServiceK: Math.round(spec.grossDebt * 0.006),
    ownerLoans: { has: false, amountK: 0 },
    liens: { has: false, holder: '', type: '' },
    nonOperating: { has: false, holdingPct: 0, preTaxProfitK: 0, estimatedValueK: 0 },
  };
}

/** 7 anchors and 6 varied golden cases (restaurant, hotel, SaaS, factory, income RE, 1B company). */
export function pdfCases(): CaseSpec[] {
  const all = [...ANCHOR_CASES, ...GOLDEN_FOR_PDF.map((id) => GOLDEN_CASES.find((c) => c.id === id)!)];
  if (creditMode()) {
    const factory = GOLDEN_CASES.find((c) => c.id === 'golden-manufacturing')!;
    all.push({ ...factory, id: CREDIT_FULL_CASE_ID });
  }
  const only = process.env.PDF_ONLY?.split(',').map((x) => x.trim()).filter(Boolean);
  return only?.length ? all.filter((c) => only.includes(c.id)) : all;
}

export function caseData(spec: CaseSpec): ValuationData {
  const state = buildWizardState(spec);
  if (creditMode()) state.credit = caseCredit(spec);
  return withQuietConsole(() => mapWizardToValuationData(state, `TEST-${spec.id}`, 'he', TEST_FX));
}

export function caseHtml(spec: CaseSpec): string {
  const data = caseData(spec);
  return withQuietConsole(() => buildPdfHtml(data));
}

/** 8 pages, or 9 with the credit chapter. */
export function expectedPages(spec: CaseSpec): number {
  return reportPageCount(caseData(spec));
}

function resolveChrome(): string {
  const local = probeLocalChromeExecutable();
  if (local) return local.path;
  const cache = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  if (fs.existsSync(cache)) {
    const dirs = fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
    for (const d of dirs) {
      for (const arch of ['chrome-mac-arm64', 'chrome-mac']) {
        const p = path.join(cache, d, arch, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
        if (fs.existsSync(p)) return p;
      }
    }
  }
  throw new Error('No Chrome found. Set PUPPETEER_EXECUTABLE_PATH.');
}

export async function launch(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    executablePath: resolveChrome(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
}

/**
 * PNG rasterizer (macOS PDFKit via swiftc). Optional: without swiftc (Linux, CI) or with
 * PDF_RASTERIZE=off the PDF is still rendered by Puppeteer and checked in the DOM; only the PNG
 * images are skipped and the page count is read from the PDF itself.
 */
let rasterizer: string | null | undefined;
let rasterizerNote = '';
export function rasterizerStatus(): string {
  ensureRasterizer();
  return rasterizer ? 'PNG via PDFKit (swiftc)' : `no PNG (${rasterizerNote})`;
}

function ensureRasterizer(): string | null {
  if (rasterizer !== undefined) return rasterizer;
  if (process.env.PDF_RASTERIZE?.trim().toLowerCase() === 'off') {
    rasterizerNote = 'PDF_RASTERIZE=off';
    rasterizer = null;
    return null;
  }
  const out = path.join(ROOT, 'tmp', 'pdf-rasterize');
  const src = path.join(__dirname, 'rasterize.swift');
  try {
    if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      execFileSync('swiftc', ['-O', src, '-o', out], { stdio: 'pipe' });
    }
    rasterizer = out;
  } catch (err) {
    rasterizerNote = `swiftc unavailable: ${err instanceof Error ? err.message.split('\n')[0].slice(0, 80) : String(err)}`;
    rasterizer = null;
  }
  return rasterizer;
}

/** Page count read from the PDF bytes (page objects of a Chrome PDF are not compressed). */
export function countPdfPages(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}

/** Writes <id>.pdf and, when the rasterizer is available, <id>-p<N>.png (110 dpi). Returns the PDF page count. */
export async function renderCase(browser: Browser, spec: CaseSpec, outDir: string, fileId = spec.id): Promise<number> {
  const html = caseHtml(spec);
  const pdf = await renderHtmlToPdfBuffer(html, browser);
  fs.mkdirSync(outDir, { recursive: true });
  const pdfPath = path.join(outDir, `${fileId}.pdf`);
  fs.writeFileSync(pdfPath, pdf);
  const raster = ensureRasterizer();
  if (!raster) return countPdfPages(pdf);
  const count = execFileSync(raster, [pdfPath, path.join(outDir, fileId), '110'], { encoding: 'utf8' });
  return Number(count.trim());
}

export interface LayoutIssue {
  page: number;
  kind: string;
  detail: string;
}

export interface LayoutResult {
  htmlPages: number;
  assistantLoaded: boolean;
  issues: LayoutIssue[];
}

/** Layout checks inside Chrome with print media (same viewport as the PDF path). */
export async function checkLayout(browser: Browser, html: string): Promise<LayoutResult> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'load', timeout: 60_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    return (await page.evaluate(`(() => {
      const issues = [];
      const pages = Array.from(document.querySelectorAll('.page'));
      const label = (el) => {
        const cls = typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
        const txt = (el.textContent ?? '').replace(/\\s+/g, ' ').trim().slice(0, 40);
        return \`\${el.tagName.toLowerCase()}\${cls ? '.' + cls : ''} "\${txt}"\`;
      };
      pages.forEach((p, i) => {
        const n = i + 1;
        const pr = p.getBoundingClientRect();
        if (p.scrollHeight > p.clientHeight + 1) issues.push({ page: n, kind: 'page-overflow-y', detail: \`\${p.scrollHeight} > \${p.clientHeight}\` });
        if (p.scrollWidth > p.clientWidth + 1) issues.push({ page: n, kind: 'page-overflow-x', detail: \`\${p.scrollWidth} > \${p.clientWidth}\` });
        const inside = (r) => r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1 && r.left >= pr.left - 1 && r.right <= pr.right + 1;
        // Tables and boxes stay inside the page and do not scroll internally.
        p.querySelectorAll('table, [class*="card"], [class*="box"], [class*="panel"], [class*="kpi"], [class*="tile"]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          if (!inside(r)) issues.push({ page: n, kind: 'element-outside-page', detail: label(el) });
          const cs = getComputedStyle(el);
          if (cs.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1) issues.push({ page: n, kind: 'element-overflow-y', detail: \`\${label(el)} \${el.scrollHeight}>\${el.clientHeight}\` });
          if (cs.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) issues.push({ page: n, kind: 'element-overflow-x', detail: \`\${label(el)} \${el.scrollWidth}>\${el.clientWidth}\` });
        });
        // Text actually clipped by an overflow:hidden (or ellipsis) container.
        p.querySelectorAll('*').forEach((el) => {
          if (el === p) return;
          const cs = getComputedStyle(el);
          const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.textOverflow === 'ellipsis';
          if (!clips) return;
          if (!(el.textContent ?? '').trim()) return;
          if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
            issues.push({ page: n, kind: 'text-clipped', detail: \`\${label(el)} \${el.scrollWidth}x\${el.scrollHeight} > \${el.clientWidth}x\${el.clientHeight}\` });
          }
        });
        // Round 3: each private company layer line on page 4 is one line (no wrap).
        p.querySelectorAll('.private-layer-line').forEach((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const tops = new Set(Array.from(range.getClientRects()).filter((r) => r.width > 0).map((r) => Math.round(r.top)));
          if (tops.size > 1) issues.push({ page: n, kind: 'line-wraps', detail: \`\${tops.size} lines: "\${(el.textContent ?? '').trim().slice(0, 40)}"\` });
        });
        // No text runs into the page footer (round 2: methodology 2 notes are longer).
        const foot = p.querySelector('.foot');
        const fr = foot ? foot.getBoundingClientRect() : null;
        // Every visible text run is inside its page.
        const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (!(node.textContent ?? '').trim()) continue;
          const parent = node.parentElement;
          if (!parent || getComputedStyle(parent).visibility === 'hidden' || getComputedStyle(parent).display === 'none') continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          const r = range.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (!inside(r)) issues.push({ page: n, kind: 'text-outside-page', detail: \`"\${(node.textContent ?? '').trim().slice(0, 40)}"\` });
          if (fr && foot && !foot.contains(node) && r.bottom > fr.top + 1 && r.top < fr.bottom && r.right > fr.left && r.left < fr.right) {
            issues.push({ page: n, kind: 'text-overlaps-footer', detail: \`"\${(node.textContent ?? '').trim().slice(0, 40)}"\` });
          }
        }
      });
      const assistantLoaded = Array.from(document.fonts).some(
        (f) => f.family.replace(/["']/g, '') === 'Assistant' && f.status === 'loaded',
      );
      return { htmlPages: pages.length, assistantLoaded, issues };
})()`)) as LayoutResult;
  } finally {
    await page.close();
  }
}

export const EXPECTED_PAGES = PDF_PAGE_COUNT;
