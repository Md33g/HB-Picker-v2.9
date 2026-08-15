import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Sparkles, 
  Copy, 
  Check, 
  ArrowUpDown, 
  Bookmark, 
  Share2, 
  Layers, 
  SlidersHorizontal,
  Flame,
  Droplets,
  Sun,
  Moon
} from 'lucide-react';
import { ExtractedColor, ColorData } from '../types';
import { createColorData } from '../utils/colorConverter';
import { triggerHaptic } from '../utils/sound';

interface ExtractedColorsViewProps {
  colors: ExtractedColor[];
  activeColor: ColorData | null;
  onSelectColor: (color: ColorData) => void;
  onSaveColor: (color: ColorData) => void;
  onCopyText: (text: string, label: string) => void;
  onOpenExport: () => void;
}

type SortOption = 'percentage' | 'hue' | 'lightness' | 'saturation';
type FilterCategory = 'All' | 'Warm' | 'Cool' | 'Neutrals' | 'Vibrant' | 'Dark' | 'Light';

export const ExtractedColorsView: React.FC<ExtractedColorsViewProps> = ({
  colors,
  activeColor,
  onSelectColor,
  onSaveColor,
  onCopyText,
  onOpenExport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('All');
  const [sortBy, setSortBy] = useState<SortOption>('percentage');
  const [viewLayout, setViewLayout] = useState<'grid' | 'cards'>('cards');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Available families in current image
  const availableFamilies = useMemo(() => {
    const fams = new Set(colors.map((c) => c.family));
    return ['All', ...Array.from(fams)];
  }, [colors]);

  // Filtered and sorted colors
  const filteredColors = useMemo(() => {
    return colors
      .filter((c) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchHex = c.hex.toLowerCase().includes(q);
          const matchName = c.name.toLowerCase().includes(q);
          const matchFamily = c.family.toLowerCase().includes(q);
          if (!matchHex && !matchName && !matchFamily) return false;
        }

        // Family filter
        if (selectedFamily !== 'All' && c.family !== selectedFamily) {
          return false;
        }

        // Category filter
        if (selectedCategory === 'Warm') {
          return ['Red', 'Orange', 'Yellow', 'Pink'].includes(c.family);
        }
        if (selectedCategory === 'Cool') {
          return ['Green', 'Cyan', 'Blue', 'Purple'].includes(c.family);
        }
        if (selectedCategory === 'Neutrals') {
          return c.family === 'Neutral' || c.saturation < 15;
        }
        if (selectedCategory === 'Vibrant') {
          return c.saturation >= 50 && c.lightness >= 25 && c.lightness <= 75;
        }
        if (selectedCategory === 'Dark') {
          return c.lightness < 30;
        }
        if (selectedCategory === 'Light') {
          return c.lightness > 70;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'percentage') return b.percentage - a.percentage;
        if (sortBy === 'hue') return a.hue - b.hue;
        if (sortBy === 'lightness') return b.lightness - a.lightness;
        if (sortBy === 'saturation') return b.saturation - a.saturation;
        return 0;
      });
  }, [colors, searchQuery, selectedFamily, selectedCategory, sortBy]);

  const handleCopy = (e: React.MouseEvent, text: string, hex: string) => {
    e.stopPropagation();
    onCopyText(text, 'Android Compose Color');
    triggerHaptic('success');
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  const handleCardClick = (c: ExtractedColor) => {
    triggerHaptic('light');
    const colorObj = createColorData(c.r, c.g, c.b);
    onSelectColor(colorObj);
  };

  if (colors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400 bg-zinc-950/80 rounded-3xl border border-zinc-900">
        <Sparkles className="w-10 h-10 mb-3 text-red-500 animate-pulse" />
        <p className="font-bold text-zinc-200">No extracted colors available</p>
        <p className="text-xs text-zinc-500 mt-1">Aim your live camera and tap "Freeze & Extract" or select a photo to extract exact colors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Visual Proportional Distribution Bar */}
      <div className="bg-zinc-950/90 border border-zinc-900 rounded-3xl p-3.5 backdrop-blur-md shadow-xl shadow-black/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
            <Layers className="w-3.5 h-3.5 text-red-500" />
            <span>Color Breakdown & Density</span>
          </div>
          <span className="text-[11px] font-mono text-red-400 font-semibold">{colors.length} extracted tones</span>
        </div>

        {/* Proportional Strip */}
        <div className="h-5 w-full rounded-xl overflow-hidden flex shadow-inner border border-zinc-850">
          {colors.slice(0, 14).map((c, i) => (
            <button
              key={c.hex + i}
              onClick={() => handleCardClick(c)}
              style={{ width: `${Math.max(3, c.percentage)}%`, backgroundColor: c.hex }}
              title={`${c.name} (${c.hex}) - ${c.percentage}%`}
              className="h-full transition-transform hover:scale-105 active:opacity-80 focus:outline-none"
            />
          ))}
        </div>

        {/* Top 4 Dominant chips */}
        <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-0.5 no-scrollbar">
          {colors.slice(0, 4).map((c) => (
            <button
              key={c.hex}
              onClick={() => handleCardClick(c)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 shrink-0 hover:border-zinc-700 active:scale-95 transition-all"
            >
              <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: c.hex }} />
              <span className="font-medium truncate max-w-[80px]">{c.name}</span>
              <span className="font-mono text-red-400 font-bold text-[10px]">{c.percentage}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls & Search */}
      <div className="space-y-2.5">
        {/* Search & Layout toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search extracted colors or hex..."
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/60"
            />
          </div>

          <button
            onClick={() => setViewLayout(viewLayout === 'cards' ? 'grid' : 'cards')}
            className="p-2 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-300 hover:text-white"
            title="Toggle View Mode"
          >
            {viewLayout === 'cards' ? <SlidersHorizontal className="w-4 h-4 text-red-400" /> : <Layers className="w-4 h-4 text-red-400" />}
          </button>
        </div>

        {/* Quick Filter Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {(['All', 'Vibrant', 'Warm', 'Cool', 'Neutrals', 'Dark', 'Light'] as FilterCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                triggerHaptic('light');
                setSelectedCategory(cat);
              }}
              className={`px-3 py-1 rounded-full shrink-0 font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950/60'
                  : 'bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat === 'Warm' && <Flame className="w-3 h-3 inline mr-1 text-red-400" />}
              {cat === 'Cool' && <Droplets className="w-3 h-3 inline mr-1 text-blue-400" />}
              {cat === 'Light' && <Sun className="w-3 h-3 inline mr-1 text-amber-400" />}
              {cat === 'Dark' && <Moon className="w-3 h-3 inline mr-1 text-zinc-400" />}
              {cat}
            </button>
          ))}
        </div>

        {/* Sort & Families row */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {availableFamilies.map((fam) => (
              <button
                key={fam}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedFamily(fam);
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] shrink-0 ${
                  selectedFamily === fam
                    ? 'bg-zinc-800 text-red-400 font-bold border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {fam}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0 bg-zinc-950 border border-zinc-900 rounded-lg px-2 py-1 text-[11px] text-zinc-400">
            <ArrowUpDown className="w-3 h-3 text-red-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="percentage" className="bg-zinc-950 text-zinc-200">Coverage %</option>
              <option value="hue" className="bg-zinc-950 text-zinc-200">Hue</option>
              <option value="lightness" className="bg-zinc-950 text-zinc-200">Brightness</option>
              <option value="saturation" className="bg-zinc-950 text-zinc-200">Vibrancy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Colors List / Grid Display */}
      {viewLayout === 'cards' ? (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {filteredColors.map((c) => {
            const isCurrent = activeColor?.hex.toLowerCase() === c.hex.toLowerCase();
            return (
              <div
                key={c.hex}
                onClick={() => handleCardClick(c)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  isCurrent
                    ? 'bg-zinc-900 border-red-500/80 shadow-lg shadow-red-950/40 ring-1 ring-red-500/40'
                    : 'bg-zinc-950/80 hover:bg-zinc-900/90 border-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl border border-white/20 shadow-md shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white truncate">{c.name}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{c.hex}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                      <span className="font-mono text-red-400 font-bold">{c.percentage}% coverage</span>
                      <span>•</span>
                      <span>{c.family}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => handleCopy(e, c.androidCompose, c.hex)}
                    title="Copy Jetpack Compose"
                    className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-red-400 flex items-center gap-1 active:scale-95"
                  >
                    {copiedHex === c.hex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Compose</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const colorObj = createColorData(c.r, c.g, c.b);
                      onSaveColor(colorObj);
                    }}
                    title="Bookmark Color"
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-red-400 active:scale-95"
                  >
                    <Bookmark className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-[380px] overflow-y-auto pr-1">
          {filteredColors.map((c) => {
            const isCurrent = activeColor?.hex.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex}
                onClick={() => handleCardClick(c)}
                className={`p-2 rounded-2xl border transition-all flex flex-col items-center text-center gap-1.5 select-none ${
                  isCurrent
                    ? 'bg-zinc-900 border-red-500 shadow-md ring-1 ring-red-500/50'
                    : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-xl border border-white/20 shadow-md"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="text-[10px] font-bold text-white truncate max-w-full">{c.name}</span>
                <span className="text-[9px] font-mono text-red-400">{c.percentage}%</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Export Action */}
      <button
        onClick={onOpenExport}
        className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg"
      >
        <Share2 className="w-3.5 h-3.5 text-red-500" />
        <span>Export Extracted Colors</span>
      </button>
    </div>
  );
};
