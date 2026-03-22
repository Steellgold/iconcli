import { useState, useCallback } from 'react';
import type { Prefs } from '../types';

const STORAGE_KEY = 'mkicon-studio-prefs';

const DEFAULT_PREFS: Prefs = {
  size: 48,
  stroke: 1.25,
  style: 'auto',
  color: '#e4e4e7',
  library: '',
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return [prefs, setPrefs];
}
