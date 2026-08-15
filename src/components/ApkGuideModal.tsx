import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  WifiOff, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';
import { triggerHaptic, playCopyChime, playTickSound } from '../utils/sound';
import { promptPwaInstall, subscribeToInstallPrompt, isAppInstalled } from '../utils/pwa';

interface ApkGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const ApkGuideModal: React.FC<ApkGuideModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'install' | 'apk' | 'offline'>('install');

  useEffect(() => {
    setInstalled(isAppInstalled());
    const unsubscribe = subscribeToInstallPrompt((canPrompt) => {
      setCanInstall(canPrompt);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    triggerHaptic('medium');
    const accepted = await promptPwaInstall();
    if (accepted) {
      playCopyChime();
      onShowToast('Installing HB Picker on Android...');
      setInstalled(true);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    playCopyChime();
    triggerHaptic('light');
    setCopiedSection(label);
    onShowToast(`Copied ${label}`);
    setTimeout(() => setCopiedSection(null), 1800);
  };

  const capacitorConfig = `{
  "appId": "com.hbpicker.colormax",
  "appName": "HB Picker",
  "webDir": "dist",
  "bundledWebRuntime": false
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="apkGuideModal"
        className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-3xl p-5 shadow-2xl shadow-black flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-950/70 border border-red-800/80 flex items-center justify-center text-red-400 shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white tracking-tight flex items-center gap-1.5">
                <span>Android APK & Offline</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-600 text-white font-bold">100% OFFLINE</span>
              </h2>
              <p className="text-xs text-zinc-400">Install as native Android WebAPK or standalone APK</p>
            </div>
          </div>

          <button
            onClick={() => {
              playTickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-black/80 rounded-2xl border border-zinc-900">
          <button
            onClick={() => {
              setActiveTab('install');
              playTickSound();
            }}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'install'
                ? 'bg-zinc-900 text-red-400 border border-red-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            1-Click Install
          </button>
          <button
            onClick={() => {
              setActiveTab('apk');
              playTickSound();
            }}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'apk'
                ? 'bg-zinc-900 text-red-400 border border-red-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Build .APK
          </button>
          <button
            onClick={() => {
              setActiveTab('offline');
              playTickSound();
            }}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'offline'
                ? 'bg-zinc-900 text-red-400 border border-red-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Offline Specs
          </button>
        </div>

        {/* Tab 1: 1-Click Android Install (WebAPK) */}
        {activeTab === 'install' && (
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-white">Instant Android WebAPK</span>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Android turns this app into a standalone native application with full offline caching, its own app icon in your app drawer, and full-screen camera access.
                  </p>
                </div>
              </div>

              {installed ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Already Installed & Running in Standalone Mode!</span>
                </div>
              ) : canInstall ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-red-950/80 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install HB Picker on Android</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/60 border border-zinc-800 text-xs text-zinc-300">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-red-400" />
                    How to Install on Android Chrome:
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-300 pl-1">
                    <li>Open this URL in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong> on Android.</li>
                    <li>Tap the <strong>⋮ (three dots menu)</strong> at the top right.</li>
                    <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                    <li>Android will automatically generate and install the native WebAPK!</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Offline Capability Card */}
            <div className="p-3.5 rounded-2xl bg-black/60 border border-zinc-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-red-400">
                  <WifiOff className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Offline Service Worker</span>
                  <span className="text-[11px] text-zinc-400">Cached on device • No WiFi/Data needed</span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Build Standalone .APK */}
        {activeTab === 'apk' && (
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-600/20 text-red-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">Method 1: PWABuilder (Fastest .APK)</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                PWABuilder packages this live PWA into a signed standalone Android <code className="text-red-400 font-mono">.apk</code> / <code className="text-red-400 font-mono">.aab</code> package for direct sideloading or Google Play Store deployment.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href="https://www.pwabuilder.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Open PWABuilder.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/60 border border-zinc-850 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-red-400" />
                  Method 2: Capacitor / Android Studio
                </span>
                <button
                  onClick={() => copyText(capacitorConfig, 'Capacitor Config')}
                  className="text-[10px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  {copiedSection === 'Capacitor Config' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSection === 'Capacitor Config' ? 'Copied' : 'Copy Config'}</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">
                To build an offline native APK locally with Android Studio:
              </p>
              <pre className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-[10px] font-mono text-zinc-300 overflow-x-auto">
{`npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "HB Picker" "com.hbpicker.colormax"
npm run build
npx cap add android
npx cap open android`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: Offline Architecture Specs */}
        {activeTab === 'offline' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">100% Client-Side & Zero Internet Required</span>
              </div>
              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Live Camera Color Engine</strong>: Uses hardware-accelerated HTML5 Web Video & 2D Canvas buffer locally.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Loupe & Pixel Magnifier</strong>: Real-time math interpolation on canvas without external API calls.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Granular Palette Extractor</strong>: Median-Cut color quantization algorithm running 100% in browser memory.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Web Audio Synthesizer</strong>: Dynamic sine-wave chimes generated natively by Web Audio API.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Local Storage Cache</strong>: Color history and bookmarks persisted on device storage.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
          <span className="text-[11px] text-zinc-500">Android PWA / WebAPK Ready</span>
          <button
            onClick={() => {
              playTickSound();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
