/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@react-pdf/renderer',
      'pdfkit',
      'puppeteer-core',
      '@sparticuz/chromium',
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
