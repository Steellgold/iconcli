/// <reference types="vite/client" />

declare module "virtual:search-index" {
  interface IndexEntry {
    path: string;
    pageTitle: string;
    heading: string;
    text: string;
  }
  export const SEARCH_INDEX: IndexEntry[];
}

declare module "*.mdx" {
  import type { ComponentType, ReactNode } from "react";
  interface MDXProps {
    components?: Record<string, ComponentType>;
    children?: ReactNode;
  }
  const Component: ComponentType<MDXProps>;
  export default Component;
}
