import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!mainRef.current) {
      mainRef.current = document.querySelector(".main-content");
    }
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}
