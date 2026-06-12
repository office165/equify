'use client';

import React from 'react';
import { LEGAL_DISCLAIMER_COMPACT_HE } from '../lib/legal/disclaimer';
import { PDF_LEGAL_STAMP_CLASS } from '../lib/pdf/theme';

/** In-report legal stamp — captured inside PDF export container. */
export function PdfLegalDisclaimerStamp() {
  return (
    <div
      className={`${PDF_LEGAL_STAMP_CLASS} mt-8 border-t border-[#00bfa5]/15 pt-4`}
      lang="he"
      dir="rtl"
      aria-label="הבהרה משפטית"
    >
      <p className="text-[10px] leading-relaxed text-emerald-100/55 sm:text-[11px]">
        {LEGAL_DISCLAIMER_COMPACT_HE}
      </p>
    </div>
  );
}
