import { useState, useCallback } from 'react';
import type { IconEntry } from '../types';

interface Palette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

const PRESETS: Palette[] = [
  { name: 'Custom', primary: '#ffffff', secondary: '#9ca3af', accent: '#3b82f6' },
  { name: 'Tailwind Blue', primary: '#1d4ed8', secondary: '#64748b', accent: '#06b6d4' },
  { name: 'Tailwind Purple', primary: '#7c3aed', secondary: '#6b7280', accent: '#ec4899' },
  { name: 'Material', primary: '#1976d2', secondary: '#757575', accent: '#f50057' },
  { name: 'Emerald', primary: '#10b981', secondary: '#6b7280', accent: '#f59e0b' },
  { name: 'Rose', primary: '#f43f5e', secondary: '#9ca3af', accent: '#8b5cf6' },
  { name: 'Monochrome', primary: '#ffffff', secondary: '#9ca3af', accent: '#e5e7eb' },
];

export default function PaletteBuilder({
  icons,
  onClose,
}: {
  icons: IconEntry[];
  onClose: () => void;
}) {
  const [presetIdx, setPresetIdx] = useState(0);
  const [palette, setPalette] = useState<Palette>({ ...PRESETS[0] });
  const [copied, setCopied] = useState<'css' | 'json' | null>(null);

  const applyPreset = (idx: number) => {
    setPresetIdx(idx);
    setPalette({ ...PRESETS[idx] });
  };

  const update = (key: keyof Omit<Palette, 'name'>, value: string) => {
    setPresetIdx(0); // switch to Custom
    setPalette(prev => ({ ...prev, name: 'Custom', [key]: value }));
  };

  const cssOutput = [
    ':root {',
    `  --icon-primary:   ${palette.primary};`,
    `  --icon-secondary: ${palette.secondary};`,
    `  --icon-accent:    ${palette.accent};`,
    '}',
  ].join('\n');

  const jsonOutput = JSON.stringify(
    { primary: palette.primary, secondary: palette.secondary, accent: palette.accent },
    null, 2,
  );

  const copy = useCallback(async (type: 'css' | 'json') => {
    await navigator.clipboard.writeText(type === 'css' ? cssOutput : jsonOutput);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  }, [cssOutput, jsonOutput]);

  const previewIcons = icons.slice(0, 8);

  return (
    <div className="import-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="import-modal palette-modal">
        <div className="import-header">
          <span className="import-title">Palette Builder</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="palette-body">
          {/* Presets row */}
          <div className="palette-section">
            <label className="palette-label">Preset</label>
            <div className="palette-presets">
              {PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  className={`palette-preset-btn${presetIdx === i ? ' active' : ''}`}
                  onClick={() => applyPreset(i)}
                  title={p.name}
                >
                  <span className="preset-swatch" style={{ background: p.primary }} />
                  <span className="preset-swatch" style={{ background: p.secondary }} />
                  <span className="preset-swatch" style={{ background: p.accent }} />
                  <span className="preset-name">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers */}
          <div className="palette-section">
            <label className="palette-label">Colors</label>
            <div className="palette-colors">
              {(['primary', 'secondary', 'accent'] as const).map(key => (
                <div key={key} className="palette-color-row">
                  <label className="palette-color-label">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                  <div className="palette-color-input-wrap">
                    <input
                      type="color"
                      className="palette-color-picker"
                      value={palette[key]}
                      onChange={e => update(key, e.target.value)}
                    />
                    <input
                      type="text"
                      className="palette-color-hex"
                      value={palette[key]}
                      maxLength={7}
                      onChange={e => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) update(key, v);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="palette-section">
            <label className="palette-label">Preview</label>
            <div className="palette-preview-grid">
              {previewIcons.length === 0 ? (
                <p className="palette-empty">No icons yet — import some first.</p>
              ) : previewIcons.map((icon, i) => {
                const color = i % 3 === 0 ? palette.primary : i % 3 === 1 ? palette.secondary : palette.accent;
                return (
                  <div
                    key={icon.filename}
                    className="palette-preview-card"
                    style={{ '--preview-color': color } as React.CSSProperties}
                    dangerouslySetInnerHTML={{ __html: icon.svgContent }}
                  />
                );
              })}
            </div>
          </div>

          {/* Export */}
          <div className="palette-section">
            <label className="palette-label">Export</label>
            <div className="palette-export">
              <div className="palette-export-block">
                <div className="palette-export-header">
                  <span>CSS Variables</span>
                  <button
                    className={`palette-copy-btn${copied === 'css' ? ' copied' : ''}`}
                    onClick={() => copy('css')}
                  >
                    {copied === 'css' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="palette-export-code">{cssOutput}</pre>
              </div>
              <div className="palette-export-block">
                <div className="palette-export-header">
                  <span>JSON</span>
                  <button
                    className={`palette-copy-btn${copied === 'json' ? ' copied' : ''}`}
                    onClick={() => copy('json')}
                  >
                    {copied === 'json' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="palette-export-code">{jsonOutput}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
