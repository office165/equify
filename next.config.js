/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@react-pdf/renderer',
      'pdfkit',
      'puppeteer-core',
      '@sparticuz/chromium',
      'exceljs',
    ],
    // Every route that builds the customer report reads lib/pdf-template/equify-report-print.css
    // from disk (process.cwd()) and, when it renders a PDF, needs the Chromium binary.
    // Without these entries Vercel's file tracing can drop them (round 1, finding 14).
    outputFileTracingIncludes: {
      '/api/v1/reports/valuation/pdf': [
        './node_modules/@sparticuz/chromium/**',
        './node_modules/@sparticuz/chromium/bin/**',
      ],
      '/api/generate-pdf': [
        './node_modules/@sparticuz/chromium/**',
        './node_modules/@sparticuz/chromium/bin/**',
        './lib/pdf-template/**',
        './public/fonts/**',
      ],
      '/api/generate-html': [
        './lib/pdf-template/**',
        './public/fonts/**',
      ],
      '/api/reports/deliver': [
        './node_modules/@sparticuz/chromium/**',
        './node_modules/@sparticuz/chromium/bin/**',
        './lib/pdf-template/**',
        './public/fonts/**',
      ],
      '/api/v1/reports/valuation/dispatch': [
        './node_modules/@sparticuz/chromium/**',
        './node_modules/@sparticuz/chromium/bin/**',
        './lib/pdf-template/**',
        './public/fonts/**',
      ],
    },
  },
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
  images: {
    unoptimized: process.env.CAPACITOR_BUILD === 'true',
  },
  // Round 12 (CONTENT_HUB): with the hub on, /llms.txt also lists the guides and articles (app/api/llms). With it off there is no
  // rewrite and public/llms.txt is served as it was. Read at build time, like the other site flags.
  rewrites: async () => ({
    beforeFiles: process.env.CONTENT_HUB?.trim().toLowerCase() === 'on' ? [{ source: '/llms.txt', destination: '/api/llms' }] : [],
    afterFiles: [],
    fallback: [],
  }),
  headers: async () => [
    {
      source: '/manifest.webmanifest',
      headers: [
        { key: 'Content-Type', value: 'application/manifest+json' },
        { key: 'Cache-Control', value: 'public, max-age=86400' },
      ],
    },
  ],
};

module.exports = nextConfig;
