import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { MDXProvider } from "@mdx-js/react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import MdxPage from "./components/MdxPage";
import { CodeBlock } from "./components/CodeBlock";
import { ShikiBlock } from "./components/ShikiBlock";
import { H1, H2, H3, H4 } from "./components/HeadingLink";
import ScrollToTop from "./components/ScrollToTop";
import ProgressBar from "./components/ProgressBar";
import SearchHighlight from "./components/SearchHighlight";
import TableOfContents from "./components/TableOfContents";
import NotFound from "./pages/NotFound";

import IntroductionPage from "./pages/index.mdx";
import InstallationPage from "./pages/installation.mdx";
import QuickStartPage from "./pages/quick-start.mdx";
import UsagePage from "./pages/usage.mdx";
import BatchPage from "./pages/batch.mdx";
import TrackingPage from "./pages/tracking.mdx";
import IconLibrariesPage from "./pages/icon-libraries.mdx";
import MultiVariantPage from "./pages/multi-variant.mdx";
import SpinnerPage from "./pages/spinner.mdx";
import AiPage from "./pages/ai.mdx";
import PngExportPage from "./pages/png-export.mdx";
import ConfigurationPage from "./pages/configuration.mdx";
import FormattingPage from "./pages/formatting.mdx";
import StudioPage from "./pages/studio.mdx";
import ChangelogPage from "./pages/changelog.mdx";

const mdxComponents = {
  pre: ShikiBlock,
  code: CodeBlock,
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
};

const pages = [
  { path: "/", element: <IntroductionPage /> },
  { path: "/installation", element: <InstallationPage /> },
  { path: "/quick-start", element: <QuickStartPage /> },
  { path: "/usage", element: <UsagePage /> },
  { path: "/batch", element: <BatchPage /> },
  { path: "/tracking", element: <TrackingPage /> },
  { path: "/icon-libraries", element: <IconLibrariesPage /> },
  { path: "/multi-variant", element: <MultiVariantPage /> },
  { path: "/spinner", element: <SpinnerPage /> },
  { path: "/ai", element: <AiPage /> },
  { path: "/png-export", element: <PngExportPage /> },
  { path: "/configuration", element: <ConfigurationPage /> },
  { path: "/formatting", element: <FormattingPage /> },
  { path: "/studio", element: <StudioPage /> },
  { path: "/changelog", element: <ChangelogPage /> },
];

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      {pages.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={<MdxPage>{element}</MdxPage>}
        />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <MDXProvider components={mdxComponents}>
        <div className="app-layout">
          <TopBar />
          <ProgressBar />
          <div className="content-layout">
            <Sidebar />
            <main className="main-content">
              <ScrollToTop />
              <SearchHighlight />
              <AnimatedRoutes />
            </main>
            <TableOfContents />
          </div>
        </div>
      </MDXProvider>
    </HashRouter>
  );
}
