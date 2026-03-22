import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

export default function TableOfContents() {
  const { pathname } = useLocation();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => {
      const els = document.querySelectorAll<HTMLElement>(".prose h2[id], .prose h3[id]");
      setHeadings(
        Array.from(els).map((el) => {
          const clone = el.cloneNode(true) as HTMLElement;
          clone.querySelector(".heading-hash")?.remove();
          return {
            id: el.id,
            text: clone.textContent?.trim() ?? "",
            level: el.tagName === "H2" ? 2 : 3,
          };
        })
      );
    }, 80);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (headings.length === 0) return;

    const root = document.querySelector(".main-content");
    if (!root) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = root;

      // At bottom → activate last heading
      if (scrollTop + clientHeight >= scrollHeight - 8) {
        setActiveId(headings[headings.length - 1].id);
        return;
      }

      // Last heading whose top edge is above the scroll offset
      const offset = 100;
      let active = headings[0].id;
      for (const { id } of headings) {
        const el = document.getElementById(id);
        if (el && el.offsetTop - offset <= scrollTop) {
          active = id;
        }
      }
      setActiveId(active);
    };

    handleScroll();
    root.addEventListener("scroll", handleScroll, { passive: true });
    return () => root.removeEventListener("scroll", handleScroll);
  }, [headings]);

  if (headings.length === 0) return <aside className="toc-panel toc-panel--empty" />;

  return (
    <aside className="toc-panel">
      <p className="toc-label">On this page</p>
      <ul className="toc-list">
        {headings.map((h) => (
          <li key={h.id} className={`toc-item toc-item--h${h.level}`}>
            <a
              href={`#${h.id}`}
              className={`toc-link${activeId === h.id ? " active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
