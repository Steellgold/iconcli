import { useState, useEffect, useRef, useCallback } from 'react';
import type { ImportTab, Library, DirectiveSlots, DirectionKey } from '../types';
import { fetchLibrary, fetchLibrarySVG } from '../api';

const DIRS: DirectionKey[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

const emptySlots = (): DirectiveSlots =>
  Object.fromEntries(DIRS.map(d => [d, null])) as DirectiveSlots;

interface LibIcon { name: string; tags?: string[] }

interface LibIconCardProps {
  icon: LibIcon;
  lib: Library;
  heroSize: string;
  heroStyle: string;
  tablerStyle: string;
  tablerStroke: string;
  isSelected: boolean;
  onClick: (name: string) => void;
}

const svgPreviewCache: Record<string, string> = {};

function LibIconCard({ icon, lib, heroSize, heroStyle, tablerStyle, tablerStroke, isSelected, onClick }: LibIconCardProps) {
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const cacheKey = lib === 'heroicons'
      ? `${lib}:${icon.name}:${heroSize}:${heroStyle}`
      : lib === 'tabler'
        ? `${lib}:${icon.name}:${tablerStyle}:${tablerStroke}`
        : `${lib}:${icon.name}`;

    if (svgPreviewCache[cacheKey]) {
      el.innerHTML = svgPreviewCache[cacheKey];
      return;
    }

    fetchLibrarySVG({
      lib,
      name: icon.name,
      ...(lib === 'heroicons' ? { heroiconSize: parseInt(heroSize, 10), heroiconStyle: heroStyle } : {}),
      ...(lib === 'tabler' ? { tablerStyle, tablerStroke: parseFloat(tablerStroke) } : {}),
    })
      .then(svg => {
        svgPreviewCache[cacheKey] = svg;
        if (el) el.innerHTML = svg;
      })
      .catch(() => { if (el) el.innerHTML = '?'; });
  }, [icon.name, lib, heroSize, heroStyle, tablerStyle, tablerStroke]);

  return (
    <div
      className={`lib-card${isSelected ? ' selected' : ''}`}
      onClick={() => onClick(icon.name)}
    >
      <div className="lib-card-svg" ref={svgRef} />
      <div className="lib-card-name">{icon.name}</div>
    </div>
  );
}

export default function ImportModal({
  onClose,
  onImportComplete,
}: {
  onClose: () => void;
  onImportComplete: () => void;
}) {
  const [tab, setTab] = useState<ImportTab>('library');
  const [lib, setLib] = useState<Library>('lucide');
  const [libIcons, setLibIcons] = useState<LibIcon[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libCache, setLibCache] = useState<Partial<Record<Library, LibIcon[]>>>({});
  const [libSearch, setLibSearch] = useState('');
  const [heroSize, setHeroSize] = useState('24');
  const [heroStyle, setHeroStyle] = useState('outline');
  const [tablerStyle, setTablerStyle] = useState('outline');
  const [tablerStroke, setTablerStroke] = useState('1.25');
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [importName, setImportName] = useState('');
  const [nameAuto, setNameAuto] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [importing, setImporting] = useState(false);
  const [directivesOpen, setDirectivesOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<DirectionKey | null>(null);
  const [slots, setSlots] = useState<DirectiveSlots>(emptySlots());

  // Load library
  const loadLib = useCallback(async (l: Library) => {
    if (libCache[l]) {
      setLibIcons(libCache[l]!);
      return;
    }
    setLibLoading(true);
    try {
      const data = await fetchLibrary(l);
      setLibCache(prev => ({ ...prev, [l]: data }));
      setLibIcons(data);
    } catch {
      setLibIcons([]);
    } finally {
      setLibLoading(false);
    }
  }, [libCache]);

  useEffect(() => { loadLib(lib); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const switchLib = (l: Library) => {
    setLib(l);
    setSelectedNames([]);
    setImportName('');
    setNameAuto(false);
    if (libCache[l]) setLibIcons(libCache[l]!);
    else loadLib(l);
  };

  const filteredIcons = (() => {
    const q = libSearch.toLowerCase().trim();
    if (!q) return libIcons.slice(0, 40);
    return libIcons
      .filter(i => i.name.toLowerCase().includes(q) || (i.tags ?? []).some(t => t.toLowerCase().includes(q)))
      .slice(0, 60);
  })();

  const handleLibIconClick = async (name: string) => {
    // Directive slot assignment mode
    if (activeSlot) {
      const cacheKey = lib === 'heroicons'
        ? `${lib}:${name}:${heroSize}:${heroStyle}`
        : lib === 'tabler'
          ? `${lib}:${name}:${tablerStyle}:${tablerStroke}`
          : `${lib}:${name}`;

      let svg = svgPreviewCache[cacheKey] ?? '';
      if (!svg) {
        try {
          svg = await fetchLibrarySVG({
            lib, name,
            ...(lib === 'heroicons' ? { heroiconSize: parseInt(heroSize, 10), heroiconStyle: heroStyle } : {}),
            ...(lib === 'tabler' ? { tablerStyle, tablerStroke: parseFloat(tablerStroke) } : {}),
          });
          svgPreviewCache[cacheKey] = svg;
        } catch { /* ignore */ }
      }

      setSlots(prev => ({ ...prev, [activeSlot]: { name, svgContent: svg } }));
      setActiveSlot(null);
      return;
    }

    // Multi-select
    setSelectedNames(prev => {
      const idx = prev.indexOf(name);
      if (idx >= 0) { const next = [...prev]; next.splice(idx, 1); return next; }
      const next = [...prev, name];
      if (next.length === 1 && nameAuto === false) {
        setImportName(name);
        setNameAuto(true);
      }
      return next;
    });
  };

  const handleNameInput = (v: string) => {
    setImportName(v);
    setNameAuto(false);
  };

  const handlePasteInput = (v: string) => {
    setPasteValue(v);
    if (!importName || nameAuto) {
      const m = v.match(/id="([^"]+)"/);
      if (m) { setImportName(m[1]); setNameAuto(true); }
    }
  };

  const isBulk = tab === 'library' && selectedNames.length > 1;
  const isDirective = tab === 'library' && directivesOpen;
  const filledSlots = DIRS.filter(d => slots[d] !== null);

  const toggleDirectives = () => {
    if (!directivesOpen) {
      if (selectedNames.length > 1) return; // disabled in bulk mode
      setDirectivesOpen(true);
    } else {
      setDirectivesOpen(false);
      setActiveSlot(null);
    }
  };

  const clearSlot = (dir: DirectionKey) => {
    setSlots(prev => ({ ...prev, [dir]: null }));
  };

  const handleImport = async () => {
    setImporting(true);
    setStatus(null);

    // ── Bulk library import ──
    if (isBulk) {
      let done = 0, failed = 0;
      for (const name of selectedNames) {
        try {
          const body: Record<string, unknown> = {
            source: 'library', library: lib, libraryIconName: name,
            heroiconSize: parseInt(heroSize, 10), heroiconStyle: heroStyle,
            tablerStyle, tablerStroke: parseFloat(tablerStroke),
            componentName: lib === 'tabler' && tablerStyle === 'filled' ? `${name}-filled` : name,
          };
          const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const data = await res.json() as { error?: string };
          if (!res.ok || data.error) throw new Error(data.error);
          done++;
        } catch { failed++; }
      }
      onImportComplete();
      setStatus({ msg: failed > 0 ? `✓ ${done} imported, ${failed} failed.` : `✓ ${done} icons imported!`, ok: failed === 0 });
      setImporting(false);
      setTimeout(() => { onClose(); }, 1400);
      return;
    }

    // ── Directive import ──
    if (isDirective) {
      const nameVal = importName.trim();
      if (!nameVal) { setStatus({ msg: 'Enter a base name.', ok: false }); setImporting(false); return; }
      if (filledSlots.length === 0) { setStatus({ msg: 'Fill at least one direction slot.', ok: false }); setImporting(false); return; }
      const slotsPayload: Record<string, unknown> = {};
      for (const dir of filledSlots) {
        slotsPayload[dir] = {
          library: lib,
          libraryIconName: slots[dir]!.name,
          heroiconSize: parseInt(heroSize, 10),
          heroiconStyle: heroStyle,
          tablerStyle,
          tablerStroke: parseFloat(tablerStroke),
        };
      }
      try {
        const res = await fetch('/api/import-directive', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ componentName: nameVal, slots: slotsPayload }),
        });
        const data = await res.json() as { filename?: string; error?: string };
        if (!res.ok || data.error) throw new Error(data.error ?? 'Import failed');
        setStatus({ msg: `✓ ${data.filename} generated with ${filledSlots.length} direction${filledSlots.length > 1 ? 's' : ''}!`, ok: true });
        onImportComplete();
        setTimeout(() => { onClose(); }, 1400);
      } catch (err) {
        setStatus({ msg: String(err), ok: false });
      } finally {
        setImporting(false);
      }
      return;
    }

    // ── Single import ──
    const nameVal = importName.trim();
    if (!nameVal) { setStatus({ msg: 'Enter a component name.', ok: false }); setImporting(false); return; }

    const body: Record<string, unknown> = { componentName: nameVal };

    if (tab === 'library') {
      if (selectedNames.length === 0) { setStatus({ msg: 'Select an icon first.', ok: false }); setImporting(false); return; }
      Object.assign(body, {
        source: 'library', library: lib, libraryIconName: selectedNames[0],
        heroiconSize: parseInt(heroSize, 10), heroiconStyle: heroStyle,
        tablerStyle, tablerStroke: parseFloat(tablerStroke),
      });
    } else if (tab === 'paste') {
      if (!pasteValue.trim()) { setStatus({ msg: 'Paste some SVG first.', ok: false }); setImporting(false); return; }
      Object.assign(body, { source: 'paste', svgContent: pasteValue.trim() });
    } else {
      if (!urlValue.trim()) { setStatus({ msg: 'Enter a URL.', ok: false }); setImporting(false); return; }
      Object.assign(body, { source: 'url', svgUrl: urlValue.trim() });
    }

    try {
      const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json() as { componentName?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Import failed');
      setStatus({ msg: `✓ ${data.componentName} imported!`, ok: true });
      onImportComplete();
      setTimeout(() => { onClose(); }, 1200);
    } catch (err) {
      setStatus({ msg: String(err), ok: false });
    } finally {
      setImporting(false);
    }
  };

  const importBtnLabel = (() => {
    if (importing) return isBulk ? `Importing…` : isDirective ? 'Generating…' : 'Importing…';
    if (isBulk) return `Import ${selectedNames.length} icons`;
    if (isDirective && filledSlots.length > 0) return `Import ${filledSlots.length} directive${filledSlots.length > 1 ? 's' : ''}`;
    return 'Import';
  })();

  return (
    <div className="import-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="import-modal">
        {/* Header */}
        <div className="import-header">
          <span className="import-title">Add icon</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="import-tabs">
          {(['library', 'paste', 'url'] as ImportTab[]).map(t => (
            <button
              key={t}
              className={`import-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'library' ? 'Library' : t === 'paste' ? 'Paste SVG' : 'From URL'}
            </button>
          ))}
        </div>

        <div className="import-body">
          {/* Library panel */}
          <div className={`import-panel${tab === 'library' ? ' active' : ''}`}>
            {/* Library nav [‹] name [›] */}
            <LibNav lib={lib} onSwitch={switchLib} />

            {/* Heroicons options */}
            {lib === 'heroicons' && (
              <div className="hero-opts">
                <select value={heroSize} onChange={e => {
                  const v = e.target.value;
                  setHeroSize(v);
                  if (v !== '24') setHeroStyle('solid');
                  setSelectedNames([]);
                }}>
                  <option value="16">16px — micro</option>
                  <option value="20">20px — mini</option>
                  <option value="24">24px — standard</option>
                </select>
                <select value={heroStyle} disabled={heroSize !== '24'} onChange={e => { setHeroStyle(e.target.value); setSelectedNames([]); }}>
                  <option value="outline">Outline</option>
                  <option value="solid">Solid</option>
                </select>
              </div>
            )}

            {/* Tabler options */}
            {lib === 'tabler' && (
              <div className="hero-opts">
                <select value={tablerStyle} onChange={e => { setTablerStyle(e.target.value); setSelectedNames([]); }}>
                  <option value="outline">Outline</option>
                  <option value="filled">Filled</option>
                </select>
                {tablerStyle !== 'filled' && (
                  <select value={tablerStroke} onChange={e => { setTablerStroke(e.target.value); setSelectedNames([]); }}>
                    <option value="1">Stroke 1</option>
                    <option value="1.25">Stroke 1.25 (default)</option>
                    <option value="1.5">Stroke 1.5</option>
                    <option value="1.75">Stroke 1.75</option>
                    <option value="2">Stroke 2</option>
                  </select>
                )}
              </div>
            )}

            {/* Search */}
            <div className="import-search-wrap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                className="import-search"
                type="text"
                placeholder="Search icons…"
                value={libSearch}
                onChange={e => setLibSearch(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Library grid */}
            <div className="lib-grid">
              {libLoading ? (
                <div className="lib-loading">Loading icons…</div>
              ) : filteredIcons.length === 0 ? (
                <div className="lib-loading">No icons found.</div>
              ) : filteredIcons.map(icon => (
                <LibIconCard
                  key={icon.name}
                  icon={icon}
                  lib={lib}
                  heroSize={heroSize}
                  heroStyle={heroStyle}
                  tablerStyle={tablerStyle}
                  tablerStroke={tablerStroke}
                  isSelected={selectedNames.includes(icon.name)}
                  onClick={handleLibIconClick}
                />
              ))}
            </div>
          </div>

          {/* Paste panel */}
          <div className={`import-panel${tab === 'paste' ? ' active' : ''}`}>
            <textarea
              className="import-textarea"
              placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n  ...\n</svg>'}
              value={pasteValue}
              onChange={e => handlePasteInput(e.target.value)}
            />
          </div>

          {/* URL panel */}
          <div className={`import-panel${tab === 'url' ? ' active' : ''}`}>
            <input
              className="import-input"
              type="text"
              placeholder="https://example.com/icon.svg"
              value={urlValue}
              onChange={e => setUrlValue(e.target.value)}
            />
          </div>
        </div>

        {/* Directive compass */}
        {tab === 'library' && directivesOpen && (
          <div className="directive-panel">
            <div className="directive-hint">
              {activeSlot
                ? <><strong>↑ Picking for {activeSlot}</strong> — click any icon in the library above</>
                : 'Click a slot, then pick an icon from the library above'}
            </div>
            <div className="d-compass">
              {/* Row 1: nw, n, ne */}
              {(['nw', 'n', 'ne'] as DirectionKey[]).map(dir => (
                <DirectiveSlotCell key={dir} dir={dir} slot={slots[dir]} isActive={activeSlot === dir} onSlotClick={setActiveSlot} onClear={clearSlot} />
              ))}
              {/* Row 2: w, center, e */}
              <DirectiveSlotCell dir="w" slot={slots['w']} isActive={activeSlot === 'w'} onSlotClick={setActiveSlot} onClear={clearSlot} />
              <div className="d-center">✛</div>
              <DirectiveSlotCell dir="e" slot={slots['e']} isActive={activeSlot === 'e'} onSlotClick={setActiveSlot} onClear={clearSlot} />
              {/* Row 3: sw, s, se */}
              {(['sw', 's', 'se'] as DirectionKey[]).map(dir => (
                <DirectiveSlotCell key={dir} dir={dir} slot={slots[dir]} isActive={activeSlot === dir} onSlotClick={setActiveSlot} onClear={clearSlot} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="import-footer">
          {status && (
            <span className={`import-status ${status.ok ? 'ok' : 'err'}`} style={{ marginRight: 'auto' }}>
              {status.msg}
            </span>
          )}

          {!isBulk ? (
            <div className="import-name">
              <label>Component name</label>
              <input
                className="import-input"
                type="text"
                placeholder="ArrowRight"
                value={importName}
                onChange={e => handleNameInput(e.target.value)}
              />
            </div>
          ) : (
            <div className="import-bulk-label">{selectedNames.length} icons selected</div>
          )}

          {tab === 'library' && selectedNames.length === 1 && !isBulk && (
            <button
              className={`dir-toggle-btn${directivesOpen ? ' active' : ''}`}
              onClick={toggleDirectives}
            >
              Directives
            </button>
          )}

          <button className="import-btn" onClick={handleImport} disabled={importing}>
            {importBtnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DirectiveSlotCell({
  dir,
  slot,
  isActive,
  onSlotClick,
  onClear,
}: {
  dir: DirectionKey;
  slot: { name: string; svgContent: string } | null;
  isActive: boolean;
  onSlotClick: (dir: DirectionKey | null) => void;
  onClear: (dir: DirectionKey) => void;
}) {
  const isDiagonal = (['nw', 'ne', 'sw', 'se'] as DirectionKey[]).includes(dir);
  const arrows: Record<DirectionKey, string> = { n: '↑', ne: '↗', e: '→', se: '↘', s: '↓', sw: '↙', w: '←', nw: '↖' };

  return (
    <div
      className={`d-slot${isDiagonal ? ' d-diag' : ''}${slot ? ' filled' : ''}${isActive ? ' active-slot' : ''}`}
      data-dir={dir}
      onClick={() => onSlotClick(isActive ? null : dir)}
    >
      {slot ? (
        <div className="d-slot-preview" dangerouslySetInnerHTML={{ __html: slot.svgContent }} />
      ) : (
        <div className="d-slot-preview" />
      )}
      <span className="d-slot-dir">{arrows[dir]} {dir}</span>
      {slot && (
        <button
          className="d-slot-clear"
          title="Clear"
          onClick={e => { e.stopPropagation(); onClear(dir); }}
        >×</button>
      )}
    </div>
  );
}

const LIBS: Library[] = ['lucide', 'heroicons', 'tabler'];
const LIB_LABELS: Record<Library, string> = {
  lucide: 'Lucide Icons',
  heroicons: 'Heroicons',
  tabler: 'Tabler Icons',
};

function LibNav({ lib, onSwitch }: { lib: Library; onSwitch: (l: Library) => void }) {
  const idx = LIBS.indexOf(lib);
  return (
    <div className="lib-nav">
      <button
        className="lib-nav-btn"
        onClick={() => onSwitch(LIBS[idx - 1]!)}
        disabled={idx === 0}
      >‹</button>
      <span className="lib-nav-label">{LIB_LABELS[lib]}</span>
      <button
        className="lib-nav-btn"
        onClick={() => onSwitch(LIBS[idx + 1]!)}
        disabled={idx === LIBS.length - 1}
      >›</button>
    </div>
  );
}

