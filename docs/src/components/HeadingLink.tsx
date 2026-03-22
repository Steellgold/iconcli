import { useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";

function slugify(children: ReactNode): string {
  const text = typeof children === "string"
    ? children
    : Array.isArray(children)
      ? children.map((c) => (typeof c === "string" ? c : "")).join("")
      : "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function makeHeading(Tag: "h1" | "h2" | "h3" | "h4") {
  return function Heading({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    const id = slugify(children);
    const [copied, setCopied] = useState(false);

    const handleClick = () => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      void navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      });
    };

    return (
      <Tag id={id} className="heading-anchor-wrap" onClick={handleClick} {...props}>
        {children}
        <span className="heading-hash" aria-hidden="true">{copied ? "✓" : "#"}</span>
      </Tag>
    );
  };
}

export const H1 = makeHeading("h1");
export const H2 = makeHeading("h2");
export const H3 = makeHeading("h3");
export const H4 = makeHeading("h4");
