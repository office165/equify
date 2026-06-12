'use client';

import React, { useEffect } from 'react';

export interface PdfPreviewModalProps {
  open: boolean;
  pdfUrl: string | null;
  onClose: () => void;
  onDownload: () => void;
}

/** מודל תצוגה מקדימה להורדת PDF */
export function PdfPreviewModal({
  open,
  pdfUrl,
  onClose,
  onDownload,
}: PdfPreviewModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="modal-bg open"
      role="dialog"
      aria-modal="true"
      aria-label="תצוגה מקדימה של דוח PDF"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box">
        <div className="modal-head">
          <h3>דוח PDF מוכן להורדה</h3>
          <button
            type="button"
            className="modal-close"
            aria-label="סגור"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="תצוגה מקדימה PDF"
              style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }}
            />
          ) : (
            <p style={{ color: 'var(--dim)' }}>טוען PDF...</p>
          )}
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={onDownload}>
              הורד PDF
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
