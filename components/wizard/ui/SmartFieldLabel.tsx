'use client';

import React from 'react';
import { FieldTooltip } from './FieldTooltip';

export interface SmartFieldLabelProps {
  children: React.ReactNode;
  tooltip?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}

/** Label + inline info icon aligned on one horizontal row */
export function SmartFieldLabel({
  children,
  tooltip,
  required,
  htmlFor,
  className = '',
}: SmartFieldLabelProps) {
  return (
    <div
      className={`smart-field-label flex min-w-0 w-full flex-row items-center gap-2${className ? ` ${className}` : ''}`}
    >
      <label htmlFor={htmlFor} className="min-w-0 leading-snug">
        {children}
        {required ? <span className="req"> *</span> : null}
      </label>
      {tooltip ? <FieldTooltip text={tooltip} variant="inline" /> : null}
    </div>
  );
}
