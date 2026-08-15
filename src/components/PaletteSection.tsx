import React, { useState } from 'react';
import { Share2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ExtractedPaletteResult } from '../utils/paletteExtractor';
import { getHarmonies, hexToRgb, createColorData } from '../utils/colorConverter';
import { ColorData } from '../types';
import { playTickSound, triggerHaptic } from '../utils/sound';

interface PaletteSectionProps {
  extracted: ExtractedPaletteResult;
  activeColor: ColorData;
  onSelectColor: (color: ColorData) => void;
  onOpenExport: (colors: string[]) => void;
  onShowToast: (msg: string) => void;
}

export const PaletteSection: React.FC<PaletteSectionProps> = ({
  extracted,
  activeColor,
  onSelectColor,
  onOpenExport,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'dominant' | 'vibrant' | 'harmonies' | 'muted' | 'all'>('dominant');
  const [isExpanded, setIsExpanded] = useState(false);

  const harmonies = getHarmonies(activeColor.hex);

  const getCurrentPaletteColors = (): string[] => {
    switch (activeTab) {
      case 'dominant':
        return extracted.dominant.length > 0 ? extracted.dominant : harmonies.monochromatic;
      case 'vibrant':
        return extracted.vibrant.length > 0 ? extracted.vibrant : harmonies.triadic;
      case 'harmonies':
        return [
          ...harmonies.complementary,
          ...harmonies.analogous,
          ...harmonies.triadic,
          ...harmonies.monochromatic,
        ].filter((v, i, a) => a.indexOf(v) === i);
      case 'muted':
        return extracted.muted.length > 0 ? extracted.muted : harmonies.monochromatic;
      case 'all':
        return extracted.all.length > 0 ? extracted.all : extracted.dominant;
      default:
        return extracted.dominant;
    }
  };

  const currentColors = getCurrentPaletteColors();
  const visibleColors = isExpanded ? currentColors : currentColors.slice(0, 14);

  const handleTileClick = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const data = createColorData(r, g, b);
    onSelectColor(data);
    playTickSound();
    triggerHaptic('light');
    onShowToast(`Selected ${data.name} (${hex})`);
  };

  return (
    <div className="w-full bg-zinc-950/95 backdrop-blur-2xl border border-zinc-900 rounded-3xl p-3.5 flex flex-col gap-3 shadow-2xl shadow-black/80 shrink-0">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-950/60 border border-red-800/60 text-red-500 flex items-center justify-center shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h4 className="font-bold text-xs text-white tracking-tight">Palettes & Harmonies</h4>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenExport(currentColors);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
        >
          <Share2 className="w-3 h-3 text-red-500" />
          <span>Export</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-black/60 rounded-xl border border-zinc-900 overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'dominant', label: 'Dominant' },
            { id: 'vibrant', label: 'Vibrant' },
            { id: 'harmonies', label: 'Harmonies' },
            { id: 'muted', label: 'Muted' },
            { id: 'all', label: 'All' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              playTickSound();
              triggerHaptic('light');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap active:scale-95 ${
              activeTab === tab.id
                ? 'bg-red-600 text-white shadow-md shadow-red-950/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Diamond Swatch Grid (7 Columns) */}
      <div
        id="paletteContainer"
        className="grid grid-cols-7 gap-2 p-2.5 bg-black/50 rounded-2xl border border-zinc-900/90 items-center justify-items-center"
      >
        {visibleColors.map((hex, index) => {
          const isSelected = activeColor.hex.toLowerCase() === hex.toLowerCase();
          return (
            <div
              key={`${hex}-${index}`}
              onClick={() => handleTileClick(hex)}
              title={hex}
              style={{
                backgroundColor: hex,
                boxShadow: isSelected ? `0 0 16px ${hex}` : undefined,
              }}
              className={`w-8 h-8 rounded-lg cursor-pointer transform rotate-45 transition-all duration-200 hover:scale-115 active:scale-90 select-none ${
                isSelected
                  ? 'ring-2 ring-white border-2 border-black z-10 scale-110'
                  : 'border border-white/30 hover:border-white/80'
              }`}
            />
          );
        })}
      </div>

      {/* Expand / Collapse Button if more than 14 colors */}
      {currentColors.length > 14 && (
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            playTickSound();
            triggerHaptic('light');
          }}
          className="w-full py-1 text-[11px] font-semibold text-zinc-400 hover:text-red-400 flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? 'Show Less' : `View All (${currentColors.length})`}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
};
