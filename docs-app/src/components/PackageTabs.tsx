import { useRef, useState } from "react";
import { CopyIcon, CopyCheckIcon } from "./icons";

type Manager = "npm" | "pnpm" | "yarn" | "bun";

interface PackageTabsProps {
  npm?: string;
  pnpm?: string;
  yarn?: string;
  bun?: string;
}

const STORAGE_KEY = "mkicon-pkg-manager";
const MANAGERS: Manager[] = ["npm", "pnpm", "yarn", "bun"];

function getSaved(available: Manager[]): Manager {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Manager | null;
    if (saved && available.includes(saved)) return saved;
  } catch { /* ignore */ }
  return available[0];
}

export function PackageTabs({ npm, pnpm, yarn, bun }: PackageTabsProps) {
  const map: Partial<Record<Manager, string>> = { npm, pnpm, yarn, bun };
  const available = MANAGERS.filter((m) => map[m] !== undefined);
  const [active, setActive] = useState<Manager>(() => getSaved(available));
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const handleSelect = (m: Manager) => {
    setActive(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
  };

  const code = map[active] ?? map[available[0]] ?? "";

  const handleCopy = () => {
    void navigator.clipboard.writeText(code.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="pkg-tabs">
      <div className="pkg-tabs-header">
        {available.map((m) => (
          <button
            key={m}
            className={`pkg-tab${active === m ? " active" : ""}`}
            onClick={() => handleSelect(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="code-block">
        <button className="code-copy" onClick={handleCopy} aria-label="Copy">
          {copied ? <CopyCheckIcon size={14} /> : <CopyIcon size={14} />}
        </button>
        <pre><code ref={ref}>{code}</code></pre>
      </div>
    </div>
  );
}
