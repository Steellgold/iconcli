import { GamepadDirectionalIcon } from '../icons/GamepadDirectionalIcon';
import type { IconEntry } from '../types';

interface IconCardProps {
  icon: IconEntry;
  selected: boolean;
  onClick: (icon: IconEntry, ctrl: boolean) => void;
  onToggleSelect: (filename: string) => void;
  onContextMenu: (e: React.MouseEvent, icon: IconEntry) => void;
}

export default function IconCard({ icon, selected, onClick, onToggleSelect, onContextMenu }: IconCardProps) {
  return (
    <div
      className={'card' + (selected ? ' selected' : '')}
      title={icon.componentName}
      onClick={e => onClick(icon, e.ctrlKey || e.metaKey)}
      onContextMenu={e => onContextMenu(e, icon)}
    >
      <div
        className="card-check"
        onClick={e => {
          e.stopPropagation();
          onToggleSelect(icon.filename);
        }}
      >
        ✓
      </div>
      <div
        className="card-svg"
        dangerouslySetInnerHTML={{ __html: icon.svgContent || '' }}
      />
      <div className="card-name">{icon.componentName}</div>
      {icon.directions?.length && (
        <div className="card-dir-badge" title="Directional icon">
          <GamepadDirectionalIcon size={12} />
        </div>
      )}
    </div>
  );
}
