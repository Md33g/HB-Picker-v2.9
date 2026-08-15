import { rgbToHex, hexToRgb, rgbToHsl, createColorData, getRelativeLuminance, getClosestColorName } from './colorConverter';
import { ExtractedColor } from '../types';

export interface ExtractedPaletteResult {
  dominant: string[];
  vibrant: string[];
  muted: string[];
  dark: string[];
  light: string[];
  all: string[];
}

export function getColorFamily(h: number, s: number, l: number): ExtractedColor['family'] {
  if (s < 12 || l < 10 || l > 92) return 'Neutral';
  if (h >= 345 || h < 15) return 'Red';
  if (h >= 15 && h < 45) return 'Orange';
  if (h >= 45 && h < 70) return 'Yellow';
  if (h >= 70 && h < 165) return 'Green';
  if (h >= 165 && h < 195) return 'Cyan';
  if (h >= 195 && h < 260) return 'Blue';
  if (h >= 260 && h < 315) return 'Purple';
  return 'Pink';
}

export function extractDetailedColorsFromImageData(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  maxColors: number = 48
): ExtractedColor[] {
  if (width === 0 || height === 0) return [];

  // Sample stride
  const sampleStride = Math.max(1, Math.floor(Math.sqrt((width * height) / 16000)));
  const imgData = ctx.getImageData(0, 0, width, height).data;

  let totalSampledPixels = 0;
  const colorFrequency = new Map<string, { r: number; g: number; b: number; count: number }>();

  // Quantize to 5-bit (step of 12 for high fidelity)
  const quantize = (val: number) => Math.round(val / 12) * 12;

  for (let y = 0; y < height; y += sampleStride) {
    for (let x = 0; x < width; x += sampleStride) {
      const idx = (y * width + x) * 4;
      const a = imgData[idx + 3];
      if (a < 128) continue; // ignore transparent

      totalSampledPixels++;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];

      const qr = Math.min(255, quantize(r));
      const qg = Math.min(255, quantize(g));
      const qb = Math.min(255, quantize(b));
      const key = `${qr},${qg},${qb}`;

      const existing = colorFrequency.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorFrequency.set(key, { r: qr, g: qg, b: qb, count: 1 });
      }
    }
  }

  if (totalSampledPixels === 0) return [];

  // Sort by frequency
  const sortedBins = Array.from(colorFrequency.values()).sort((a, b) => b.count - a.count);

  const distinctBins: { r: number; g: number; b: number; count: number }[] = [];
  const minColorDistanceSq = 28 * 28;

  for (const bin of sortedBins) {
    let isDistinct = true;
    for (const existing of distinctBins) {
      const dr = bin.r - existing.r;
      const dg = bin.g - existing.g;
      const db = bin.b - existing.b;
      const distSq = dr * dr + dg * dg + db * db;
      if (distSq < minColorDistanceSq) {
        existing.count += bin.count; // merge frequency into existing
        isDistinct = false;
        break;
      }
    }
    if (isDistinct) {
      distinctBins.push({ ...bin });
      if (distinctBins.length >= maxColors) break;
    }
  }

  return distinctBins.map((bin) => {
    const hex = rgbToHex(bin.r, bin.g, bin.b);
    const hsl = rgbToHsl(bin.r, bin.g, bin.b);
    const luminance = Number(getRelativeLuminance(bin.r, bin.g, bin.b).toFixed(3));
    const name = getClosestColorName(bin.r, bin.g, bin.b);
    const percentage = Number(((bin.count / totalSampledPixels) * 100).toFixed(1));
    const family = getColorFamily(hsl.h, hsl.s, hsl.l);
    const cleanHex = hex.replace('#', '');

    return {
      hex,
      rgb: `${bin.r}, ${bin.g}, ${bin.b}`,
      r: bin.r,
      g: bin.g,
      b: bin.b,
      percentage: Math.max(0.1, percentage),
      count: bin.count,
      name,
      family,
      luminance,
      hue: hsl.h,
      saturation: hsl.s,
      lightness: hsl.l,
      androidCompose: `Color(0xFF${cleanHex})`,
      flutter: `Color(0xFF${cleanHex})`
    };
  });
}

export function extractPaletteFromImageData(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  maxColors: number = 28
): ExtractedPaletteResult {
  if (width === 0 || height === 0) {
    return { dominant: [], vibrant: [], muted: [], dark: [], light: [], all: [] };
  }

  const detailed = extractDetailedColorsFromImageData(ctx, width, height, maxColors);
  const distinctHexes = detailed.map((d) => d.hex);

  const dominant = distinctHexes.slice(0, 7);
  const vibrant: string[] = [];
  const muted: string[] = [];
  const dark: string[] = [];
  const light: string[] = [];

  for (const item of detailed) {
    if (item.saturation >= 45 && item.lightness >= 25 && item.lightness <= 75) {
      vibrant.push(item.hex);
    }
    if (item.saturation < 35 && item.lightness >= 20 && item.lightness <= 80) {
      muted.push(item.hex);
    }
    if (item.lightness < 28) {
      dark.push(item.hex);
    }
    if (item.lightness > 75) {
      light.push(item.hex);
    }
  }

  return {
    dominant: dominant.length > 0 ? dominant : ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE'],
    vibrant: vibrant.slice(0, 7),
    muted: muted.slice(0, 7),
    dark: dark.slice(0, 7),
    light: light.slice(0, 7),
    all: distinctHexes
  };
}

export function generateSvgPaletteSheet(colors: string[], title: string = 'HB Picker — Color Max Palette'): string {
  const swatchWidth = 120;
  const swatchHeight = 160;
  const gap = 16;
  const cols = Math.min(colors.length, 7);
  const rows = Math.ceil(colors.length / cols);
  const totalWidth = cols * swatchWidth + (cols - 1) * gap + 48;
  const totalHeight = rows * swatchHeight + (rows - 1) * gap + 100;

  let swatchesSvg = '';
  colors.forEach((hex, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 24 + col * (swatchWidth + gap);
    const y = 80 + row * (swatchHeight + gap);
    const data = createColorData(hexToRgb(hex).r, hexToRgb(hex).g, hexToRgb(hex).b);

    swatchesSvg += `
      <g transform="translate(${x}, ${y})">
        <rect width="${swatchWidth}" height="${swatchHeight - 50}" rx="14" fill="${hex}" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.4))" />
        <text x="6" y="${swatchHeight - 32}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="13" font-weight="700" fill="#ffffff">${hex}</text>
        <text x="6" y="${swatchHeight - 16}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="10" fill="#8e8e93">${data.name}</text>
        <text x="6" y="${swatchHeight - 2}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="9" fill="#636366">RGB(${data.r}, ${data.g}, ${data.b})</text>
      </g>
    `;
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" style="background-color: #111113; border-radius: 20px;">
      <text x="24" y="44" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="20" font-weight="700" fill="#ffffff">🐇 ${title}</text>
      <text x="24" y="62" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11" fill="#8e8e93">Exported with HB Picker Max • ${new Date().toLocaleDateString()}</text>
      ${swatchesSvg}
    </svg>
  `;
}

