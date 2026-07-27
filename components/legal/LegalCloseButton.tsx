'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

function canNavigateBack(): boolean {
  if (typeof window === 'undefined') return false;
  // Primary signal; document.referrer may be empty (referrer-policy) and must not block back().
  return window.history.length > 1;
}

/** Floating dismiss — returns to prior in-app route without full reload when possible. */
export function LegalCloseButton() {
  const router = useRouter();

  const handleClose = useCallback(() => {
    if (canNavigateBack()) {
      router.back();
      return;
    }
    router.push('/');
  }, [router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleClose]);

  return (
    <button
      type="button"
      onClick={handleClose}
      aria-label="סגור"
      className="fixed start-6 top-6 z-50 cursor-pointer rounded-full border border-teal-800/30 bg-teal-900/20 p-2 text-teal-400 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-teal-900/50 hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020504] md:start-8 md:top-8"
    >
      <X size={24} aria-hidden="true" />
    </button>
  );
}
