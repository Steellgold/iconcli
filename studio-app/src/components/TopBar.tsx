import { useRef, useState, useEffect, useCallback } from 'react';
import type { SortMode } from '../hooks/useSearch';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNewIcon: () => void;
  onPalette: () => void;
  searchHistory: string[];
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  resultCount: number;
}

export default function TopBar({
  searchQuery,
  onSearchChange,
  onNewIcon,
  onPalette,
  searchHistory,
  sortMode,
  onSortChange,
  resultCount,
}: TopBarProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close history on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        if (searchQuery) {
          onSearchChange('');
        } else {
          inputRef.current?.blur();
          setShowHistory(false);
        }
        setHistoryIndex(-1);
        return;
      }

      if (!showHistory || searchHistory.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(historyIndex + 1, searchHistory.length - 1);
        setHistoryIndex(next);
        onSearchChange(searchHistory[next]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = Math.max(historyIndex - 1, -1);
        setHistoryIndex(next);
        if (next === -1) onSearchChange('');
        else onSearchChange(searchHistory[next]);
      } else if (e.key === 'Enter') {
        setShowHistory(false);
        setHistoryIndex(-1);
      }
    },
    [searchQuery, searchHistory, showHistory, historyIndex, onSearchChange],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
      setHistoryIndex(-1);
      setShowHistory(true);
    },
    [onSearchChange],
  );

  const handleFocus = useCallback(() => {
    if (searchHistory.length > 0) setShowHistory(true);
  }, [searchHistory.length]);

  const handleHistoryClick = useCallback(
    (entry: string) => {
      onSearchChange(entry);
      setShowHistory(false);
      inputRef.current?.focus();
    },
    [onSearchChange],
  );

  const relevantHistory = searchQuery
    ? searchHistory.filter(h => h.toLowerCase().includes(searchQuery.toLowerCase()) && h !== searchQuery)
    : searchHistory;

  return (
    <div className="topbar">
      <div className="search-wrap" ref={wrapRef}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Search icons… (lib:lucide, lib:tabler)"
          autoComplete="off"
          spellCheck={false}
          value={searchQuery}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />
        {searchQuery && (
          <button
            className="search-clear"
            onClick={() => { onSearchChange(''); inputRef.current?.focus(); }}
            title="Clear search (Esc)"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        {showHistory && relevantHistory.length > 0 && (
          <ul className="search-history">
            {relevantHistory.map(entry => (
              <li key={entry} onMouseDown={() => handleHistoryClick(entry)}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                {entry}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="topbar-right">
        {searchQuery && (
          <span className="result-count">{resultCount} result{resultCount !== 1 ? 's' : ''}</span>
        )}
        <div className="sort-toggle">
          <button
            className={sortMode === 'name' ? 'active' : ''}
            onClick={() => onSortChange('name')}
            title="Sort by name"
          >
            A–Z
          </button>
          <button
            className={sortMode === 'recent' ? 'active' : ''}
            onClick={() => onSortChange('recent')}
            title="Sort by recently added"
          >
            Recent
          </button>
        </div>
        <button className="palette-btn" onClick={onPalette} title="Palette Builder">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
            <circle cx="15.5" cy="10" r="1.5" fill="currentColor" />
            <circle cx="12" cy="15" r="1.5" fill="currentColor" />
          </svg>
        </button>
        <button className="add-btn" onClick={onNewIcon} title="Add icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New icon
        </button>
      </div>
    </div>
  );
}
