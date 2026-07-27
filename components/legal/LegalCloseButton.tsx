'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

function canNavigateBack(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.history.length <= 1) return false;

  const referrer = document.referrer.trim();
  if (!referrer) return false;

  try {
    return new URL(referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Floating dismiss — returns to prior in-app route without leaving the site. */
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
      className="fixed start-5 top-5 z-50 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-emerald-500/25 bg-[#0B1311]/85 text-[#00F5A0] shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-200 hover:border-emerald-500/45 hover:bg-[#0B1311] hover:text-[#05D38A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F5A0]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020504] active:scale-[0.97] md:start-6 md:top-6"
    >
      <X size={20} strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}
