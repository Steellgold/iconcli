import type { Prefs } from '../types';

const COLORS = [
  { hex: '#e4e4e7', label: 'White' },
  { hex: '#a1a1aa', label: 'Gray' },
  { hex: '#60a5fa', label: 'Blue' },
  { hex: '#a78bfa', label: 'Purple' },
  { hex: '#34d399', label: 'Green' },
  { hex: '#f87171', label: 'Red' },
  { hex: '#fbbf24', label: 'Amber' },
  { hex: '#1a1a1a', label: 'Black' },
];

interface SidebarProps {
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
  libraryOptions: string[];
  displayCount: number;
}

export default function Sidebar({ prefs, setPrefs, libraryOptions, displayCount }: SidebarProps) {
  return (
    <aside>
      <div className="sidebar-logo">
        <span>🎨</span>
        <span>mkicon studio</span>
        <span className="sidebar-badge">local</span>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Preview Size</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Size</span>
          <span className="size-value">{prefs.size}px</span>
        </div>
        <div className="size-row">
          <input
            type="range"
            min={16}
            max={48}
            step={4}
            value={prefs.size}
            onChange={e => setPrefs({ size: Number(e.target.value) })}
          />
        </div>
        <div className="size-ticks">
          <span>16</span><span>24</span><span>32</span><span>40</span><span>48</span>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Stroke Width</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Width</span>
          <span className="size-value">{prefs.stroke}</span>
        </div>
        <div className="size-row">
          <input
            type="range"
            min={1}
            max={2}
            step={0.25}
            value={prefs.stroke}
            onChange={e => setPrefs({ stroke: Number(e.target.value) })}
          />
        </div>
        <div className="size-ticks">
          <span>1</span><span>1.25</span><span>1.5</span><span>1.75</span><span>2</span>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Style</div>
        <div className="style-btns">
          {(['auto', 'filled', 'outline'] as const).map(s => (
            <button
              key={s}
              className={'style-btn' + (prefs.style === s ? ' active' : '')}
              onClick={() => setPrefs({ style: s })}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Color</div>
        <div className="color-swatches">
          {COLORS.map(c => (
            <div
              key={c.hex}
              className={'swatch' + (prefs.color === c.hex ? ' active' : '')}
              style={{ background: c.hex }}
              title={c.label}
              onClick={() => setPrefs({ color: c.hex })}
            />
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Library</div>
        <select
          value={prefs.library}
          onChange={e => setPrefs({ library: e.target.value })}
        >
          <option value="">All libraries</option>
          {libraryOptions.map(lib => (
            <option key={lib} value={lib}>{lib}</option>
          ))}
        </select>
      </div>

      <div className="sidebar-footer">
        {displayCount} icon{displayCount !== 1 ? 's' : ''}
      </div>
    </aside>
  );
}
