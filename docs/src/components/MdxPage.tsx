import type { ReactNode } from "react";
import PageNav from "./PageNav";

interface MdxPageProps {
  children: ReactNode;
}

export default function MdxPage({ children }: MdxPageProps) {
  return (
    <article className="prose">
      {children}
      <PageNav />
    </article>
  );
}
