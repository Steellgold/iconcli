import type { HTMLAttributes } from "react";

interface CodeBlockProps extends HTMLAttributes<HTMLElement> {
  className?: string;
  children?: string;
}

export function CodeBlock({ className, children, ...props }: CodeBlockProps) {
  // Non-string children = Shiki's span tree inside a fenced code block — pass through untouched
  if (typeof children !== "string") {
    return <code className={className} {...props}>{children}</code>;
  }

  // Plain string = inline backtick code in prose
  return (
    <code className="inline-code" {...props}>
      {children}
    </code>
  );
}
