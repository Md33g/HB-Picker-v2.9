import React, { useState } from 'react';
import { Copy, Check, Sparkles, BookmarkPlus, Sliders, Smartphone } from 'lucide-react';
import { ColorData } from '../types';
import { playCopyChime, playTickSound, triggerHaptic } from '../utils/sound';
import { hexToRgb, rgbToHsl, hslToRgb, createColorData } from '../utils/colorConverter';

interface InspectorPanelProps {
  color: ColorData;
  onUpdateColor: (color: ColorData) => void;
  onExtractPalette: () => void;
  onSaveColor: (color: ColorData) => void;
  onShowToast: (msg: string) => void;
  isPaletteLoading: boolean;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  color,
  onUpdateColor,
  onExtractPalette,
  onSaveColor,
  onShowToast,
  isPaletteLoading,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showTuner, setShowTuner] = useState(true);

  const copyValue = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    playCopyChime();
    triggerHaptic('success');
    setCopiedKey(label);
    onShowToast(`Copied ${label}: ${value}`);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Fine tuner adjustment with default S=100% and L=50%
  const handleTunerChange = (type: 'h' | 's' | 'l' | 'a', val: number) => {
    const rgb = hexToRgb(color.hex);
    const currentHsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    let newH = currentHsl.h;
    let newS = currentHsl.s;
    let newL = currentHsl.l;
    let newA = color.a ?? 1;

    if (type === 'h') {
      newH = val;
      // Default to 100% saturation and 50% lightness if currently near neutral or zero
      if (newS === 0) newS = 100;
      if (newL === 0 || newL === 100) newL = 50;
    } else if (type === 's') {
      newS = val;
    } else if (type === 'l') {
      newL = val;
    } else if (type === 'a') {
      newA = val / 100;
    }

    const newRgb = hslToRgb(newH, newS, newL);
    const updated = createColorData(newRgb.r, newRgb.g, newRgb.b, newA);
    onUpdateColor(updated);
  };

  const hsl = rgbToHsl(color.r, color.g, color.b);

  const pillFormats = [
    { label: 'Android Compose', value: color.androidCompose, isPrimary: true },
    { label: 'HEX', value: color.hex, isPrimary: true },
    { label: 'RGB', value: color.rgb },
    { label: 'Flutter', value: color.flutter, isPrimary: true },
    { label: 'RGBA', value: color.rgba },
    { label: 'HSL', value: color.hsl },
    { label: 'OKLCH', value: color.oklch },
    { label: 'Tailwind', value: color.tailwind },
    { label: 'CSS Var', value: color.cssVar },
  ];

  return (
    <div className="w-full bg-zinc-950/95 backdrop-blur-2xl border border-zinc-900 rounded-3xl p-3.5 flex flex-col gap-3.5 shadow-2xl shadow-black/80 shrink-0">
      {/* Top Row: Diamond Swatch & Color Specs */}
      <div className="flex items-center gap-3.5">
        {/* Diamond Shape Main Color Box */}
        <div className="relative group p-2 shrink-0 select-none">
          <div
            id="colorBox"
            onClick={() => copyValue(color.hex, 'HEX')}
            title="Tap to copy HEX"
            style={{
              backgroundColor: color.rgba,
              boxShadow: `0 8px 24px ${color.hex}55`,
            }}
            className="w-14 h-14 rounded-2xl border-2 border-white/40 cursor-pointer transform rotate-45 transition-transform duration-200 group-hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden"
          >
            <div className="transform -rotate-45 opacity-0 group-hover:opacity-100 transition-opacity text-white drop-shadow-md">
              <Copy className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Color Identity & WCAG Contrast Metrics */}
        <div className="flex flex-col flex-grow min-w-0 gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <h3 className="font-bold text-sm text-white tracking-tight truncate">{color.name}</h3>
              <span className="text-[10px] font-mono text-red-400 font-semibold px-1.5 py-0.5 rounded-md bg-red-950/40 border border-red-900/60">
                {color.hex}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  setShowTuner(!showTuner);
                  playTickSound();
                  triggerHaptic('light');
                }}
                title="Toggle Color Sliders (Hue / Sat / Light)"
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  showTuner
                    ? 'bg-red-600/30 border-red-500/50 text-red-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onSaveColor(color);
                }}
                title="Bookmark to Saved History"
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-red-400 transition-all active:scale-95 cursor-pointer"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* WCAG Accessibility Badges */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 border border-zinc-850 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="text-zinc-500">on White:</span>
              <span className="font-bold font-mono">{color.contrastWhite}:1</span>
              <span
                className={`font-semibold ml-0.5 ${
                  color.wcagWhite === 'AAA'
                    ? 'text-emerald-400'
                    : color.wcagWhite === 'AA'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {color.wcagWhite}
              </span>
            </div>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 border border-zinc-850 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-black border border-zinc-600" />
              <span className="text-zinc-500">on Black:</span>
              <span className="font-bold font-mono">{color.contrastBlack}:1</span>
              <span
                className={`font-semibold ml-0.5 ${
                  color.wcagBlack === 'AAA'
                    ? 'text-emerald-400'
                    : color.wcagBlack === 'AA'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {color.wcagBlack}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* HSL Fine-Tuner Sliders with Full 360° Vibrant Rainbow Spectrum */}
      {showTuner && (
        <div className="p-3 rounded-2xl bg-black/70 border border-zinc-850 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Hue Rainbow Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
              <span className="flex items-center gap-1">
                <span>Hue Spectrum</span>
                <span className="text-zinc-500 font-mono text-[10px]">({hsl.h}°)</span>
              </span>
              <span
                className="w-3 h-3 rounded-full border border-white/50"
                style={{ backgroundColor: `hsl(${hsl.h}, 100%, 50%)` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={hsl.h}
              onChange={(e) => handleTunerChange('h', Number(e.target.value))}
              style={{
                background:
                  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
              }}
              className="w-full"
            />
          </div>

          {/* Saturation Slider (Default 100%) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
              <span className="flex items-center gap-1">
                <span>Saturation</span>
                <span className="text-zinc-500 font-mono text-[10px]">({hsl.s}%)</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400">{hsl.s}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={hsl.s}
              onChange={(e) => handleTunerChange('s', Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, hsl(${hsl.h}, 0%, ${hsl.l}%), hsl(${hsl.h}, 100%, ${hsl.l}%))`,
              }}
              className="w-full"
            />
          </div>

          {/* Lightness Slider (Default 50%) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
              <span className="flex items-center gap-1">
                <span>Lightness</span>
                <span className="text-zinc-500 font-mono text-[10px]">({hsl.l}%)</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400">{hsl.l}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={hsl.l}
              onChange={(e) => handleTunerChange('l', Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, #000000 0%, hsl(${hsl.h}, ${hsl.s}%, 50%) 50%, #ffffff 100%)`,
              }}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Multi-Format Pill Container */}
      <div
        id="colorDetailsContainer"
        className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1"
      >
        {pillFormats.map((item) => (
          <button
            key={item.label}
            onClick={() => copyValue(item.value, item.label)}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all text-left group cursor-pointer active:scale-98 ${
              item.isPrimary
                ? 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 shadow-sm'
                : 'bg-zinc-950/60 hover:bg-zinc-900 border-zinc-900'
            }`}
          >
            <span className={`text-[11px] font-semibold ${item.isPrimary ? 'text-red-400' : 'text-zinc-400'} group-hover:text-white`}>
              {item.label}
            </span>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[11px] font-mono font-medium text-zinc-200 truncate">
                {item.value}
              </span>
              {copiedKey === item.label ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 shrink-0 transition-colors" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          id="extractColors"
          onClick={() => {
            triggerHaptic('medium');
            onExtractPalette();
          }}
          disabled={isPaletteLoading}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs shadow-lg shadow-red-950/60 transition-all cursor-pointer disabled:opacity-60 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isPaletteLoading ? 'Extracting...' : 'Extract Palettes'}</span>
        </button>

        <button
          onClick={() => copyValue(color.androidCompose, 'Android Compose')}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold text-xs transition-all cursor-pointer active:scale-95"
        >
          <Smartphone className="w-3.5 h-3.5 text-red-400" />
          <span>Copy Compose</span>
        </button>
      </div>
    </div>
  );
};
