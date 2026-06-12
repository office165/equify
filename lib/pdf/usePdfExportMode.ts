'use client';

import { useEffect, useState } from 'react';

/** True when ?pdf=1 or an ancestor is in PDF capture mode. */
export function usePdfExportMode(): boolean {
  const [pdfMode, setPdfMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('pdf') === '1') {
      setPdfMode(true);
      return;
    }
    const onCapture = () => {
      setPdfMode(
        Boolean(document.querySelector('.valubot-pdf-capturing, .pdf-mode')),
      );
    };
    onCapture();
    const observer = new MutationObserver(onCapture);
    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return pdfMode;
}
