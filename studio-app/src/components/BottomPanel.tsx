import { useState, useEffect, useCallback } from 'react';
import type { IconEntry, StudioConfig } from '../types';
import SvgEditor from './SvgEditor';

const FRAMEWORK_LABELS: Record<string, string> = {
  react: 'React',
  'react-native': 'React Native',
  vue: 'Vue',
  svelte: 'Svelte',
  angular: 'Angular',
  webcomponents: 'Web Components',
};

const DIR_ARROWS: Record<string, string> = {
  'up-left': '↖', up: '↑', 'up-right': '↗',
  left: '←', right: '→',
  'down-left': '↙', down: '↓', 'down-right': '↘',
};

const DIR_GRID_POS: Record<string, [number, number]> = {
  'up-left': [1, 1], up: [1, 2], 'up-right': [1, 3],
  left: [2, 1], right: [2, 3],
  'down-left': [3, 1], down: [3, 2], 'down-right': [3, 3],
};

function toKebab(name: string): string {
  return name.replace(/([A-Z])/g, (c, _, i: number) => i === 0 ? c.toLowerCase() : '-' + c.toLowerCase());
}

function getSnippets(name: string, direction: string | null, iconsPath: string): Record<string, string> {
  const p = iconsPath;
  const kn = toKebab(name);
  const dir = direction ? ` direction="${direction}"` : '';
  return {
    react: `import { ${name} } from '${p}';\n\n<${name}${dir} size={24} />`,
    'react-native': `import { ${name} } from '${p}';\n\n<${name}${dir} size={24} />`,
    vue: `import ${name} from '${p}/${name}.vue';\n\n<${name}${dir} :size="24" />`,
    svelte: `import ${name} from '${p}/${name}.svelte';\n\n<${name}${dir} size={24} />`,
    angular: `import { ${name}Component } from '${p}/${name}.component';\n\n<app-${kn}${dir} [size]="24"></app-${kn}>`,
    webcomponents: `import '${p}/${name}';\n\n<${kn}${dir} size="24"></${kn}>`,
  };
}

interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <button className={'copy-btn' + (copied ? ' copied' : '')} onClick={handleCopy}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

interface BottomPanelProps {
  icon: IconEntry;
  config: StudioConfig;
  onClose: () => void;
}

export default function BottomPanel({ icon, config, onClose }: BottomPanelProps) {
  const [activeDir, setActiveDir] = useState<string | null>(icon.directions?.[0] ?? null);
  const [activeTab, setActiveTab] = useState<string>(config.activeFrameworks[0] ?? 'react');
  const [editMode, setEditMode] = useState(false);
  const [editedSvg, setEditedSvg] = useState<string | null>(null);

  useEffect(() => {
    setActiveDir(icon.directions?.[0] ?? null);
    setActiveTab(config.activeFrameworks[0] ?? 'react');
    setEditMode(false);
    setEditedSvg(null);
  }, [icon, config.activeFrameworks]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const baseSvg = activeDir && icon.variantSvgs?.[activeDir]
    ? icon.variantSvgs[activeDir]
    : icon.svgContent || '';
  const currentSvg = editedSvg ?? baseSvg;

  const snippets = getSnippets(icon.componentName, activeDir, config.iconsPath);

  const metaParts: string[] = [];
  if (icon.library) {
    metaParts.push(icon.library + (icon.libraryIconName ? ' · ' + icon.libraryIconName : ''));
  }
  if (icon.iconSize) metaParts.push(icon.iconSize + 'px');
  if (icon.generatedAt) metaParts.push(new Date(icon.generatedAt).toLocaleDateString());

  const hasDirPicker = !!(icon.directions?.length && icon.variantSvgs);

  const handleDirClick = useCallback((dir: string) => {
    setActiveDir(dir);
  }, []);

  // Build direction picker grid
  const dirGrid: (string | null)[][] = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
  Object.entries(DIR_GRID_POS).forEach(([dir, [r, c]]) => {
    dirGrid[r - 1][c - 1] = dir;
  });

  return (
    <div className="bottom-panel">
      <div className="bp-left">
        <div className="bp-svg-wrap" dangerouslySetInnerHTML={{ __html: currentSvg }} />
        {hasDirPicker && (
          <div className="bp-dir-picker">
            {dirGrid.map((row, ri) =>
              row.map((dir, ci) => {
                if (ri === 1 && ci === 1) {
                  return <div key="center" className="bp-dir-center">✛</div>;
                }
                if (!dir) {
                  return <div key={`${ri}-${ci}`} className="bp-dir-btn empty" />;
                }
                const hasSvg = !!(icon.variantSvgs?.[dir]);
                return (
                  <button
                    key={dir}
                    className={'bp-dir-btn' + (!hasSvg ? ' empty' : '') + (dir === activeDir ? ' active' : '')}
                    title={dir}
                    onClick={() => hasSvg && handleDirClick(dir)}
                  >
                    {DIR_ARROWS[dir] ?? dir}
                  </button>
                );
              })
            )}
          </div>
        )}
        <div className="bp-name">{icon.componentName}</div>
        <div className="bp-meta">{metaParts.join('  ·  ')}</div>
      </div>
      <div className="bp-right">
        <div className="bp-right-top">
          <div className="tabs">
            {config.activeFrameworks.map(fw => (
              <button
                key={fw}
                className={'tab' + (activeTab === fw ? ' active' : '')}
                onClick={() => setActiveTab(fw)}
              >
                {FRAMEWORK_LABELS[fw] ?? fw}
              </button>
            ))}
            <button
              className={'tab' + (activeTab === '__svg__' ? ' active' : '')}
              onClick={() => setActiveTab('__svg__')}
            >
              SVG
            </button>
          </div>
          <div className="bp-header-actions">
            <button
              className={`edit-icon-btn${editMode ? ' active' : ''}`}
              onClick={() => { setEditMode(m => !m); setActiveTab('__svg__'); }}
              title="Edit SVG"
            >
              {editMode ? 'Cancel edit' : 'Edit icon'}
            </button>
            <button className="close-btn bp-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="tab-content">
          {config.activeFrameworks.map(fw => {
            const code = snippets[fw] ?? '';
            return (
              <div key={fw} className={'snippet-block' + (activeTab === fw ? ' active' : '')}>
                <div className="snippet-section">
                  <div className="snippet-label">Import &amp; Usage</div>
                  <div className="snippet-code-wrap">
                    <pre className="code">{code}</pre>
                    <CopyButton text={code} />
                  </div>
                </div>
              </div>
            );
          })}
          <div className={'snippet-block' + (activeTab === '__svg__' ? ' active' : '')}>
            {editMode ? (
              <SvgEditor
                initialSvg={baseSvg}
                onSave={svg => { setEditedSvg(svg); setEditMode(false); }}
                onCancel={() => setEditMode(false)}
                hideCancel
              />
            ) : (
              <div className="snippet-section">
                <div className="snippet-label">
                  <span>
                    Raw SVG
                    {editedSvg && <span className="svg-edited-badge">edited</span>}
                  </span>
                  <div className="svg-label-actions">
                    {editedSvg && (
                      <button className="edit-svg-btn" onClick={() => setEditedSvg(null)}>Reset</button>
                    )}
                    <CopyButton text={currentSvg} />
                  </div>
                </div>
                <div className="raw-svg-wrap">
                  <pre className="raw-svg">{currentSvg}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
