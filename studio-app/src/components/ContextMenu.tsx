import { useEffect, useRef } from 'react';

export default function ContextMenu({
  x,
  y,
  onRename,
  onDelete,
  onClose,
}: {
  x: number;
  y: number;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => onClose();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position after mount to stay within viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) {
      el.style.left = (window.innerWidth - rect.width - 8) + 'px';
    }
    if (rect.bottom > window.innerHeight - 8) {
      el.style.top = (window.innerHeight - rect.height - 8) + 'px';
    }
  }, []);

  const left = Math.min(x, window.innerWidth - 160);
  const top = Math.min(y, window.innerHeight - 80);

  return (
    <div
      className="ctx-menu"
      ref={ref}
      style={{ left, top }}
      onClick={e => e.stopPropagation()}
    >
      <button className="ctx-item" onClick={onRename}>Rename</button>
      <button className="ctx-item danger" onClick={onDelete}>Delete</button>
    </div>
  );
}
