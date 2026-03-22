export interface NavItem {
  label: string;
  path: string;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    group: "Getting Started",
    items: [
      { label: "Introduction", path: "/" },
      { label: "Installation", path: "/installation" },
      { label: "Quick Start", path: "/quick-start" },
    ],
  },
  {
    group: "Usage",
    items: [
      { label: "Interactive & CLI", path: "/usage" },
      { label: "Batch Mode", path: "/batch" },
      { label: "Tracking & Diff", path: "/tracking" },
    ],
  },
  {
    group: "Features",
    items: [
      { label: "Icon Libraries", path: "/icon-libraries" },
      { label: "Multi-Variant Icons", path: "/multi-variant" },
      { label: "Spinner Generator", path: "/spinner" },
      { label: "AI Generation", path: "/ai" },
      { label: "PNG Export", path: "/png-export" },
    ],
  },
  {
    group: "Configuration",
    items: [
      { label: "Configuration Reference", path: "/configuration" },
      { label: "Auto Formatting", path: "/formatting" },
    ],
  },
  {
    group: "Studio",
    items: [{ label: "Studio Overview", path: "/studio" }],
  },
  {
    group: "Project",
    items: [{ label: "Changelog", path: "/changelog" }],
  },
];
