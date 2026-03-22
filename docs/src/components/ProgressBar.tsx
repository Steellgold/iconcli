import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function ProgressBar() {
  const [progress, setProgress] = useState(0);
  const { pathname } = useLocation();

  useEffect(() => {
    setProgress(0);
    const el = document.querySelector(".main-content");
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const total = scrollHeight - clientHeight;
      setProgress(total > 0 ? (scrollTop / total) * 100 : 0);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  return (
    <div className="progress-bar-track">
      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
    </div>
  );
}
