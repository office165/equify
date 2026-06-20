/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './*.tsx',
    './ValuationWizard.tsx',
    './ValuationDashboard.tsx',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-equify)', 'Assistant', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        charcoal: {
          950: '#080B11',
          900: '#0D111A',
          800: '#161D2A',
        },
        mint: {
          400: '#00F5A0',
          500: '#10B981',
        },
        midnight: {
          950: '#080B11',
          900: '#0D111A',
          800: '#161D2A',
        },
      },
      backgroundImage: {
        'space-ellipse':
          'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
        'space-midnight':
          'linear-gradient(180deg, #020504 0%, #080F0D 100%)',
        'mint-cta':
          'linear-gradient(to right, #00F5A0, #05D38A)',
      },
      boxShadow: {
        'glow-mint': '0 0 24px rgba(0, 245, 160, 0.22)',
        'glow-mint-lg': '0 0 32px rgba(0, 245, 160, 0.35)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    function printCompliancePlugin({ addComponents }) {
      addComponents({
        '.print-a4-root': {
          width: '100%',
          maxWidth: '210mm',
          marginInline: 'auto',
          height: 'auto',
          minHeight: '0',
          overflow: 'visible',
        },
        '.print-card-safe': {
          position: 'relative',
          width: '100%',
          height: 'auto',
          overflow: 'visible',
        },
      });
    },
  ],
};
