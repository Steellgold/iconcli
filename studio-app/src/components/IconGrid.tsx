import type { IconEntry } from '../types';
import IconCard from './IconCard';

interface IconGridProps {
  icons: IconEntry[];
  searchQuery: string;
  styleFilter: 'auto' | 'filled' | 'outline';
  libraryFilter: string;
  selectedFilenames: Set<string>;
  onCardClick: (icon: IconEntry, ctrl: boolean) => void;
  onToggleSelect: (filename: string) => void;
  onContextMenu: (e: React.MouseEvent, icon: IconEntry) => void;
}

export default function IconGrid({
  icons,
  searchQuery,
  styleFilter,
  libraryFilter,
  selectedFilenames,
  onCardClick,
  onToggleSelect,
  onContextMenu,
}: IconGridProps) {
  const filtered = icons.filter(icon => {
    if (searchQuery && !icon.componentName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (libraryFilter && icon.library !== libraryFilter) return false;
    if (styleFilter !== 'auto' && icon.detectedStyle !== 'unknown' && icon.detectedStyle !== styleFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="icon-grid">
        <div className="empty">No icons found.</div>
      </div>
    );
  }

  return (
    <div className="icon-grid">
      {filtered.map(icon => (
        <IconCard
          key={icon.filename}
          icon={icon}
          selected={selectedFilenames.has(icon.filename)}
          onClick={onCardClick}
          onToggleSelect={onToggleSelect}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
