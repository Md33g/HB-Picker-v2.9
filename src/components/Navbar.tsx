import React, { useRef } from 'react';
import { Volume2, VolumeX, Video, ImagePlus, Pipette, RotateCcw, Flame, Smartphone } from 'lucide-react';
import { setSoundEnabled, playTickSound, triggerHaptic } from '../utils/sound';

interface NavbarProps {
  onNativeEyeDropper?: () => void;
  hasNativeEyeDropper: boolean;
  onReset: () => void;
  soundOn: boolean;
  setSoundOn: (val: boolean) => void;
  onSelectFile: (file: File) => void;
  isLiveCamera: boolean;
  onToggleLiveCamera: () => void;
  onOpenApkGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNativeEyeDropper,
  hasNativeEyeDropper,
  onReset,
  soundOn,
  setSoundOn,
  onSelectFile,
  isLiveCamera,
  onToggleLiveCamera,
  onOpenApkGuide,
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    triggerHaptic('medium');
    if (next) playTickSound();
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic('success');
      onSelectFile(file);
    }
    e.target.value = '';
  };

  return (
    <header className="w-full flex items-center justify-between px-3.5 py-2.5 bg-zinc-950/90 backdrop-blur-2xl border border-zinc-900 rounded-2xl shadow-2xl shadow-black/80 shrink-0">
      {/* Hidden file input for Photo Gallery */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryChange}
      />

      {/* Brand & Red/Black Badge */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center justify-center text-sm shadow-md select-none text-red-500 shadow-red-950/40">
          <Flame className="w-4 h-4 fill-red-500/20" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm tracking-tight text-white select-none">HB Picker</span>
            <span className="text-[9px] font-extrabold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-red-600/20 text-red-400 border border-red-500/30">
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Action Utility Controls */}
      <div className="flex items-center gap-1.5">
        {/* Live Camera Picker Toggle */}
        <button
          id="nav-live-camera-btn"
          onClick={() => {
            triggerHaptic('medium');
            onToggleLiveCamera();
          }}
          title={isLiveCamera ? 'Stop Live Camera' : 'Start Live Color Picker'}
          className={`flex items-center gap-1.5 px-2.5 h-8 rounded-xl border transition-all text-xs font-semibold cursor-pointer active:scale-95 ${
            isLiveCamera
              ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/60 animate-pulse'
              : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-red-400 hover:text-red-300'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold">{isLiveCamera ? 'Live ON' : 'Live Picker'}</span>
        </button>

        {/* APK / Offline Install Button */}
        <button
          id="nav-apk-btn"
          onClick={() => {
            triggerHaptic('medium');
            onOpenApkGuide();
          }}
          title="Install APK & Offline Mode"
          className="w-8 h-8 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 flex items-center justify-center text-red-400 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <Smartphone className="w-4 h-4" />
        </button>

        {/* Gallery Pick Button */}
        <button
          id="nav-gallery-btn"
          onClick={() => {
            triggerHaptic('light');
            galleryInputRef.current?.click();
          }}
          title="Pick Image from Gallery"
          className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
        >
          <ImagePlus className="w-4 h-4 text-zinc-300" />
        </button>

        {hasNativeEyeDropper && (
          <button
            id="nav-native-eyedropper"
            onClick={onNativeEyeDropper}
            title="Screen Color Dropper"
            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-red-400 transition-all cursor-pointer active:scale-95"
          >
            <Pipette className="w-4 h-4" />
          </button>
        )}

        <button
          id="nav-sound-toggle"
          onClick={toggleSound}
          title={soundOn ? 'Sound & Haptics Enabled' : 'Muted'}
          className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
        >
          {soundOn ? <Volume2 className="w-4 h-4 text-red-500" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
        </button>

        <button
          id="nav-reset-btn"
          onClick={() => {
            triggerHaptic('medium');
            onReset();
          }}
          title="Reset Workspace"
          className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-red-950/40 hover:border-red-800/60 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};


