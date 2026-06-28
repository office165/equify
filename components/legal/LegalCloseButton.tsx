'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/** Floating dismiss — pops history stack (wizard step, landing section, etc.). */
export function LegalCloseButton() {
  const router = useRouter();

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <button
      type="button"
      onClick={handleClose}
      aria-label="סגור חלון"
      className="fixed left-6 top-6 z-50 cursor-pointer rounded-full border border-teal-800/30 bg-teal-900/20 p-2 text-teal-400 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-teal-900/50 hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020504] md:left-8 md:top-8"
    >
      <X size={24} aria-hidden="true" />
    </button>
  );
}
