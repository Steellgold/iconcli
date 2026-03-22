import { useEffect, useRef, useState } from 'react';
import type { IconEntry } from '../types';

export default function RenameModal({
  icon,
  onClose,
  onConfirm,
}: {
  icon: IconEntry;
  onClose: () => void;
  onConfirm: (filename: string, newName: string) => Promise<void>;
}) {
  const [value, setValue] = useState(icon.componentName);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.select();
      inputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleConfirm = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === icon.componentName) { onClose(); return; }
    setLoading(true);
    try {
      await onConfirm(icon.filename, trimmed);
      onClose();
    } catch (err) {
      alert('Rename failed: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rename-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rename-modal">
        <div className="rename-title">Rename icon</div>
        <input
          ref={inputRef}
          className="rename-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="rename-footer">
          <button className="rename-cancel" onClick={onClose}>Cancel</button>
          <button className="rename-confirm" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Renaming…' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  );
}
