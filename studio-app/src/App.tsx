import { useState, useEffect, useCallback } from 'react';
import type { IconEntry, StudioConfig, CtxMenuState } from './types';
import { fetchConfig, fetchIcons } from './api';
import { usePrefs } from './hooks/usePrefs';
import { useSearch, useSearchHistory } from './hooks/useSearch';
import type { SortMode } from './hooks/useSearch';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import IconGrid from './components/IconGrid';
import BottomPanel from './components/BottomPanel';
import ImportModal from './components/ImportModal';
import RenameModal from './components/RenameModal';
import ContextMenu from './components/ContextMenu';
import SelectBar from './components/SelectBar';
import PaletteBuilder from './components/PaletteBuilder';

export default function App() {
  const [prefs, setPrefs] = usePrefs();
  const [config, setConfig] = useState<StudioConfig>({ activeFrameworks: ['react'], iconsPath: '@/src/icons' });
  const [icons, setIcons] = useState<IconEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const { history: searchHistory, push: pushHistory } = useSearchHistory();
  const [selectedFilenames, setSelectedFilenames] = useState<Set<string>>(new Set());
  const [selectedIcon, setSelectedIcon] = useState<IconEntry | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [renameTarget, setRenameTarget] = useState<IconEntry | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

  const loadIcons = useCallback(async () => {
    try {
      const data = await fetchIcons();
      setIcons(data);
    } catch {
      setIcons([]);
    }
  }, []);

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch(() => {});
    loadIcons();
  }, [loadIcons]);

  const handleToggleSelect = useCallback((filename: string) => {
    setSelectedFilenames(prev => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedFilenames(new Set());
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    const filenames = [...selectedFilenames];
    if (!filenames.length) return;
    if (!confirm(`Delete ${filenames.length} icon${filenames.length > 1 ? 's' : ''}?`)) return;
    try {
      await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames }),
      });
      setIcons(prev => prev.filter(i => !selectedFilenames.has(i.filename)));
      setSelectedFilenames(new Set());
      if (selectedIcon && selectedFilenames.has(selectedIcon.filename)) {
        setSelectedIcon(null);
      }
    } catch (err) {
      alert('Delete failed: ' + String(err));
    }
  }, [selectedFilenames, selectedIcon]);

  const handleCardClick = useCallback((icon: IconEntry, ctrl: boolean) => {
    if (ctrl) {
      handleToggleSelect(icon.filename);
    } else {
      setSelectedIcon(icon);
    }
  }, [handleToggleSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent, icon: IconEntry) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, icon });
  }, []);

  const handleCtxRename = useCallback(() => {
    if (!ctxMenu) return;
    setRenameTarget(ctxMenu.icon);
    setCtxMenu(null);
  }, [ctxMenu]);

  const handleCtxDelete = useCallback(async () => {
    if (!ctxMenu) return;
    const icon = ctxMenu.icon;
    setCtxMenu(null);
    if (!confirm(`Delete ${icon.componentName}?`)) return;
    try {
      await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: [icon.filename] }),
      });
      setIcons(prev => prev.filter(i => i.filename !== icon.filename));
      setSelectedFilenames(prev => {
        const next = new Set(prev);
        next.delete(icon.filename);
        return next;
      });
      if (selectedIcon?.filename === icon.filename) setSelectedIcon(null);
    } catch (err) {
      alert('Delete failed: ' + String(err));
    }
  }, [ctxMenu, selectedIcon]);

  const handleRenameConfirm = useCallback(async (filename: string, newName: string) => {
    const res = await fetch('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, newName }),
    });
    const data = await res.json() as { componentName: string; newFilename: string; oldFilename: string; error?: string };
    if (!res.ok || data.error) throw new Error(data.error ?? 'Rename failed');
    setIcons(prev =>
      prev.map(i =>
        i.filename === filename
          ? { ...i, componentName: data.componentName, filename: data.newFilename }
          : i,
      ),
    );
    if (selectedIcon?.filename === filename) {
      setSelectedIcon(prev => prev ? { ...prev, componentName: data.componentName, filename: data.newFilename } : null);
    }
  }, [selectedIcon]);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    if (q.trim()) pushHistory(q.trim());
  }, [pushHistory]);

  // Compute library options from icons
  const libraryOptions = [...new Set(icons.map(i => i.library).filter(Boolean))] as string[];

  const filteredIcons = useSearch(icons, searchQuery, prefs.style, prefs.library, sortMode);

  return (
    <div
      className="layout"
      style={{
        '--icon-size': prefs.size + 'px',
        '--icon-color': prefs.color,
        '--icon-stroke': String(prefs.stroke),
      } as React.CSSProperties}
    >
      <Sidebar
        prefs={prefs}
        setPrefs={setPrefs}
        libraryOptions={libraryOptions}
        displayCount={filteredIcons.length}
      />
      <div className="main">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onNewIcon={() => setShowImport(true)}
          onPalette={() => setShowPalette(true)}
          searchHistory={searchHistory}
          sortMode={sortMode}
          onSortChange={setSortMode}
          resultCount={filteredIcons.length}
        />
        <div className="grid-wrap">
          <IconGrid
            icons={icons}
            searchQuery={searchQuery}
            styleFilter={prefs.style}
            libraryFilter={prefs.library}
            sortMode={sortMode}
            selectedFilenames={selectedFilenames}
            onCardClick={handleCardClick}
            onToggleSelect={handleToggleSelect}
            onContextMenu={handleContextMenu}
          />
        </div>
        {selectedIcon && (
          <BottomPanel
            icon={selectedIcon}
            config={config}
            onClose={() => setSelectedIcon(null)}
          />
        )}
      </div>

      {showPalette && (
        <PaletteBuilder icons={icons} onClose={() => setShowPalette(false)} />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImportComplete={loadIcons}
        />
      )}

      {renameTarget && (
        <RenameModal
          icon={renameTarget}
          onClose={() => setRenameTarget(null)}
          onConfirm={handleRenameConfirm}
        />
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onRename={handleCtxRename}
          onDelete={handleCtxDelete}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {selectedFilenames.size > 0 && (
        <SelectBar
          count={selectedFilenames.size}
          onDelete={handleDeleteSelected}
          onClear={handleClearSelection}
        />
      )}
    </div>
  );
}
