import { createHash } from "node:crypto";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface LockEntry {
  componentName: string;
  sourcePath: string;
  svgHash: string;
  svgContent: string;
  generatedAt: string;
  iconSize?: number;
  library?: string;
  libraryIconName?: string;
}

export type LockFile = Record<string, LockEntry>;

export interface DiffResult {
  filename: string;
  sourcePath: string;
  status: "unchanged" | "changed" | "missing-source";
  oldContent?: string;
  newContent?: string;
}

export const getLockFilePath = (projectRoot: string): string =>
  path.join(projectRoot, ".mkicon.lock.json");

export const readLockFile = async (projectRoot: string): Promise<LockFile> => {
  const lockPath = getLockFilePath(projectRoot);
  if (!existsSync(lockPath)) {return {};}
  try {
    const raw = await fs.readFile(lockPath, "utf-8");
    return JSON.parse(raw) as LockFile;
  } catch {
    return {};
  }
};

const LOCK_FILENAME = ".mkicon.lock.json";

export const writeLockFile = async (projectRoot: string, lock: LockFile): Promise<void> => {
  const lockPath = getLockFilePath(projectRoot);
  const isNew = !existsSync(lockPath);

  await fs.writeFile(lockPath, JSON.stringify(lock, null, 2), "utf-8");

  if (isNew) {
    await addToGitignore(projectRoot);
  }
};

const addToGitignore = async (projectRoot: string): Promise<void> => {
  const gitignorePath = path.join(projectRoot, ".gitignore");

  if (!existsSync(gitignorePath)) return;

  const content = await fs.readFile(gitignorePath, "utf-8");
  if (content.includes(LOCK_FILENAME)) return;

  const newline = content.endsWith("\n") ? "" : "\n";
  await fs.appendFile(gitignorePath, `${newline}# mkicon\n${LOCK_FILENAME}\n`);
};

export const hashSvg = (content: string): string =>
  createHash("sha256").update(content).digest("hex").slice(0, 16);

/**
 * Register a component generation from a local SVG source in the lockfile.
 */
export const trackGeneratedComponent = async (
  projectRoot: string,
  filename: string,
  componentName: string,
  sourcePath: string,
  svgContent: string,
  meta?: { iconSize?: number; library?: string; libraryIconName?: string }
): Promise<void> => {
  const lock = await readLockFile(projectRoot);
  lock[filename] = {
    componentName,
    sourcePath,
    svgHash: hashSvg(svgContent),
    svgContent,
    generatedAt: new Date().toISOString(),
    ...(meta?.iconSize !== undefined && { iconSize: meta.iconSize }),
    ...(meta?.library && { library: meta.library }),
    ...(meta?.libraryIconName && { libraryIconName: meta.libraryIconName }),
  };
  await writeLockFile(projectRoot, lock);
};

/**
 * Check all tracked components for SVG source changes.
 */
export const checkDiffs = async (projectRoot: string): Promise<DiffResult[]> => {
  const lock = await readLockFile(projectRoot);
  const results: DiffResult[] = [];

  for (const [filename, entry] of Object.entries(lock)) {
    const absPath = path.isAbsolute(entry.sourcePath)
      ? entry.sourcePath
      : path.join(projectRoot, entry.sourcePath);

    if (!existsSync(absPath)) {
      results.push({ filename, sourcePath: entry.sourcePath, status: "missing-source" });
      continue;
    }

    const currentContent = await fs.readFile(absPath, "utf-8");
    const currentHash = hashSvg(currentContent);

    if (currentHash === entry.svgHash) {
      results.push({ filename, sourcePath: entry.sourcePath, status: "unchanged" });
    } else {
      results.push({
        filename,
        sourcePath: entry.sourcePath,
        status: "changed",
        oldContent: entry.svgContent,
        newContent: currentContent,
      });
    }
  }

  return results;
};

/**
 * Rebuild the lockfile from existing component files in the icons directory.
 * Priority: SVG source files > SVG extracted from component.
 * Called automatically when the lockfile is missing (e.g. after a fresh clone).
 */
export const rebuildLockFile = async (projectRoot: string, iconsDir: string): Promise<void> => {
  const { extractSvgFromComponent } = await import("@/utils/component-parser");

  const supported = [".tsx", ".ts", ".jsx", ".js", ".vue", ".svelte"];

  if (!existsSync(iconsDir)) return;

  const files = await fs.readdir(iconsDir);
  const components = files.filter((f) => supported.includes(path.extname(f)));

  if (components.length === 0) return;

  // Collect all SVG files in the project for source matching
  const allSvgFiles = await findSvgFiles(projectRoot);

  const lock: LockFile = {};

  for (const filename of components) {
    const filePath = path.join(iconsDir, filename);
    const content = await fs.readFile(filePath, "utf-8");
    const componentName = filename.replace(/\.[^.]+$/, "");

    // Try to find a matching SVG source file
    const matchedSvg = findMatchingSvg(componentName, allSvgFiles);

    let svgContent: string | null = null;
    let sourcePath: string;

    if (matchedSvg) {
      svgContent = await fs.readFile(matchedSvg, "utf-8");
      sourcePath = path.relative(projectRoot, matchedSvg);

      lock[filename] = {
        componentName,
        sourcePath,
        svgHash: hashSvg(svgContent),
        svgContent,
        generatedAt: (await fs.stat(filePath)).mtime.toISOString(),
      };
    } else {
      // No SVG source found — use the component file itself.
      // Store hash of the full component content so the source-changed check stays accurate.
      svgContent = extractSvgFromComponent(content);
      if (!svgContent) continue;

      sourcePath = path.relative(projectRoot, filePath);
      lock[filename] = {
        componentName,
        sourcePath,
        svgHash: hashSvg(content), // hash the .tsx file, not the extracted SVG
        svgContent,
        generatedAt: (await fs.stat(filePath)).mtime.toISOString(),
      };
    }
  }

  if (Object.keys(lock).length > 0) {
    await writeLockFile(projectRoot, lock);
  }
};

const findSvgFiles = async (dir: string, depth = 0): Promise<string[]> => {
  if (depth > 4) return [];
  const results: string[] = [];
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (entry.startsWith(".") || entry === "node_modules" || entry === "dist") continue;
    const full = path.join(dir, entry);
    try {
      const stat = await fs.stat(full);
      if (stat.isDirectory()) {
        results.push(...(await findSvgFiles(full, depth + 1)));
      } else if (entry.endsWith(".svg")) {
        results.push(full);
      }
    } catch {
      // skip
    }
  }
  return results;
};

/** Try to match BananaIcon → banana.svg, banana-icon.svg, etc. */
const findMatchingSvg = (componentName: string, svgFiles: string[]): string | null => {
  // Convert PascalCase/camelCase to kebab-case, strip common suffixes
  const kebab = componentName
    .replace(/Icon$/, "")
    .replace(/([A-Z])/g, (m, i) => (i > 0 ? "-" : "") + m.toLowerCase())
    .replace(/^-/, "")
    .toLowerCase();

  const candidates = [
    kebab,
    `${kebab}-icon`,
    componentName.toLowerCase(),
  ];

  for (const svgPath of svgFiles) {
    const stem = path.basename(svgPath, ".svg").toLowerCase();
    if (candidates.includes(stem)) return svgPath;
  }

  // Looser match: component name contains the svg stem
  for (const svgPath of svgFiles) {
    const stem = path.basename(svgPath, ".svg").toLowerCase();
    if (kebab.includes(stem) || stem.includes(kebab)) return svgPath;
  }

  return null;
};

/** Simple line-level diff: returns hunks of [type, line] */
export type DiffLine = ["add" | "del" | "ctx", string];

export const computeLineDiff = (oldText: string, newText: string): DiffLine[] => {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  // Myers diff via LCS
  const lcs = computeLCS(oldLines, newLines);
  const result: DiffLine[] = [];

  let oi = 0;
  let ni = 0;
  let li = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && oldLines[oi] === lcs[li] && ni < newLines.length && newLines[ni] === lcs[li]) {
      result.push(["ctx", oldLines[oi]]);
      oi++;
      ni++;
      li++;
    } else if (ni < newLines.length && (li >= lcs.length || newLines[ni] !== lcs[li])) {
      result.push(["add", newLines[ni]]);
      ni++;
    } else if (oi < oldLines.length) {
      result.push(["del", oldLines[oi]]);
      oi++;
    }
  }

  return result;
};

const computeLCS = (a: string[], b: string[]): string[] => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const lcs: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
};
