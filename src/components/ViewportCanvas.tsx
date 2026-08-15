import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Lock, 
  Unlock, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Grid, 
  Video, 
  VideoOff, 
  SwitchCamera, 
  Sparkles, 
  BookmarkPlus, 
  ImagePlus,
  AlertCircle,
  Gem
} from 'lucide-react';
import { SampleRadius } from '../types';
import { playLockSound, playTickSound, triggerHaptic, playCopyChime } from '../utils/sound';

interface ViewportCanvasProps {
  imageSrc: string | null;
  onColorPick: (r: number, g: number, b: number, a?: number) => void;
  onImageLoaded: (width: number, height: number) => void;
  onSelectFile: (file: File) => void;
  isLiveCamera: boolean;
  setIsLiveCamera: (val: boolean) => void;
  onSaveLiveColor: () => void;
  onCaptureFrameAndExtract: (dataUrl: string) => void;
  onAddDiamondColor?: (hex: string) => void;
}

export const ViewportCanvas: React.FC<ViewportCanvasProps> = ({
  imageSrc,
  onColorPick,
  onImageLoaded,
  onSelectFile,
  isLiveCamera,
  setIsLiveCamera,
  onSaveLiveColor,
  onCaptureFrameAndExtract,
  onAddDiamondColor,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const loupeContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const lastLoadedSrcRef = useRef<string | null>(null);

  // Live Camera state
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastSampleTimeRef = useRef<number>(0);
  const lastSampledHexRef = useRef<string>('');

  // Diamond Pick Mode Toggle ("color i press on the image gives it to me in the diamond shape thing")
  const [diamondSyncMode, setDiamondSyncMode] = useState<boolean>(true);
  const [diamondRipple, setDiamondRipple] = useState<{ x: number; y: number; color: string } | null>(null);

  // Live Center Color state
  const [centerColor, setCenterColor] = useState<{ hex: string; rgb: string; r: number; g: number; b: number }>({
    hex: '#FF0000',
    rgb: '255, 0, 0',
    r: 255,
    g: 0,
    b: 0,
  });

  // Pan & Zoom state (for static image mode)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  // Loupe & Sampling options (for static image mode)
  const [showLoupe, setShowLoupe] = useState(false);
  const [loupePos, setLoupePos] = useState({ x: 0, y: 0 });
  const [flipLoupeDown, setFlipLoupeDown] = useState(false);
  const [hoverColor, setHoverColor] = useState<{ hex: string; rgb: string } | null>(null);
  const [sampleRadius, setSampleRadius] = useState<SampleRadius>(1);
  const [showGrid, setShowGrid] = useState(true);

  // Touch tracking
  const initialTouchDist = useRef<number | null>(null);
  const lastTouchTime = useRef<number>(0);
  const touchMoved = useRef<boolean>(false);

  // Stop camera helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start camera stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported in this environment.');
      }

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!stream) {
        throw new Error('Could not initialize video stream.');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      const msg =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err?.name === 'NotFoundError'
          ? 'No camera device found on this system.'
          : 'Unable to access camera. You can choose a photo instead.';
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, [facingMode, stopCameraStream]);

  // Handle live camera toggle
  useEffect(() => {
    if (isLiveCamera) {
      startCameraStream();
    } else {
      stopCameraStream();
      setCameraError(null);
    }

    return () => {
      stopCameraStream();
    };
  }, [isLiveCamera, startCameraStream, stopCameraStream]);

  // Live frame processing loop (Sample Middle of Crosshair at ~12fps)
  useEffect(() => {
    if (!isLiveCamera || !isCameraActive) return;

    let isRunning = true;
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 1;
    sampleCanvas.height = 1;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

    const processLiveFrame = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      const now = performance.now();

      if (video && video.readyState >= 2 && sampleCtx && now - lastSampleTimeRef.current > 80) {
        lastSampleTimeRef.current = now;

        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        const cx = Math.floor(vw / 2);
        const cy = Math.floor(vh / 2);

        sampleCtx.drawImage(video, cx, cy, 1, 1, 0, 0, 1, 1);
        const pixel = sampleCtx.getImageData(0, 0, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        const a = pixel[3] / 255;

        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();

        if (hex !== lastSampledHexRef.current) {
          lastSampledHexRef.current = hex;
          setCenterColor({
            hex,
            rgb: `${r}, ${g}, ${b}`,
            r,
            g,
            b,
          });
          onColorPick(r, g, b, a);
        }
      }

      animFrameRef.current = requestAnimationFrame(processLiveFrame);
    };

    animFrameRef.current = requestAnimationFrame(processLiveFrame);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isLiveCamera, isCameraActive, onColorPick]);

  // Load and draw static image onto canvas (Always fits canvas perfectly)
  useEffect(() => {
    if (isLiveCamera || !imageSrc) return;
    if (lastLoadedSrcRef.current === imageSrc) return;

    lastLoadedSrcRef.current = imageSrc;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      onImageLoaded(canvas.width, canvas.height);

      // Auto-sample center pixel
      const cx = Math.floor(canvas.width / 2);
      const cy = Math.floor(canvas.height / 2);
      const pixel = ctx.getImageData(cx, cy, 1, 1).data;
      onColorPick(pixel[0], pixel[1], pixel[2], pixel[3] / 255);

      // Reset transform so image always fits cleanly
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, isLiveCamera, onColorPick, onImageLoaded]);

  // Capture current frame from Live Camera and extract
  const handleCaptureLiveFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = video.videoWidth || 640;
    snapCanvas.height = video.videoHeight || 480;
    const snapCtx = snapCanvas.getContext('2d', { willReadFrequently: true });
    if (!snapCtx) return;

    snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
    const dataUrl = snapCanvas.toDataURL('image/png');

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = snapCanvas.width;
      canvas.height = snapCanvas.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(snapCanvas, 0, 0);
      }
    }

    stopCameraStream();
    setIsLiveCamera(false);
    onCaptureFrameAndExtract(dataUrl);
  }, [onCaptureFrameAndExtract, setIsLiveCamera, stopCameraStream]);

  // Flip camera between front & back
  const handleToggleFacingMode = useCallback(() => {
    triggerHaptic('medium');
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  // Sample pixel or averaged region on static image
  const samplePixelAt = useCallback(
    (canvasX: number, canvasY: number): [number, number, number, number] | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      const x = Math.floor(canvasX);
      const y = Math.floor(canvasY);
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return null;

      if (sampleRadius === 1) {
        const p = ctx.getImageData(x, y, 1, 1).data;
        return [p[0], p[1], p[2], p[3]];
      }

      // Averaged region sampling
      const offset = sampleRadius === 3 ? 1 : 2;
      const startX = Math.max(0, x - offset);
      const startY = Math.max(0, y - offset);
      const endX = Math.min(canvas.width - 1, x + offset);
      const endY = Math.min(canvas.height - 1, y + offset);
      const w = endX - startX + 1;
      const h = endY - startY + 1;

      const imgData = ctx.getImageData(startX, startY, w, h).data;
      let totalR = 0, totalG = 0, totalB = 0, totalA = 0, count = 0;

      for (let i = 0; i < imgData.length; i += 4) {
        totalR += imgData[i];
        totalG += imgData[i + 1];
        totalB += imgData[i + 2];
        totalA += imgData[i + 3];
        count++;
      }

      return [
        Math.round(totalR / count),
        Math.round(totalG / count),
        Math.round(totalB / count),
        Math.round(totalA / count),
      ];
    },
    [sampleRadius]
  );

  // Trigger diamond shape pick on press/tap
  const handleDirectPressColor = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      if (
        clientX < canvasRect.left ||
        clientX > canvasRect.right ||
        clientY < canvasRect.top ||
        clientY > canvasRect.bottom
      ) {
        return;
      }

      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;
      const canvasX = (clientX - canvasRect.left) * scaleX;
      const canvasY = (clientY - canvasRect.top) * scaleY;

      const sampled = samplePixelAt(canvasX, canvasY);
      if (sampled) {
        const hex = `#${sampled[0].toString(16).padStart(2, '0')}${sampled[1].toString(16).padStart(2, '0')}${sampled[2].toString(16).padStart(2, '0')}`.toUpperCase();
        
        // Update active color (fills the diamond shape immediately)
        onColorPick(sampled[0], sampled[1], sampled[2], sampled[3] / 255);

        if (diamondSyncMode && onAddDiamondColor) {
          onAddDiamondColor(hex);
        }

        // Diamond visual ripple effect
        setDiamondRipple({
          x: clientX - containerRect.left,
          y: clientY - containerRect.top,
          color: hex,
        });
        setTimeout(() => setDiamondRipple(null), 600);

        playCopyChime();
        triggerHaptic('medium');
      }
    },
    [diamondSyncMode, onAddDiamondColor, onColorPick, samplePixelAt]
  );

  // Update Magnifier Loupe for static image mode
  const updateLoupe = useCallback(
    (clientX: number, clientY: number) => {
      if (isLiveCamera) return;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const loupeCanvas = loupeCanvasRef.current;
      if (!canvas || !container || !loupeCanvas || !imageSrc) return;

      const containerRect = container.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      if (
        clientX < canvasRect.left ||
        clientX > canvasRect.right ||
        clientY < canvasRect.top ||
        clientY > canvasRect.bottom
      ) {
        setShowLoupe(false);
        return;
      }

      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;
      const canvasX = (clientX - canvasRect.left) * scaleX;
      const canvasY = (clientY - canvasRect.top) * scaleY;

      if (canvasX < 0 || canvasX >= canvas.width || canvasY < 0 || canvasY >= canvas.height) {
        setShowLoupe(false);
        return;
      }

      setShowLoupe(true);
      const relX = clientX - containerRect.left;
      const relY = clientY - containerRect.top;

      setFlipLoupeDown(relY < 130);
      setLoupePos({ x: relX, y: relY });

      const sampled = samplePixelAt(canvasX, canvasY);
      if (sampled) {
        const hex = `#${sampled[0].toString(16).padStart(2, '0')}${sampled[1].toString(16).padStart(2, '0')}${sampled[2].toString(16).padStart(2, '0')}`.toUpperCase();
        setHoverColor({
          hex,
          rgb: `${sampled[0]}, ${sampled[1]}, ${sampled[2]}`,
        });
        onColorPick(sampled[0], sampled[1], sampled[2], sampled[3] / 255);
      }

      const loupeCtx = loupeCanvas.getContext('2d');
      if (!loupeCtx) return;

      const size = 110;
      loupeCanvas.width = size;
      loupeCanvas.height = size;
      loupeCtx.imageSmoothingEnabled = false;

      const sampleSpan = Math.max(3, Math.floor(14 / Math.sqrt(zoom)));
      const srcX = Math.max(0, canvasX - sampleSpan);
      const srcY = Math.max(0, canvasY - sampleSpan);
      const srcW = Math.min(canvas.width - srcX, sampleSpan * 2);
      const srcH = Math.min(canvas.height - srcY, sampleSpan * 2);

      loupeCtx.clearRect(0, 0, size, size);
      loupeCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, size, size);

      if (showGrid) {
        loupeCtx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        loupeCtx.lineWidth = 0.5;
        const gridStep = size / (sampleSpan * 2);
        for (let i = 0; i <= size; i += gridStep) {
          loupeCtx.beginPath();
          loupeCtx.moveTo(i, 0);
          loupeCtx.lineTo(i, size);
          loupeCtx.stroke();

          loupeCtx.beginPath();
          loupeCtx.moveTo(0, i);
          loupeCtx.lineTo(size, i);
          loupeCtx.stroke();
        }
      }
    },
    [isLiveCamera, imageSrc, zoom, showGrid, samplePixelAt, onColorPick]
  );

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    if (isLiveCamera || !imageSrc || isLocked) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.2 : 0.83;
    setZoom((prev) => {
      const next = Math.min(Math.max(prev * factor, 1), 32);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLiveCamera || !imageSrc || isLocked) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLiveCamera) return;
    if (isDragging && !isLocked) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
    updateLoupe(e.clientX, e.clientY);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
    }
    if (!isLiveCamera && imageSrc) {
      handleDirectPressColor(e.clientX, e.clientY);
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setShowLoupe(false);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLiveCamera || !imageSrc) return;
    touchMoved.current = false;

    const now = Date.now();
    if (now - lastTouchTime.current < 300 && e.touches.length === 1) {
      triggerHaptic('medium');
      setZoom((prev) => (prev > 1.5 ? 1 : 2.5));
      if (zoom > 1.5) setPan({ x: 0, y: 0 });
      lastTouchTime.current = 0;
      return;
    }
    lastTouchTime.current = now;

    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
      updateLoupe(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      setShowLoupe(false);
      initialTouchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isLiveCamera || !imageSrc) return;
    touchMoved.current = true;
    if (e.touches.length === 1) {
      if (isDragging && !isLocked) {
        setPan({
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y,
        });
      }
      updateLoupe(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2 && initialTouchDist.current) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / initialTouchDist.current;
      setZoom((prev) => Math.min(Math.max(prev * (factor * 0.15 + 0.85), 1), 32));
      initialTouchDist.current = currentDist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) initialTouchDist.current = null;
    if (e.touches.length === 0) {
      setIsDragging(false);
      setShowLoupe(false);
      // If it was a clean tap without heavy drag, trigger diamond pick
      if (!touchMoved.current && e.changedTouches && e.changedTouches[0]) {
        handleDirectPressColor(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    }
  };

  // Drag and drop file support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setIsLiveCamera(false);
      onSelectFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      ref={containerRef}
      id="viewportCard"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full h-[290px] sm:h-[320px] bg-black rounded-3xl overflow-hidden border transition-all select-none touch-none ${
        isLiveCamera
          ? 'border-red-600 shadow-[0_0_35px_rgba(239,68,68,0.35)] ring-2 ring-red-600/40'
          : isDragOver
          ? 'border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.4)] ring-2 ring-red-500/50'
          : 'border-zinc-900 shadow-2xl shadow-black'
      } flex items-center justify-center`}
    >
      {/* Active Live Video Element (Smooth hardware rendering) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 pointer-events-none ${
          isLiveCamera && isCameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Hidden file input for Photo Gallery */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            triggerHaptic('success');
            setIsLiveCamera(false);
            onSelectFile(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* Camera Error Message Display */}
      {cameraError && isLiveCamera && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center z-30 bg-black/95 gap-3 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-800 text-red-500 flex items-center justify-center shadow-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1 max-w-xs">
            <span className="text-sm font-bold text-white">Camera Notice</span>
            <span className="text-xs text-zinc-400 leading-relaxed">{cameraError}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => {
                triggerHaptic('medium');
                startCameraStream();
              }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-lg shadow-red-950/50"
            >
              Retry Camera
            </button>
            <button
              onClick={() => {
                setIsLiveCamera(false);
                galleryInputRef.current?.click();
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
            >
              Choose Photo
            </button>
          </div>
        </div>
      )}

      {/* Empty State / Welcome Dropzone */}
      {!imageSrc && !isLiveCamera && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center z-20 gap-3 bg-zinc-950">
          <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-900/60 flex items-center justify-center text-red-500 shadow-xl shadow-red-950/50">
            <Video className="w-7 h-7 stroke-[2]" />
          </div>
          <div className="flex flex-col gap-1 max-w-xs">
            <span className="text-sm font-black text-white tracking-tight">Live Color Picker</span>
            <span className="text-xs text-zinc-400 leading-relaxed">
              Aim camera to sample live colors, or load a photo to inspect in high precision
            </span>
          </div>

          <div className="flex items-center gap-2.5 mt-2">
            <button
              id="start-live-picker-btn"
              onClick={() => {
                triggerHaptic('medium');
                setIsLiveCamera(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/80 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Start Live Picker</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                galleryInputRef.current?.click();
              }}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <ImagePlus className="w-4 h-4 text-red-400" />
              <span>Choose Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* Canvas Viewport (Draws static image - ALWAYS FITS VIEWPORT PERFECTLY) */}
      {!isLiveCamera && imageSrc && (
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: isLocked ? 'crosshair' : isDragging ? 'grabbing' : 'crosshair',
          }}
          className="w-full h-full flex items-center justify-center transition-transform duration-75 origin-center pointer-events-auto p-2"
        >
          <canvas
            ref={canvasRef}
            id="imageCanvas"
            className="max-w-full max-h-full object-contain pointer-events-none rounded-xl shadow-lg shadow-black/80"
          />
        </div>
      )}

      {/* Hidden static canvas when live camera is capturing */}
      {isLiveCamera && (
        <canvas
          ref={canvasRef}
          id="imageCanvas"
          className="hidden pointer-events-none"
        />
      )}

      {/* Animated Diamond Touch Ripple Feedback */}
      {diamondRipple && (
        <div
          style={{
            left: `${diamondRipple.x}px`,
            top: `${diamondRipple.y}px`,
          }}
          className="absolute z-40 pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center justify-center animate-out fade-out zoom-out-150 duration-500"
        >
          <div
            className="w-8 h-8 rounded-md transform rotate-45 border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.8)]"
            style={{ backgroundColor: diamondRipple.color }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIVE CAMERA MODE: PRECISION MIDDLE CROSSHAIR & REAL-TIME SAMPLING HUD */}
      {/* ========================================================================= */}
      {isLiveCamera && !cameraError && (
        <>
          {/* Top Live Status Indicator Bar */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-30 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-red-600/50 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[11px] font-black text-red-400 tracking-wider">LIVE PICKER</span>
              <span className="text-zinc-600">|</span>
              <span className="text-[10px] text-zinc-300 font-mono">Center Aim</span>
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                onClick={handleToggleFacingMode}
                title="Switch Camera (Front / Back)"
                className="p-2 rounded-xl bg-black/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-lg"
              >
                <SwitchCamera className="w-4 h-4 text-red-400" />
              </button>
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setIsLiveCamera(false);
                }}
                title="Close Live Camera"
                className="p-2 rounded-xl bg-black/80 hover:bg-red-950/50 border border-zinc-800 text-zinc-300 hover:text-red-400 transition-all active:scale-95 cursor-pointer shadow-lg"
              >
                <VideoOff className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* EXACT CENTER CROSSHAIR RETICLE OVERLAY */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            {/* Live Color Pill floating directly above Center Crosshair */}
            <div className="absolute mb-24 px-3 py-1 rounded-full bg-black/90 backdrop-blur-xl border border-red-500/80 shadow-2xl flex items-center gap-2 animate-in fade-in duration-100">
              <span
                className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: centerColor.hex }}
              />
              <span className="text-xs font-mono font-black text-white tracking-wider">
                {centerColor.hex}
              </span>
            </div>

            {/* Precision Crosshair Target */}
            <div className="relative flex items-center justify-center">
              {/* Outer Pulsing Reticle Ring with dynamic color border */}
              <div
                className="w-16 h-16 rounded-full border-2 border-dashed border-red-500/80 transition-all duration-75"
                style={{
                  boxShadow: `0 0 20px ${centerColor.hex}80, inset 0 0 10px ${centerColor.hex}40`,
                }}
              />

              {/* Inner Solid Target Ring */}
              <div
                className="absolute w-7 h-7 rounded-full border-2 border-white shadow-[0_0_8px_rgba(0,0,0,0.9)] transition-colors"
                style={{ backgroundColor: `${centerColor.hex}33` }}
              />

              {/* Center 1px Crosshair lines */}
              <div className="absolute w-12 h-[1.5px] bg-red-500/90 shadow-[0_0_3px_#000]" />
              <div className="absolute h-12 w-[1.5px] bg-red-500/90 shadow-[0_0_3px_#000]" />

              {/* Center exact sampling point */}
              <div
                className="absolute w-2 h-2 rounded-full border border-black shadow-[0_0_4px_#fff]"
                style={{ backgroundColor: centerColor.hex }}
              />
            </div>
          </div>

          {/* Live Action Bar (Bottom of Viewport) */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-30 pointer-events-auto">
            {/* Quick Bookmark / Save Color */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                onSaveLiveColor();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-900/95 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-semibold shadow-xl active:scale-95 transition-all cursor-pointer"
            >
              <BookmarkPlus className="w-4 h-4 text-red-500" />
              <span>Save Color</span>
            </button>

            {/* Freeze & Extract Palette Button */}
            <button
              onClick={handleCaptureLiveFrame}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-2xl shadow-red-950/80 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Freeze & Extract</span>
            </button>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* STATIC IMAGE MODE: LOUPE MAGNIFIER & HUD CONTROLS */}
      {/* ========================================================================= */}
      {!isLiveCamera && imageSrc && (
        <>
          {/* Floating Magnifier Loupe with Mobile Touch Offset */}
          {showLoupe && (
            <div
              ref={loupeContainerRef}
              id="magnifier-loupe"
              style={{
                left: `${loupePos.x}px`,
                top: `${loupePos.y}px`,
                transform: flipLoupeDown ? 'translate(-50%, 25%)' : 'translate(-50%, -125%)',
              }}
              className="absolute pointer-events-none z-40 flex flex-col items-center animate-in fade-in zoom-in-95 duration-100"
            >
              {hoverColor && !flipLoupeDown && (
                <div className="mb-1.5 px-2.5 py-0.5 rounded-full bg-black/90 backdrop-blur-md border border-red-600/60 text-[11px] font-mono font-bold text-white shadow-xl flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-white/50" style={{ backgroundColor: hoverColor.hex }} />
                  {hoverColor.hex}
                </div>
              )}

              <div className="w-[110px] h-[110px] rounded-full border-[3px] border-red-500 bg-black shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(239,68,68,0.4)] overflow-hidden relative backdrop-blur-sm">
                <canvas ref={loupeCanvasRef} id="magnifier-canvas" className="w-full h-full" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4 h-4 rounded-full border-[1.5px] border-white shadow-[0_0_4px_rgba(0,0,0,0.9)]" />
                  <div className="absolute w-[1px] h-7 bg-white/70" />
                  <div className="absolute h-[1px] w-7 bg-white/70" />
                </div>
              </div>

              {hoverColor && flipLoupeDown && (
                <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-black/90 backdrop-blur-md border border-red-600/60 text-[11px] font-mono font-bold text-white shadow-xl flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-white/50" style={{ backgroundColor: hoverColor.hex }} />
                  {hoverColor.hex}
                </div>
              )}
            </div>
          )}

          {/* Viewport Control HUD */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 z-30 bg-zinc-950/90 backdrop-blur-xl border border-zinc-900 p-1 rounded-2xl shadow-2xl">
            {/* Diamond Pick Mode Toggle Button ("color i press on the image gives it to me in the diamond shape thing") */}
            <button
              onClick={() => {
                const next = !diamondSyncMode;
                setDiamondSyncMode(next);
                playTickSound();
                triggerHaptic('medium');
              }}
              title={diamondSyncMode ? 'Diamond Sync: ON (Tap image fills diamond shape)' : 'Diamond Sync: OFF'}
              className={`h-7 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                diamondSyncMode
                  ? 'bg-red-600 border border-red-500 text-white shadow-md shadow-red-950/60'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              <Gem className="w-3.5 h-3.5 text-white" />
              <span>Diamond Pick</span>
            </button>

            {/* Start Live Camera switch */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                setIsLiveCamera(true);
              }}
              title="Switch to Live Color Picker"
              className="h-7 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-red-400 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <Video className="w-3 h-3" />
              <span>Live</span>
            </button>

            {/* Sampling Radius Selector */}
            <button
              onClick={() => {
                const next: SampleRadius = sampleRadius === 1 ? 3 : sampleRadius === 3 ? 5 : 1;
                setSampleRadius(next);
                playTickSound();
                triggerHaptic('light');
              }}
              title={`Sampling Radius: ${sampleRadius}x${sampleRadius}`}
              className="h-7 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono font-bold text-zinc-300 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
            >
              {sampleRadius}x{sampleRadius}
            </button>

            {/* Pixel Grid Toggle */}
            <button
              onClick={() => {
                setShowGrid(!showGrid);
                playTickSound();
                triggerHaptic('light');
              }}
              title={showGrid ? 'Hide Grid' : 'Show Grid'}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                showGrid ? 'bg-red-600/20 border border-red-500/40 text-red-400' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>

            {/* Position Lock Button */}
            <button
              id="lockBtn"
              onClick={() => {
                const next = !isLocked;
                setIsLocked(next);
                playLockSound(next);
                triggerHaptic('medium');
              }}
              title={isLocked ? 'Unlock Canvas' : 'Lock Canvas'}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isLocked
                  ? 'bg-red-600 border border-red-500 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            {/* Zoom In */}
            <button
              id="zoomInBtn"
              onClick={() => {
                playTickSound();
                triggerHaptic('light');
                setZoom((prev) => Math.min(prev * 1.4, 32));
              }}
              title="Zoom In"
              className="w-7 h-7 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Zoom Out */}
            <button
              id="zoomOutBtn"
              onClick={() => {
                playTickSound();
                triggerHaptic('light');
                setZoom((prev) => {
                  const next = Math.max(prev / 1.4, 1);
                  if (next === 1) setPan({ x: 0, y: 0 });
                  return next;
                });
              }}
              title="Zoom Out"
              className="w-7 h-7 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Reset Zoom & Fit */}
            <button
              id="zoomResetBtn"
              onClick={() => {
                playTickSound();
                triggerHaptic('light');
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              title="Fit to Screen"
              className="w-7 h-7 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
