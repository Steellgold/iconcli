import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function SearchHighlight() {
  const location = useLocation();

  useEffect(() => {
    const query: string = (location.state as { searchQuery?: string } | null)?.searchQuery ?? "";
    if (!query) return;

    // Wait for MDX content to render
    const timer = setTimeout(() => {
      const prose = document.querySelector(".prose");
      if (!prose) return;

      const q = query.toLowerCase();
      const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT);

      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const text = node.textContent ?? "";
        const idx = text.toLowerCase().indexOf(q);
        if (idx === -1) continue;

        try {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + q.length);

          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);

          // Scroll the matched text into view inside .main-content
          const rect = range.getBoundingClientRect();
          const container = document.querySelector(".main-content");
          if (container && rect.top !== 0) {
            const containerRect = container.getBoundingClientRect();
            container.scrollTo({
              top: container.scrollTop + (rect.top - containerRect.top) - 160,
              behavior: "smooth",
            });
          }
        } catch {
          // ignore range errors on edge cases
        }
        break;
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [location.pathname, location.state]);

  return null;
}
