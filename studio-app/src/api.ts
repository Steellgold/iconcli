import type { StudioConfig, IconEntry, LibraryIcon, Library, DirectionKey } from './types';

function detectStyle(svgContent: string): 'filled' | 'outline' | 'unknown' {
  if (!svgContent) return 'unknown';
  const rootFillNone = /<svg[^>]*fill="none"[^>]*>/.test(svgContent);
  const hasStroke = /stroke="(?!none)[^"]*"/.test(svgContent);
  if (rootFillNone && hasStroke) return 'outline';
  const rootFillCurrent = /<svg[^>]*fill="currentColor"[^>]*>/.test(svgContent);
  const hasExplicitFill = /fill="(?!none)[^"]*"/.test(svgContent);
  if (rootFillCurrent && !hasStroke) return 'filled';
  if (hasExplicitFill && !hasStroke && !rootFillNone) return 'filled';
  return 'unknown';
}

export async function fetchConfig(): Promise<StudioConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json() as Promise<StudioConfig>;
}

export async function fetchIcons(): Promise<IconEntry[]> {
  const res = await fetch('/api/icons');
  if (!res.ok) throw new Error('Failed to fetch icons');
  const data = (await res.json()) as Record<string, Omit<IconEntry, 'filename' | 'detectedStyle'>>;
  return Object.entries(data).map(([filename, icon]) => ({
    ...icon,
    filename,
    detectedStyle: detectStyle(icon.svgContent),
  }));
}

export async function fetchLibrary(lib: Library): Promise<LibraryIcon[]> {
  const res = await fetch(`/api/library?lib=${lib}`);
  if (!res.ok) throw new Error('Failed to fetch library');
  return res.json() as Promise<LibraryIcon[]>;
}

export interface LibrarySVGParams {
  lib: Library;
  name: string;
  heroiconSize?: number;
  heroiconStyle?: string;
  tablerStyle?: string;
  tablerStroke?: number;
}

export async function fetchLibrarySVG(params: LibrarySVGParams): Promise<string> {
  const { lib, name } = params;
  let query = `/api/library/svg?lib=${lib}&name=${encodeURIComponent(name)}`;
  if (lib === 'heroicons') {
    if (params.heroiconSize) query += `&size=${params.heroiconSize}`;
    if (params.heroiconStyle) query += `&style=${params.heroiconStyle}`;
  } else if (lib === 'tabler') {
    if (params.tablerStyle) query += `&style=${params.tablerStyle}`;
    if (params.tablerStroke) query += `&stroke=${params.tablerStroke}`;
  }
  const res = await fetch(query);
  if (!res.ok) throw new Error('Failed to fetch SVG');
  const data = (await res.json()) as { svgContent: string };
  return data.svgContent;
}

export interface ImportIconBody {
  componentName: string;
  source: 'library' | 'paste' | 'url';
  library?: string;
  libraryIconName?: string;
  heroiconSize?: number;
  heroiconStyle?: string;
  tablerStyle?: string;
  tablerStroke?: number;
  svgContent?: string;
  svgUrl?: string;
}

export async function importIcon(body: ImportIconBody): Promise<{ componentName: string; filename: string }> {
  const res = await fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { componentName: string; filename: string; error?: string };
  if (!res.ok || data.error) throw new Error(data.error ?? 'Import failed');
  return data;
}

export async function deleteIcons(filenames: string[]): Promise<void> {
  const res = await fetch('/api/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filenames }),
  });
  if (!res.ok) throw new Error('Delete failed');
}

export async function renameIcon(
  filename: string,
  newName: string,
): Promise<{ componentName: string; newFilename: string; oldFilename: string }> {
  const res = await fetch('/api/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, newName }),
  });
  const data = (await res.json()) as {
    componentName: string;
    newFilename: string;
    oldFilename: string;
    error?: string;
  };
  if (!res.ok || data.error) throw new Error(data.error ?? 'Rename failed');
  return data;
}

export interface DirectiveSlotPayload {
  library: string;
  libraryIconName: string;
  heroiconSize?: number;
  heroiconStyle?: string;
  tablerStyle?: string;
  tablerStroke?: number;
}

export async function importDirective(
  componentName: string,
  slots: Partial<Record<DirectionKey, DirectiveSlotPayload>>,
): Promise<{ componentName: string; filename: string }> {
  const res = await fetch('/api/import-directive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ componentName, slots }),
  });
  const data = (await res.json()) as { componentName: string; filename: string; error?: string };
  if (!res.ok || data.error) throw new Error(data.error ?? 'Import failed');
  return data;
}

export { detectStyle };
