import React from 'react';
import { History, Pin, Trash2, Bookmark, Check, Copy, Flame } from 'lucide-react';
import { ColorHistoryItem, ColorData } from '../types';
import { hexToRgb, createColorData } from '../utils/colorConverter';
import { playTickSound, playCopyChime, triggerHaptic } from '../utils/sound';

interface ColorHistoryProps {
  history: ColorHistoryItem[];
  onSelectColor: (color: ColorData) => void;
  onTogglePin: (id: string) => void;
  onClearHistory: () => void;
  onShowToast: (msg: string) => void;
}

export const ColorHistory: React.FC<ColorHistoryProps> = ({
  history,
  onSelectColor,
  onTogglePin,
  onClearHistory,
  onShowToast,
}) => {
  if (history.length === 0) return null;

  const handleSelect = (item: ColorHistoryItem) => {
    const { r, g, b } = hexToRgb(item.hex);
    const data = createColorData(r, g, b);
    onSelectColor(data);
    playTickSound();
    triggerHaptic('light');
    onShowToast(`Loaded ${item.name} (${item.hex})`);
  };

  const handleCopyAll = () => {
    const composeCodes = history
      .map((h) => `val ${h.name.replace(/[^a-zA-Z0-9]/g, '')} = Color(0xFF${h.hex.replace('#', '')})`)
      .join('\n');
    navigator.clipboard.writeText(composeCodes);
    playCopyChime();
    triggerHaptic('success');
    onShowToast('Copied all colors as Android Compose definitions');
  };

  return (
    <div className="w-full bg-zinc-950/95 backdrop-blur-2xl border border-zinc-900 rounded-3xl p-3.5 flex flex-col gap-2.5 shadow-2xl shadow-black/80 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-3.5 h-3.5 text-red-500" />
          <h4 className="font-bold text-xs text-white tracking-tight">Saved & Bookmarks</h4>
          <span className="text-[10px] font-mono text-zinc-500">({history.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyAll}
            title="Copy All Colors (Android Compose)"
            className="text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-95"
          >
            Copy Compose
          </button>
          <button
            onClick={() => {
              triggerHaptic('medium');
              onClearHistory();
            }}
            title="Clear Unpinned History"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-red-400 transition-colors cursor-pointer hover:bg-zinc-900 border border-transparent hover:border-zinc-850 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-1 pr-1 no-scrollbar">
        {history.map((item) => (
          <div
            key={item.id}
            onClick={() => handleSelect(item)}
            className="group relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-750 transition-all cursor-pointer shrink-0 active:scale-98"
          >
            <div
              className="w-4 h-4 rounded-full border border-white/30 shrink-0 shadow-sm"
              style={{ backgroundColor: item.hex }}
            />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-white leading-tight truncate max-w-[70px]">
                {item.name}
              </span>
              <span className="text-[9px] font-mono text-zinc-400 leading-tight">{item.hex}</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(item.id);
                playTickSound();
                triggerHaptic('light');
              }}
              className={`p-1 rounded-md transition-colors ${
                item.isPinned ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Pin className={`w-3 h-3 ${item.isPinned ? 'fill-red-500' : ''}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
