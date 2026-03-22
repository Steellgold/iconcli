import { useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import { CopyIcon, CopyCheckIcon } from "./icons";

export function ShikiBlock({ className, children, style, ...props }: HTMLAttributes<HTMLPreElement>) {
  const isShiki = className?.includes("shiki");
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  if (!isShiki) {
    return (
      <pre className={className} style={style} {...props}>
        {children}
      </pre>
    );
  }

  const handleCopy = () => {
    const text = ref.current?.querySelector("code")?.textContent ?? "";
    void navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="code-block">
      <button className="code-copy" onClick={handleCopy} aria-label="Copy code">
        {copied ? <CopyCheckIcon size={14} /> : <CopyIcon size={14} />}
      </button>
      <pre ref={ref} className={className} {...props}>
        {children}
      </pre>
    </div>
  );
}
