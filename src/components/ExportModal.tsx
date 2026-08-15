import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Download, Palette, Smartphone, Flame } from 'lucide-react';
import { generateSvgPaletteSheet } from '../utils/paletteExtractor';
import { createColorData, hexToRgb } from '../utils/colorConverter';
import { triggerHaptic, playCopyChime } from '../utils/sound';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: string[];
  onShowToast: (msg: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, colors, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'flutter' | 'css' | 'tailwind' | 'json' | 'svg'>('compose');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const validColors = colors.length > 0 ? colors : ['#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D', '#450A0A'];

  const getExportCode = () => {
    switch (activeTab) {
      case 'compose': {
        const entries = validColors.map((hex, i) => {
          const { r, g, b } = hexToRgb(hex);
          const data = createColorData(r, g, b);
          const varName = data.name.replace(/[^a-zA-Z0-9]/g, '');
          return `    val ${varName || `Color${i + 1}`} = Color(0xFF${hex.replace('#', '').toUpperCase()})`;
        });
        return `package com.app.ui.theme\n\nimport androidx.compose.ui.graphics.Color\n\nobject AppThemeColors {\n${entries.join('\n')}\n}`;
      }
      case 'flutter': {
        const entries = validColors.map((hex, i) => {
          const { r, g, b } = hexToRgb(hex);
          const data = createColorData(r, g, b);
          const varName = data.name.replace(/[^a-zA-Z0-9]/g, '').replace(/^[A-Z]/, (c) => c.toLowerCase());
          return `  static const Color ${varName || `color${i + 1}`} = Color(0xFF${hex.replace('#', '').toUpperCase()});`;
        });
        return `import 'package:flutter/material.dart';\n\nclass AppColors {\n${entries.join('\n')}\n}`;
      }
      case 'css': {
        const lines = validColors.map((hex, i) => {
          const { r, g, b } = hexToRgb(hex);
          const data = createColorData(r, g, b);
          const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return `  --color-${slug || `shade-${i + 1}`}: ${hex};`;
        });
        return `:root {\n${lines.join('\n')}\n}`;
      }
      case 'tailwind': {
        const entries = validColors.map((hex, i) => {
          const { r, g, b } = hexToRgb(hex);
          const data = createColorData(r, g, b);
          const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return `      '${slug || `shade-${i + 1}`}': '${hex}',`;
        });
        return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${entries.join('\n')}\n      }\n    }\n  }\n};`;
      }
      case 'json': {
        const list = validColors.map((hex, i) => {
          const { r, g, b } = hexToRgb(hex);
          const data = createColorData(r, g, b);
          return {
            id: i + 1,
            name: data.name,
            hex: data.hex,
            rgb: data.rgb,
            hsl: data.hsl,
            androidCompose: data.androidCompose,
            flutter: data.flutter,
            contrastOnWhite: data.contrastWhite,
            contrastOnBlack: data.contrastBlack,
          };
        });
        return JSON.stringify({ paletteName: 'HB Live Color Theme', colors: list }, null, 2);
      }
      case 'svg': {
        return generateSvgPaletteSheet(validColors);
      }
      default:
        return '';
    }
  };

  const currentCode = getExportCode();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    playCopyChime();
    triggerHaptic('success');
    onShowToast('Export code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    const svgStr = generateSvgPaletteSheet(validColors);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hb-color-palette-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerHaptic('success');
    onShowToast('Downloaded SVG swatch card');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-3xl p-4 shadow-2xl shadow-black overflow-hidden flex flex-col gap-3.5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-950/60 border border-red-800/60 text-red-500 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Export Palette & Code</h3>
                <p className="text-[11px] text-zinc-400">{validColors.length} colors prepared</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Color Preview Swatch Strip */}
          <div className="flex items-center gap-1.5 p-1.5 bg-black/60 rounded-2xl border border-zinc-900 overflow-x-auto no-scrollbar">
            {validColors.map((hex, i) => (
              <div
                key={hex + i}
                className="w-7 h-7 rounded-xl border border-white/20 shrink-0 shadow-sm"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-6 gap-1 p-1 bg-black/50 rounded-xl border border-zinc-900 text-center">
            {[
              { id: 'compose', label: 'Compose' },
              { id: 'flutter', label: 'Flutter' },
              { id: 'css', label: 'CSS' },
              { id: 'tailwind', label: 'Tailwind' },
              { id: 'json', label: 'JSON' },
              { id: 'svg', label: 'SVG' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(tab.id as any);
                }}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all truncate cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Code Viewer Container */}
          <div className="relative w-full h-48 bg-black/90 rounded-2xl border border-zinc-900 p-3 overflow-y-auto font-mono text-xs text-zinc-300 select-text leading-relaxed">
            <pre className="whitespace-pre">{currentCode}</pre>
          </div>

          {/* Action Footer */}
          <div className="flex items-center gap-2 pt-1">
            {activeTab === 'svg' ? (
              <button
                onClick={handleDownloadSvg}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-950/60 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download SVG Card</span>
              </button>
            ) : (
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-950/60 active:scale-95 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Code Snippet'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs active:scale-95 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
