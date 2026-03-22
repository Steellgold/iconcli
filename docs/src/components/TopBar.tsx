import { useEffect, useState } from "react";
import { GithubIcon } from "./icons";

export default function TopBar() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://registry.npmjs.org/@steellgold/mkicon/latest")
      .then((r) => r.json())
      .then((d: { version: string }) => setVersion(d.version))
      .catch(() => {});
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">mkicon</span>
        <span className="topbar-version">{version ? `v${version}` : "docs"}</span>
      </div>
      <nav className="topbar-right">
        <a
          href="https://github.com/Steellgold/mkicon"
          target="_blank"
          rel="noreferrer"
          className="topbar-link"
          aria-label="GitHub"
        >
          <GithubIcon size={18} />
          GitHub
        </a>
        <a
          href="https://www.npmjs.com/package/@steellgold/mkicon"
          target="_blank"
          rel="noreferrer"
          className="topbar-link topbar-npm"
        >
          npm
        </a>
      </nav>
    </header>
  );
}
