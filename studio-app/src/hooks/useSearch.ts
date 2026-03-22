import { useMemo, useState, useCallback } from 'react';
import Fuse from 'fuse.js';
import type { IconEntry } from '../types';

const HISTORY_KEY = 'mkicon-search-history';
const HISTORY_MAX = 10;

export interface ParsedQuery {
  text: string;
  libFilter?: string;
}

/** Parse special prefixes out of a raw query string */
export const parseQuery = (raw: string): ParsedQuery => {
  let text = raw;
  let libFilter: string | undefined;

  const libMatch = text.match(/\blib:(\S+)/i);
  if (libMatch) {
    libFilter = libMatch[1].toLowerCase();
    text = text.replace(libMatch[0], '').trim();
  }

  return { text, libFilter };
};

const loadHistory = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};

const saveHistory = (history: string[]): void => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const useSearchHistory = () => {
  const [history, setHistory] = useState<string[]>(loadHistory);

  const push = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setHistory(prev => {
      const next = [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, HISTORY_MAX);
      saveHistory(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  return { history, push, clear };
};

export type SortMode = 'name' | 'recent';

export const useSearch = (
  icons: IconEntry[],
  searchQuery: string,
  styleFilter: 'auto' | 'filled' | 'outline',
  libraryFilter: string,
  sortMode: SortMode,
) => {
  const fuse = useMemo(
    () =>
      new Fuse(icons, {
        keys: ['componentName', 'libraryIconName', 'library'],
        threshold: 0.35,
        includeScore: true,
        ignoreLocation: true,
      }),
    [icons],
  );

  const filtered = useMemo(() => {
    const { text, libFilter } = parseQuery(searchQuery);

    const effectiveLibFilter = libFilter ?? (libraryFilter || undefined);

    let results: IconEntry[];

    if (text) {
      results = fuse.search(text).map(r => r.item);
    } else {
      results = [...icons];
    }

    if (effectiveLibFilter) {
      results = results.filter(i => i.library?.toLowerCase() === effectiveLibFilter);
    }

    if (styleFilter !== 'auto') {
      results = results.filter(
        i => i.detectedStyle === 'unknown' || i.detectedStyle === styleFilter,
      );
    }

    if (sortMode === 'name') {
      results = [...results].sort((a, b) => a.componentName.localeCompare(b.componentName));
    } else {
      // recent: preserve server order (already sorted by generatedAt desc)
    }

    return results;
  }, [icons, searchQuery, styleFilter, libraryFilter, sortMode, fuse]);

  return filtered;
};
