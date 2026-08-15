// PWA and Offline Support Helper

let deferredInstallPrompt: any = null;
const installListeners = new Set<(canInstall: boolean) => void>();

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.log('[PWA] Service Worker registration failed:', error);
        });
    });

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      deferredInstallPrompt = e;
      notifyInstallListeners(true);
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      notifyInstallListeners(false);
      console.log('[PWA] App installed successfully');
    });
  }
}

export function subscribeToInstallPrompt(callback: (canInstall: boolean) => void): () => void {
  installListeners.add(callback);
  callback(deferredInstallPrompt !== null);
  return () => {
    installListeners.delete(callback);
  };
}

function notifyInstallListeners(canInstall: boolean) {
  installListeners.forEach((cb) => cb(canInstall));
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) {
    return false;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  notifyInstallListeners(false);
  return outcome === 'accepted';
}

export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}
