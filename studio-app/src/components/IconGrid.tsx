import type { IconEntry } from '../types';
import type { SortMode } from '../hooks/useSearch';
import { useSearch } from '../hooks/useSearch';
import IconCard from './IconCard';

interface IconGridProps {
  icons: IconEntry[];
  searchQuery: string;
  styleFilter: 'auto' | 'filled' | 'outline';
  libraryFilter: string;
  sortMode: SortMode;
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
  sortMode,
  selectedFilenames,
  onCardClick,
  onToggleSelect,
  onContextMenu,
}: IconGridProps) {
  const filtered = useSearch(icons, searchQuery, styleFilter, libraryFilter, sortMode);

  if (filtered.length === 0) {
    return (
      <div className="icon-grid">
        <div className="empty">
          {searchQuery ? `No icons matching "${searchQuery}".` : 'No icons found.'}
        </div>
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
