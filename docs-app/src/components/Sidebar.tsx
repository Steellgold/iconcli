import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { NAV } from "../nav";
import { search, type SearchResult } from "../search";
import { MenuIcon, XIcon, SearchIcon } from "./icons";

const RADIUS = 5.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ReadingRing({ progress }: { progress: number }) {
  const offset = CIRCUMFERENCE * (1 - progress / 100);
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="reading-ring" aria-hidden="true">
      <circle cx="8" cy="8" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="1.5" />
      <circle
        cx="8" cy="8" r={RADIUS}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
        style={{ transition: "stroke-dashoffset 0.15s linear" }}
      />
    </svg>
  );
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const { pathname } = useLocation();

  useEffect(() => {
    setProgress(0);
    const el = document.querySelector(".main-content");
    if (!el) return;
    const handle = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const total = scrollHeight - clientHeight;
      setProgress(total > 0 ? (scrollTop / total) * 100 : 0);
    };
    handle();
    el.addEventListener("scroll", handle, { passive: true });
    return () => el.removeEventListener("scroll", handle);
  }, [pathname]);

  return progress;
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const scrollProgress = useScrollProgress();

  const handleQuery = (value: string) => {
    setQuery(value);
    setResults(value.trim().length >= 2 ? search(value) : []);
  };

  const handleSelect = (path: string) => {
    navigate(path, { state: { searchQuery: query.trim() } });
    setOpen(false);
    // keep query + results visible so user sees what they searched
  };

  const isSearching = query.trim().length >= 2;

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
      </button>

      {open && (
        <div className="sidebar-overlay" onClick={() => setOpen(false)} />
      )}

      <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
        <div className="sidebar-search-wrap">
          <SearchIcon size={14} className="sidebar-search-icon" color="currentColor" />
          <input
            ref={inputRef}
            className="sidebar-search"
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            aria-label="Search docs"
          />
          {query && (
            <button className="sidebar-search-clear" onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }} aria-label="Clear search">
              <XIcon size={12} />
            </button>
          )}
        </div>

        {isSearching ? (
          <div className="search-results">
            {results.length === 0 ? (
              <p className="sidebar-no-results">No results for "{query}"</p>
            ) : (
              results.map((r, i) => (
                <button key={i} className="search-result" onClick={() => handleSelect(r.path)}>
                  <span className="search-result-meta">
                    {r.pageTitle}{r.heading ? <> <span className="search-result-sep">›</span> {r.heading}</> : null}
                  </span>
                  <span className="search-result-snippet">{r.snippet}</span>
                </button>
              ))
            )}
          </div>
        ) : (
          <nav className="sidebar-nav">
            {NAV.map((group) => (
              <div key={group.group} className="sidebar-group">
                <span className="sidebar-group-label">{group.group}</span>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end={item.path === "/"}
                        onClick={() => setOpen(false)}
                      >
                        {({ isActive }) => (
                          <span className={`sidebar-link${isActive ? " active" : ""}`}>
                            {item.label}
                            {isActive && <ReadingRing progress={scrollProgress} />}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        )}
      </aside>
    </>
  );
}
