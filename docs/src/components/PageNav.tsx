import { Link, useLocation } from "react-router-dom";
import { NAV } from "../nav";
import { ChevronIcon, PencilIcon } from "./icons";

const flatPages = NAV.flatMap((g) => g.items);

function getEditUrl(pathname: string): string {
  const file = pathname === "/" ? "index" : pathname.replace(/^\//, "");
  return `https://github.com/Steellgold/mkicon/blob/stable/docs/src/pages/${file}.mdx`;
}

export default function PageNav() {
  const { pathname } = useLocation();
  const idx = flatPages.findIndex((p) => p.path === pathname);
  const prev = idx > 0 ? flatPages[idx - 1] : null;
  const next = idx < flatPages.length - 1 ? flatPages[idx + 1] : null;

  return (
    <div className="page-nav-wrapper">
      <a
        href={getEditUrl(pathname)}
        target="_blank"
        rel="noreferrer"
        className="page-nav-edit"
      >
        <PencilIcon size={13} />
        Edit this page on GitHub
      </a>

      {(prev || next) && (
        <nav className="page-nav">
          <div className="page-nav-prev">
            {prev && (
              <Link to={prev.path} className="page-nav-btn">
                <ChevronIcon direction="left" size={16} />
                <span>
                  <span className="page-nav-label">Previous</span>
                  <span className="page-nav-title">{prev.label}</span>
                </span>
              </Link>
            )}
          </div>
          <div className="page-nav-next">
            {next && (
              <Link to={next.path} className="page-nav-btn page-nav-btn--next">
                <span>
                  <span className="page-nav-label">Next</span>
                  <span className="page-nav-title">{next.label}</span>
                </span>
                <ChevronIcon direction="right" size={16} />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
