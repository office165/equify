import React from 'react';

export type TablerIconName =
  | 'building'
  | 'chart-bar'
  | 'shield-check'
  | 'file-text'
  | 'briefcase'
  | 'calculator'
  | 'scale'
  | 'trending-up'
  | 'chevron-down';

const ICON_PATHS: Record<TablerIconName, React.ReactNode> = {
  building: (
    <>
      <path d="M3 21h18" />
      <path d="M9 8h1" />
      <path d="M9 12h1" />
      <path d="M9 16h1" />
      <path d="M14 8h1" />
      <path d="M14 12h1" />
      <path d="M14 16h1" />
      <path d="M5 21v-14a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14" />
    </>
  ),
  'chart-bar': (
    <>
      <path d="M3 12m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
      <path d="M9 8m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
      <path d="M15 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
      <path d="M4 20h14" />
    </>
  ),
  'shield-check': (
    <>
      <path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
      <path d="M9 12l2 2l4 -4" />
    </>
  ),
  'file-text': (
    <>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
      <path d="M9 9h1" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </>
  ),
  briefcase: (
    <>
      <path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
      <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
      <path d="M12 12l0 .01" />
      <path d="M3 13a20 20 0 0 0 18 0" />
    </>
  ),
  calculator: (
    <>
      <path d="M4 3m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
      <path d="M8 7m0 1a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1z" />
      <path d="M8 14l0 .01" />
      <path d="M12 14l0 .01" />
      <path d="M16 14l0 .01" />
      <path d="M8 17l0 .01" />
      <path d="M12 17l0 .01" />
      <path d="M16 17l0 .01" />
    </>
  ),
  scale: (
    <>
      <path d="M7 20l10 0" />
      <path d="M6 6l12 0" />
      <path d="M12 6l0 14" />
      <path d="M9 6l3 -3l3 3" />
      <path d="M5 10l4 6" />
      <path d="M19 10l-4 6" />
      <path d="M3 10l4 0" />
      <path d="M17 10l4 0" />
    </>
  ),
  'trending-up': (
    <>
      <path d="M3 17l6 -6l4 4l8 -8" />
      <path d="M14 7l7 0l0 7" />
    </>
  ),
  'chevron-down': <path d="M6 9l6 6l6 -6" />,
};

export interface TablerIconProps {
  name: TablerIconName;
  className?: string;
  strokeWidth?: number;
}

export function TablerIcon({
  name,
  className = 'h-6 w-6',
  strokeWidth = 2,
}: TablerIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
