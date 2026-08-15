export interface RgbColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface ColorData {
  hex: string;
  rgb: string;
  rgba: string;
  r: number;
  g: number;
  b: number;
  a: number;
  hsl: string;
  hsv: string;
  cmyk: string;
  oklch: string;
  swiftUI: string;
  androidCompose: string;
  flutter: string;
  cssVar: string;
  tailwind: string;
  name: string;
  isDark: boolean;
  contrastWhite: number;
  contrastBlack: number;
  wcagWhite: 'AAA' | 'AA' | 'Fail';
  wcagBlack: 'AAA' | 'AA' | 'Fail';
}

export interface ExtractedColor {
  hex: string;
  rgb: string;
  r: number;
  g: number;
  b: number;
  percentage: number;
  count: number;
  name: string;
  family: 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Cyan' | 'Blue' | 'Purple' | 'Pink' | 'Neutral';
  luminance: number;
  hue: number;
  saturation: number;
  lightness: number;
  androidCompose: string;
  flutter: string;
}

export type SampleRadius = 1 | 3 | 5;

export interface PaletteGroup {
  name: string;
  description: string;
  colors: string[];
}

export interface ColorHistoryItem {
  id: string;
  hex: string;
  rgb: string;
  name: string;
  timestamp: number;
  isPinned?: boolean;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  isLocked: boolean;
  pixelGrid: boolean;
  sampleRadius: SampleRadius;
}

