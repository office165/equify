import { Font } from '@react-pdf/renderer';
import { pdfFontFamily } from './families';

export { pdfFontFamily };

let fontsRegistered = false;

const HEEBO_REGULAR =
  'https://fonts.gstatic.com/s/heebo/v28/NGSpv5_NC0k9P_v6ZUCbLRAHxK1EiSyccg.ttf';
const HEEBO_BOLD =
  'https://fonts.gstatic.com/s/heebo/v28/NGSpv5_NC0k9P_v6ZUCbLRAHxK1Ebiuccg.ttf';
const INTER_REGULAR =
  'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf';
const INTER_BOLD =
  'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf';

/**
 * Register Heebo (Hebrew + Latin) and Inter for premium bilingual PDF output.
 */
export function registerValubotPdfFonts(): void {
  if (fontsRegistered) {
    return;
  }

  Font.register({
    family: 'Heebo',
    fonts: [
      { src: HEEBO_REGULAR, fontWeight: 400 },
      { src: HEEBO_BOLD, fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'Inter',
    fonts: [
      { src: INTER_REGULAR, fontWeight: 400 },
      { src: INTER_BOLD, fontWeight: 700 },
    ],
  });

  fontsRegistered = true;
}
