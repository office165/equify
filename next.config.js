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
    outputFileTracingIncludes: {
      '/api/v1/reports/valuation/pdf': [
        './node_modules/@sparticuz/chromium/**',
        './node_modules/@sparticuz/chromium/bin/**',
      ],
      '/api/generate-pdf': [
        './node_modules/@sparticuz/chromium/**',
        './node_modules/@sparticuz/chromium/bin/**',
        './lib/pdf-template/**',
      ],
      '/api/generate-html': [
        './lib/pdf-template/**',
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
