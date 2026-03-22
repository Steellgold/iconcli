interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNewIcon: () => void;
}

export default function TopBar({ searchQuery, onSearchChange, onNewIcon }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="search-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className="search-input"
          type="text"
          placeholder="Search icons…"
          autoComplete="off"
          spellCheck={false}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
      <button className="add-btn" onClick={onNewIcon} title="Add icon">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New icon
      </button>
    </div>
  );
}
