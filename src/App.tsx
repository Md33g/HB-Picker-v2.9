import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ViewportCanvas } from './components/ViewportCanvas';
import { InspectorPanel } from './components/InspectorPanel';
import { PaletteSection } from './components/PaletteSection';
import { ColorHistory } from './components/ColorHistory';
import { ExtractedColorsView } from './components/ExtractedColorsView';
import { Toast } from './components/Toast';
import { ExportModal } from './components/ExportModal';
import { ColorData, ColorHistoryItem, ExtractedColor } from './types';
import { createColorData, hexToRgb } from './utils/colorConverter';
import { extractPaletteFromImageData, extractDetailedColorsFromImageData, ExtractedPaletteResult } from './utils/paletteExtractor';
import { playCopyChime, playTickSound, triggerHaptic } from './utils/sound';
import { Eye, Layers, Sparkles, Bookmark, Flame } from 'lucide-react';

export default function App() {
  // Active Color State - Default: Pure Red #FF0000 with Saturation 100% and Lightness 50%
  const [activeColor, setActiveColor] = useState<ColorData>(() => createColorData(255, 0, 0));
  
  // Live Camera state
  const [isLiveCamera, setIsLiveCamera] = useState<boolean>(false);

  // Mobile navigation active tab
  const [mobileTab, setMobileTab] = useState<'inspector' | 'extracted' | 'palette' | 'history'>('inspector');

  // Image & Canvas state
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Extracted Colors & Palette State
  const [extractedColors, setExtractedColors] = useState<ExtractedColor[]>([]);
  const [extractedPalette, setExtractedPalette] = useState<ExtractedPaletteResult>({
    dominant: ['#FF0000', '#FF3B30', '#DC2626', '#B91C1C', '#FF9500', '#FFCC00', '#34C759'],
    vibrant: ['#FF0000', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6'],
    muted: ['#71717A', '#52525B', '#3F3F46', '#27272A', '#18181B'],
    dark: ['#09090B', '#18181B', '#27272A'],
    light: ['#FAFAFA', '#F4F4F5', '#E4E4E7'],
    all: ['#FF0000', '#FF3B30', '#DC2626', '#B91C1C', '#FF9500', '#FFCC00', '#34C759']
  });
  const [isPaletteLoading, setIsPaletteLoading] = useState(false);

  // History & Bookmarks State
  const [history, setHistory] = useState<ColorHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('hb_picker_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Modal & Toast States
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportColors, setExportColors] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState(true);

  // Native EyeDropper support check
  const hasNativeEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem('hb_picker_history', JSON.stringify(history.slice(0, 40)));
    } catch {}
  }, [history]);

  // Toast Helper with single timeout debounce
  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  }, []);

  // Handle color pick from canvas / loupe / live stream
  const handleColorPick = useCallback((r: number, g: number, b: number, a: number = 1) => {
    const data = createColorData(r, g, b, a);
    setActiveColor(data);
  }, []);

  // Save color to history list
  const handleSaveColor = useCallback((colorToSave: ColorData) => {
    setHistory((prev) => {
      if (prev.some((item) => item.hex.toLowerCase() === colorToSave.hex.toLowerCase())) {
        showToast(`${colorToSave.name} (${colorToSave.hex}) is already saved`);
        return prev;
      }
      const newItem: ColorHistoryItem = {
        id: `${colorToSave.hex}-${Date.now()}`,
        hex: colorToSave.hex,
        rgb: colorToSave.rgb,
        name: colorToSave.name,
        timestamp: Date.now(),
        isPinned: false
      };
      playTickSound();
      triggerHaptic('medium');
      showToast(`Saved ${colorToSave.name} (${colorToSave.hex})`);
      return [newItem, ...prev].slice(0, 40);
    });
  }, [showToast]);

  // Add pressed diamond color to diamond swatches
  const handleAddDiamondColor = useCallback((hex: string) => {
    setExtractedPalette((prev) => {
      if (prev.dominant.includes(hex)) return prev;
      return {
        ...prev,
        dominant: [hex, ...prev.dominant].slice(0, 28),
        all: [hex, ...prev.all].slice(0, 48)
      };
    });
  }, []);

  const handleTogglePin = useCallback((id: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isPinned: !item.isPinned } : item))
    );
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory((prev) => prev.filter((item) => item.isPinned));
    playTickSound();
    triggerHaptic('medium');
    showToast('Cleared unpinned history');
  }, [showToast]);

  // Extract both individual colors and palettes from current canvas
  const handleExtractPalette = useCallback((silent: boolean = false) => {
    const canvas = document.getElementById('imageCanvas') as HTMLCanvasElement | null;
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      if (!silent) showToast('Please select a photo or freeze a camera frame first');
      return;
    }

    setIsPaletteLoading(true);
    // Execute extraction in a microtask/timeout to allow UI to render spinner
    setTimeout(() => {
      try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          // Extract granular individual colors
          const detailedColors = extractDetailedColorsFromImageData(ctx, canvas.width, canvas.height, 48);
          setExtractedColors(detailedColors);

          // Extract palette groupings
          const result = extractPaletteFromImageData(ctx, canvas.width, canvas.height, 28);
          setExtractedPalette(result);

          if (!silent) {
            playCopyChime();
            triggerHaptic('success');
            showToast(`Extracted ${detailedColors.length} colors & harmonies`);
          }
        }
      } catch (err) {
        console.error('Extraction error:', err);
      } finally {
        setIsPaletteLoading(false);
      }
    }, 40);
  }, [showToast]);

  // Callback when a static image finishes loading
  const handleImageLoaded = useCallback(() => {
    handleExtractPalette(true);
  }, [handleExtractPalette]);

  // Handle capture frame from live camera and extract
  const handleCaptureFrameAndExtract = useCallback((dataUrl: string) => {
    setIsLiveCamera(false);
    setImageSrc(dataUrl);
    setMobileTab('extracted');
    playCopyChime();
    triggerHaptic('success');
    showToast('Snapshot captured & colors extracted');
  }, [showToast]);

  // Load a file from Gallery
  const handleSelectFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setIsLiveCamera(false);
        setImageSrc(result);
        playTickSound();
        triggerHaptic('medium');
        showToast('Image loaded into workspace');
      }
    };
    reader.readAsDataURL(file);
  }, [showToast]);

  // Native EyeDropper execution
  const handleNativeEyeDropper = useCallback(async () => {
    if (!hasNativeEyeDropper) return;
    try {
      // @ts-ignore - EyeDropper API
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        const { r, g, b } = hexToRgb(result.sRGBHex);
        const data = createColorData(r, g, b);
        setActiveColor(data);
        handleSaveColor(data);
        playCopyChime();
        triggerHaptic('success');
        showToast(`Picked ${data.name} (${result.sRGBHex})`);
      }
    } catch {
      // User cancelled picker
    }
  }, [hasNativeEyeDropper, handleSaveColor, showToast]);

  // Reset workspace
  const handleReset = useCallback(() => {
    setIsLiveCamera(false);
    setImageSrc(null);
    const defaultColor = createColorData(255, 0, 0);
    setActiveColor(defaultColor);
    setExtractedColors([]);
    setExtractedPalette({
      dominant: ['#FF0000', '#FF3B30', '#DC2626', '#B91C1C', '#FF9500', '#FFCC00', '#34C759'],
      vibrant: ['#FF0000', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6'],
      muted: ['#71717A', '#52525B', '#3F3F46', '#27272A', '#18181B'],
      dark: ['#09090B', '#18181B', '#27272A'],
      light: ['#FAFAFA', '#F4F4F5', '#E4E4E7'],
      all: ['#FF0000', '#FF3B30', '#DC2626', '#B91C1C', '#FF9500', '#FFCC00', '#34C759']
    });
    playTickSound();
    triggerHaptic('medium');
    showToast('Workspace reset');
  }, [showToast]);

  // Open export suite
  const handleOpenExport = useCallback((colors?: string[]) => {
    if (colors && colors.length > 0) {
      setExportColors(colors);
    } else if (extractedColors.length > 0) {
      setExportColors(extractedColors.map(c => c.hex));
    } else {
      setExportColors(extractedPalette.dominant);
    }
    triggerHaptic('light');
    setIsExportOpen(true);
  }, [extractedColors, extractedPalette]);

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-start p-2.5 sm:p-4 selection:bg-red-600/30 selection:text-white pb-24">
      {/* Background ambient lighting in Red and Deep Black */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[550px] h-[350px] rounded-full blur-[140px] opacity-25 transition-colors duration-700"
          style={{ backgroundColor: activeColor.hex }}
        />
        <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-red-950/20 rounded-full blur-[140px]" />
      </div>

      {/* Main App Shell Container */}
      <main className="relative z-10 w-full max-w-[430px] flex flex-col gap-3.5">
        {/* Navigation Header */}
        <Navbar
          onNativeEyeDropper={handleNativeEyeDropper}
          hasNativeEyeDropper={hasNativeEyeDropper}
          onReset={handleReset}
          onSelectFile={handleSelectFile}
          soundOn={soundOn}
          setSoundOn={setSoundOn}
          isLiveCamera={isLiveCamera}
          onToggleLiveCamera={() => setIsLiveCamera((prev) => !prev)}
        />

        {/* Interactive Viewport Canvas with Live Color Picker, Image Auto-Fit & Diamond Pick */}
        <ViewportCanvas
          imageSrc={imageSrc}
          onColorPick={handleColorPick}
          onImageLoaded={handleImageLoaded}
          onSelectFile={handleSelectFile}
          isLiveCamera={isLiveCamera}
          setIsLiveCamera={setIsLiveCamera}
          onSaveLiveColor={() => handleSaveColor(activeColor)}
          onCaptureFrameAndExtract={handleCaptureFrameAndExtract}
          onAddDiamondColor={handleAddDiamondColor}
        />

        {/* Red & Black Segmented Tab Bar */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950/90 backdrop-blur-md rounded-2xl border border-zinc-900 shadow-xl shadow-black">
          <button
            onClick={() => {
              triggerHaptic('light');
              setMobileTab('inspector');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              mobileTab === 'inspector'
                ? 'bg-zinc-900 text-red-400 shadow-md border border-red-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Inspector</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setMobileTab('extracted');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${
              mobileTab === 'extracted'
                ? 'bg-zinc-900 text-red-400 shadow-md border border-red-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <Layers className="w-4 h-4 mb-0.5" />
              {extractedColors.length > 0 && (
                <span className="absolute -top-1 -right-2.5 px-1 py-0.2 rounded-full bg-red-600 text-[8px] font-bold text-white leading-tight shadow-sm">
                  {extractedColors.length}
                </span>
              )}
            </div>
            <span className="text-[10px]">Colors</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setMobileTab('palette');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              mobileTab === 'palette'
                ? 'bg-zinc-900 text-red-400 shadow-md border border-red-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Palettes</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setMobileTab('history');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${
              mobileTab === 'history'
                ? 'bg-zinc-900 text-red-400 shadow-md border border-red-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <Bookmark className="w-4 h-4 mb-0.5" />
              {history.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-red-600 text-[8px] font-bold text-white leading-tight shadow-sm">
                  {history.length}
                </span>
              )}
            </div>
            <span className="text-[10px]">Saved</span>
          </button>
        </div>

        {/* Tab Content Display */}
        {mobileTab === 'inspector' && (
          <InspectorPanel
            color={activeColor}
            onUpdateColor={setActiveColor}
            onExtractPalette={() => {
              handleExtractPalette();
              setMobileTab('extracted');
            }}
            onSaveColor={handleSaveColor}
            onShowToast={showToast}
            isPaletteLoading={isPaletteLoading}
          />
        )}

        {mobileTab === 'extracted' && (
          <ExtractedColorsView
            colors={extractedColors}
            activeColor={activeColor}
            onSelectColor={setActiveColor}
            onSaveColor={handleSaveColor}
            onCopyText={(text, label) => {
              navigator.clipboard.writeText(text);
              playCopyChime();
              showToast(`Copied ${label}`);
            }}
            onOpenExport={() => handleOpenExport()}
          />
        )}

        {mobileTab === 'palette' && (
          <PaletteSection
            extracted={extractedPalette}
            activeColor={activeColor}
            onSelectColor={setActiveColor}
            onOpenExport={handleOpenExport}
            onShowToast={showToast}
          />
        )}

        {mobileTab === 'history' && (
          <ColorHistory
            history={history}
            onSelectColor={setActiveColor}
            onTogglePin={handleTogglePin}
            onClearHistory={handleClearHistory}
            onShowToast={showToast}
          />
        )}

        {/* Red & Black Footer */}
        <footer className="text-center text-[10px] text-zinc-500 tracking-widest uppercase font-semibold py-3 select-none flex items-center justify-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-red-500" />
          <span>HB Picker • Live Color Engine</span>
        </footer>
      </main>

      {/* Export Theme / Code Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        colors={exportColors.length > 0 ? exportColors : extractedPalette.dominant}
        onShowToast={showToast}
      />

      <Toast message={toastMessage} />
    </div>
  );
}
