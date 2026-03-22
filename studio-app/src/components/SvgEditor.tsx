import { useEffect, useRef, useCallback, useState } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands';

const prettifySvg = (svg: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const err = doc.querySelector('parsererror');
    if (err) return svg;

    const indent = (node: Element | Document, level: number): string => {
      const pad = '  '.repeat(level);
      const lines: string[] = [];
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          const t = child.textContent?.trim();
          if (t) lines.push(pad + t);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as Element;
          const attrs = Array.from(el.attributes)
            .map(a => `${a.name}="${a.value}"`)
            .join(' ');
          const tag = el.tagName;
          if (!el.hasChildNodes() || (el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE)) {
            const inner = el.textContent?.trim();
            if (!inner) {
              lines.push(`${pad}<${tag}${attrs ? ' ' + attrs : ''} />`);
            } else {
              lines.push(`${pad}<${tag}${attrs ? ' ' + attrs : ''}>${inner}</${tag}>`);
            }
          } else {
            lines.push(`${pad}<${tag}${attrs ? ' ' + attrs : ''}>`);
            lines.push(indent(el, level + 1));
            lines.push(`${pad}</${tag}>`);
          }
        }
      }
      return lines.join('\n');
    };

    const svgEl = doc.documentElement;
    const attrs = Array.from(svgEl.attributes).map(a => `${a.name}="${a.value}"`).join(' ');
    const inner = indent(svgEl, 1);
    return `<svg ${attrs}>\n${inner}\n</svg>`;
  } catch {
    return svg;
  }
};

interface SvgEditorProps {
  initialSvg: string;
  onSave: (svg: string) => void;
  onCancel: () => void;
}

export default function SvgEditor({ initialSvg, onSave, onCancel }: SvgEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [previewSvg, setPreviewSvg] = useState(initialSvg);
  const [parseError, setParseError] = useState(false);

  const updatePreview = useCallback((svg: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const err = doc.querySelector('parsererror');
    setParseError(!!err);
    if (!err) setPreviewSvg(svg);
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const startDoc = prettifySvg(initialSvg);

    const view = new EditorView({
      state: EditorState.create({
        doc: startDoc,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          html(),
          oneDark,
          lineNumbers(),
          highlightActiveLine(),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              updatePreview(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '12px' },
            '.cm-scroller': { fontFamily: 'monospace', overflow: 'auto' },
            '.cm-content': { padding: '8px 0' },
          }),
        ],
      }),
      parent: editorRef.current,
    });

    viewRef.current = view;
    updatePreview(startDoc);

    return () => view.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrettify = () => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    const pretty = prettifySvg(current);
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: pretty },
    });
  };

  const handleReset = () => {
    const view = viewRef.current;
    if (!view) return;
    const pretty = prettifySvg(initialSvg);
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: pretty },
    });
    setPreviewSvg(initialSvg);
    setParseError(false);
  };

  const handleSave = () => {
    const view = viewRef.current;
    if (!view || parseError) return;
    onSave(view.state.doc.toString().trim());
  };

  return (
    <div className="svg-editor">
      <div className="svg-editor-toolbar">
        <span className="svg-editor-title">Edit SVG</span>
        <div className="svg-editor-actions">
          <button className="svg-editor-btn" onClick={handlePrettify} title="Format SVG">
            Prettify
          </button>
          <button className="svg-editor-btn" onClick={handleReset} title="Reset to original">
            Reset
          </button>
        </div>
      </div>
      <div className="svg-editor-body">
        <div className="svg-editor-cm" ref={editorRef} />
        <div className="svg-editor-preview">
          {parseError && <div className="svg-editor-error">Invalid SVG</div>}
          <div
            className="svg-editor-preview-inner"
            dangerouslySetInnerHTML={{ __html: previewSvg }}
          />
        </div>
      </div>
      <div className="svg-editor-footer">
        <button className="svg-editor-cancel" onClick={onCancel}>Cancel</button>
        <button className="svg-editor-save" onClick={handleSave} disabled={parseError}>
          Save changes
        </button>
      </div>
    </div>
  );
}
