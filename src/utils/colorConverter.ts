import { ColorData, RgbColor } from '../types';

// Curated color name dataset for fast nearest-neighbor matching
const COLOR_NAMES: [string, number, number, number][] = [
  ['Pure Black', 0, 0, 0],
  ['Charcoal', 33, 33, 33],
  ['Jet Black', 18, 18, 18],
  ['Pure White', 255, 255, 255],
  ['Off White', 245, 245, 245],
  ['Ghost White', 248, 248, 255],
  ['Snow', 255, 250, 250],
  ['Silver', 192, 192, 192],
  ['Cool Gray', 142, 142, 147],
  ['Slate', 100, 116, 139],
  ['Apple Red', 255, 59, 48],
  ['Crimson', 220, 20, 60],
  ['Ruby', 224, 17, 95],
  ['Scarlet', 255, 36, 0],
  ['Coral', 255, 127, 80],
  ['Salmon', 250, 128, 114],
  ['Apple Orange', 255, 149, 0],
  ['Tangerine', 242, 133, 0],
  ['Amber', 255, 191, 0],
  ['Apple Yellow', 255, 204, 0],
  ['Gold', 255, 215, 0],
  ['Lemon', 255, 247, 0],
  ['Apple Green', 52, 199, 89],
  ['Emerald', 80, 200, 120],
  ['Mint', 0, 201, 167],
  ['Apple Mint', 0, 199, 190],
  ['Apple Teal', 48, 176, 199],
  ['Apple Cyan', 50, 173, 230],
  ['Apple Blue', 0, 122, 255],
  ['Electric Blue', 125, 249, 255],
  ['Sky Blue', 135, 206, 235],
  ['Royal Blue', 65, 105, 225],
  ['Navy', 0, 0, 128],
  ['Midnight Blue', 25, 25, 112],
  ['Apple Indigo', 88, 86, 214],
  ['Apple Purple', 175, 82, 222],
  ['Violet', 138, 43, 226],
  ['Lavender', 230, 230, 250],
  ['Apple Pink', 255, 45, 85],
  ['Hot Pink', 255, 105, 180],
  ['Deep Rose', 194, 24, 91],
  ['Apple Brown', 162, 132, 94],
  ['Chocolate', 123, 63, 0],
  ['Mocha', 78, 46, 40],
  ['Warm Bronze', 140, 90, 40],
  ['Olive', 128, 128, 0],
  ['Forest Green', 34, 139, 34],
  ['Sage', 158, 169, 150],
  ['Neon Lime', 57, 255, 20],
  ['Cyber Yellow', 255, 211, 0],
  ['Sunset Orange', 253, 94, 83],
  ['Ultra Violet', 95, 37, 159],
  ['Aquamarine', 127, 255, 212],
  ['Turquoise', 64, 224, 208],
  ['Cerulean', 0, 123, 167],
  ['Denim', 21, 96, 189],
  ['Burgundy', 128, 0, 32],
  ['Magenta', 255, 0, 255],
  ['Peach', 255, 218, 185],
  ['Champagne', 247, 231, 206],
  ['Graphite', 65, 66, 68],
  ['Zinc', 113, 113, 122],
  ['Neutral Gray', 115, 115, 115],
  ['Warm Gray', 120, 113, 108]
];

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0').toUpperCase();
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): RgbColor {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16) || 0,
      g: parseInt(cleanHex[1] + cleanHex[1], 16) || 0,
      b: parseInt(cleanHex[2] + cleanHex[2], 16) || 0,
      a: 1
    };
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  const a = cleanHex.length >= 8 ? (parseInt(cleanHex.substring(6, 8), 16) || 255) / 255 : 1;
  return { r, g, b, a };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number; str: string } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  const hDeg = h;
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  return {
    h: hDeg,
    s: sPct,
    l: lPct,
    str: `${hDeg}°, ${sPct}%, ${lPct}%`
  };
}

export function hslToRgb(h: number, s: number, l: number): RgbColor {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rP = 0, gP = 0, bP = 0;

  if (h >= 0 && h < 60) {
    rP = c; gP = x; bP = 0;
  } else if (h >= 60 && h < 120) {
    rP = x; gP = c; bP = 0;
  } else if (h >= 120 && h < 180) {
    rP = 0; gP = c; bP = x;
  } else if (h >= 180 && h < 240) {
    rP = 0; gP = x; bP = c;
  } else if (h >= 240 && h < 300) {
    rP = x; gP = 0; bP = c;
  } else {
    rP = c; gP = 0; bP = x;
  }

  return {
    r: Math.round((rP + m) * 255),
    g: Math.round((gP + m) * 255),
    b: Math.round((bP + m) * 255),
    a: 1
  };
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number; str: string } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  const hDeg = h;
  const sPct = Math.round(s * 100);
  const vPct = Math.round(v * 100);
  return {
    h: hDeg,
    s: sPct,
    v: vPct,
    str: `${hDeg}°, ${sPct}%, ${vPct}%`
  };
}

export function rgbToCmyk(r: number, g: number, b: number): string {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  if (k === 1) {
    return '0%, 0%, 0%, 100%';
  }
  const c = Math.round(((1 - rNorm - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gNorm - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bNorm - k) / (1 - k)) * 100);
  const kPct = Math.round(k * 100);
  return `${c}%, ${m}%, ${y}%, ${kPct}%`;
}

export function rgbToOklch(r: number, g: number, b: number): string {
  // Approximate conversion to sRGB -> OKLab -> OKLCH
  const rL = r / 255;
  const gL = g / 255;
  const bL = b / 255;

  // Linearize sRGB
  const toLinear = (c: number) => c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  const lr = toLinear(rL);
  const lg = toLinear(gL);
  const lb = toLinear(bL);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const oklabL = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const oklabA = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const oklabB = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  const c = Math.sqrt(oklabA * oklabA + oklabB * oklabB);
  let h = Math.atan2(oklabB, oklabA) * (180 / Math.PI);
  if (h < 0) h += 360;

  return `oklch(${(oklabL * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}

export function getRelativeLuminance(r: number, g: number, b: number): number {
  const transform = (val: number) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

export function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getClosestColorName(r: number, g: number, b: number): string {
  let closestName = 'Custom Tone';
  let minDistance = Infinity;

  for (const [name, cr, cg, cb] of COLOR_NAMES) {
    // Weighted Euclidean RGB distance favoring human eye perception
    const dr = r - cr;
    const dg = g - cg;
    const db = b - cb;
    const distance = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (distance < minDistance) {
      minDistance = distance;
      closestName = name;
    }
  }
  return closestName;
}

export function createColorData(r: number, g: number, b: number, a: number = 1): ColorData {
  const hex = rgbToHex(r, g, b);
  const rgb = `${r}, ${g}, ${b}`;
  const rgba = `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  const hsl = rgbToHsl(r, g, b).str;
  const hsv = rgbToHsv(r, g, b).str;
  const cmyk = rgbToCmyk(r, g, b);
  const oklch = rgbToOklch(r, g, b);

  const cleanHex = hex.replace('#', '');
  const swiftUI = `Color(hex: "${cleanHex}")`;
  const androidCompose = `Color(0xFF${cleanHex})`;
  const flutter = `Color(0xFF${cleanHex})`;
  const cssVar = `--color-primary: ${hex};`;
  const tailwind = `'custom': '${hex}',`;

  const lum = getRelativeLuminance(r, g, b);
  const whiteLum = 1.0;
  const blackLum = 0.0;

  const contrastWhite = Number(getContrastRatio(lum, whiteLum).toFixed(2));
  const contrastBlack = Number(getContrastRatio(lum, blackLum).toFixed(2));

  const wcagWhite: 'AAA' | 'AA' | 'Fail' = contrastWhite >= 7.0 ? 'AAA' : contrastWhite >= 4.5 ? 'AA' : 'Fail';
  const wcagBlack: 'AAA' | 'AA' | 'Fail' = contrastBlack >= 7.0 ? 'AAA' : contrastBlack >= 4.5 ? 'AA' : 'Fail';

  const name = getClosestColorName(r, g, b);
  const isDark = lum < 0.35;

  return {
    hex,
    rgb,
    rgba,
    r,
    g,
    b,
    a,
    hsl,
    hsv,
    cmyk,
    oklch,
    swiftUI,
    androidCompose,
    flutter,
    cssVar,
    tailwind,
    name,
    isDark,
    contrastWhite,
    contrastBlack,
    wcagWhite,
    wcagBlack
  };
}

export function getHarmonies(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);

  const toHex = (hue: number, sat: number, lit: number) => {
    const rgb = hslToRgb(hue, sat, lit);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  };

  return {
    complementary: [hex, toHex(h + 180, s, l)],
    analogous: [toHex(h - 30, s, l), hex, toHex(h + 30, s, l)],
    triadic: [hex, toHex(h + 120, s, l), toHex(h + 240, s, l)],
    splitComplementary: [hex, toHex(h + 150, s, l), toHex(h + 210, s, l)],
    tetradic: [hex, toHex(h + 90, s, l), toHex(h + 180, s, l), toHex(h + 270, s, l)],
    monochromatic: [
      toHex(h, s, Math.max(12, l - 35)),
      toHex(h, s, Math.max(22, l - 18)),
      hex,
      toHex(h, s, Math.min(85, l + 18)),
      toHex(h, s, Math.min(96, l + 35))
    ]
  };
}
