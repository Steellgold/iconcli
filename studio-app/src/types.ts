export interface IconEntry {
  filename: string;
  componentName: string;
  svgContent: string;
  library?: string;
  libraryIconName?: string;
  iconSize?: number;
  generatedAt?: string;
  directions?: string[];
  variantSvgs?: Record<string, string>;
  detectedStyle: 'filled' | 'outline' | 'unknown';
}

export interface LibraryIcon {
  name: string;
  tags?: string[];
}

export interface StudioConfig {
  activeFrameworks: string[];
  iconsPath: string;
}

export interface Prefs {
  size: number;
  stroke: number;
  style: 'auto' | 'filled' | 'outline';
  color: string;
  library: string;
}

export type ImportTab = 'library' | 'paste' | 'url' | 'drop';

export type Library = 'lucide' | 'heroicons' | 'tabler';

export interface DirectiveSlotData {
  name: string;
  svgContent: string;
}

export type DirectionKey = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export type DirectiveSlots = Record<DirectionKey, DirectiveSlotData | null>;

export interface CtxMenuState {
  x: number;
  y: number;
  icon: IconEntry;
}
