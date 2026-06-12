'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'valubot.a11y.preferences';

export interface AccessibilityPreferences {
  largeText: boolean;
  highContrast: boolean;
  focusHighlight: boolean;
  readableFont: boolean;
}

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  largeText: false,
  highContrast: false,
  focusHighlight: false,
  readableFont: false,
};

interface AccessibilityPreferencesContextValue {
  preferences: AccessibilityPreferences;
  toggle: (key: keyof AccessibilityPreferences) => void;
  reset: () => void;
  rootDataAttributes: Record<string, string>;
}

const AccessibilityPreferencesContext =
  createContext<AccessibilityPreferencesContextValue | null>(null);

function loadPreferences(): AccessibilityPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function persistPreferences(preferences: AccessibilityPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // ignore quota errors
  }
}

export function AccessibilityPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] =
    useState<AccessibilityPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    setPreferences(loadPreferences());
  }, []);

  const toggle = useCallback((key: keyof AccessibilityPreferences) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persistPreferences(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    persistPreferences(DEFAULT_PREFERENCES);
  }, []);

  const rootDataAttributes = useMemo(
    () => ({
      'data-a11y-large-text': String(preferences.largeText),
      'data-a11y-high-contrast': String(preferences.highContrast),
      'data-a11y-focus-highlight': String(preferences.focusHighlight),
      'data-a11y-readable-font': String(preferences.readableFont),
    }),
    [preferences],
  );

  const value = useMemo(
    () => ({ preferences, toggle, reset, rootDataAttributes }),
    [preferences, toggle, reset, rootDataAttributes],
  );

  return (
    <AccessibilityPreferencesContext.Provider value={value}>
      {children}
    </AccessibilityPreferencesContext.Provider>
  );
}

export function useAccessibilityPreferences(): AccessibilityPreferencesContextValue {
  const ctx = useContext(AccessibilityPreferencesContext);
  if (!ctx) {
    throw new Error(
      'useAccessibilityPreferences must be used within AccessibilityPreferencesProvider',
    );
  }
  return ctx;
}
