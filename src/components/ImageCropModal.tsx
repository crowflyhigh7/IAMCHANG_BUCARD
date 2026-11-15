import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Check, 
  RotateCw, 
  Crop as CropIcon, 
  Sparkles,
  Move
} from 'lucide-react';
import { CropRect, detectCardBounds, cropImageByRect } from '../utils/imageCrop';

interface ImageCropModalProps {
  isOpen: boolean;
  imageDataUrl: string | null;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string, croppedBase64: string) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageDataUrl,
  onClose,
  onCropComplete,
}) => {
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0.1, y: 0.15, width: 0.8, height: 0.7 });
  const [rotation, setRotation] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null); // 'move', 'nw', 'ne', 'sw', 'se'
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [initialRect, setInitialRect] = useState<CropRect | null>(null);

  // 이미지 로드 시 엣지 디텍션으로 명함 영역 자동 감지
  useEffect(() => {
    if (imageDataUrl && isOpen) {
      setRotation(0);
      const img = new Image();
      img.onload = () => {
        const bounds = detectCardBounds(img);
        setCropRect(bounds);
      };
      img.src = imageDataUrl;
    }
  }, [imageDataUrl, isOpen]);

  if (!isOpen || !imageDataUrl) return null;

  // 90도 회전
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // 터치/마우스 드래그 핸들링
  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
    setStartPos({ x: e.clientX, y: e.clientY });
    setInitialRect({ ...cropRect });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !startPos || !initialRect || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - startPos.x) / rect.width;
    const dy = (e.clientY - startPos.y) / rect.height;

    let next = { ...initialRect };

    if (dragHandle === 'move') {
      next.x = Math.max(0, Math.min(1 - next.width, initialRect.x + dx));
      next.y = Math.max(0, Math.min(1 - next.height, initialRect.y + dy));
    } else if (dragHandle === 'se') {
      next.width = Math.max(0.2, Math.min(1 - next.x, initialRect.width + dx));
      next.height = Math.max(0.15, Math.min(1 - next.y, initialRect.height + dy));
    } else if (dragHandle === 'sw') {
      const newX = Math.max(0, Math.min(initialRect.x + initialRect.width - 0.2, initialRect.x + dx));
      next.width = initialRect.width + (initialRect.x - newX);
      next.x = newX;
      next.height = Math.max(0.15, Math.min(1 - next.y, initialRect.height + dy));
    } else if (dragHandle === 'nw') {
      const newX = Math.max(0, Math.min(initialRect.x + initialRect.width - 0.2, initialRect.x + dx));
      const newY = Math.max(0, Math.min(initialRect.y + initialRect.height - 0.15, initialRect.y + dy));
      next.width = initialRect.width + (initialRect.x - newX);
      next.height = initialRect.height + (initialRect.y - newY);
      next.x = newX;
      next.y = newY;
    } else if (dragHandle === 'ne') {
      const newY = Math.max(0, Math.min(initialRect.y + initialRect.height - 0.15, initialRect.y + dy));
      next.width = Math.max(0.2, Math.min(1 - next.x, initialRect.width + dx));
      next.height = initialRect.height + (initialRect.y - newY);
      next.y = newY;
    }

    setCropRect(next);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragHandle(null);
    setStartPos(null);
    setInitialRect(null);
  };

  // 자르기 실행
  const handleApplyCrop = async () => {
    // 만약 회전이 들어가 있다면 회전된 캔버스를 먼저 생성
    let currentDataUrl = imageDataUrl;
    if (rotation !== 0) {
      currentDataUrl = await rotateDataUrl(imageDataUrl, rotation);
    }

    const { croppedDataUrl, croppedBase64 } = await cropImageByRect(currentDataUrl, cropRect);
    onCropComplete(croppedDataUrl, croppedBase64);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-60 flex flex-col bg-slate-950/90 backdrop-blur-md animate-fade-in touch-none select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-white shrink-0 pt-safe">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <CropIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold">명함 영역 자르기 (Auto-Crop)</h3>
            <p className="text-[11px] text-slate-400">책상 배경을 제외하고 명함 테두리를 맞춰주세요.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRotate}
            title="90도 회전"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Cropping Canvas / Viewport */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden relative">
        <div 
          ref={containerRef}
          className="relative max-w-full max-h-[70vh] flex items-center justify-center shadow-2xl rounded-lg overflow-hidden border border-slate-800"
        >
          {/* Image */}
          <img
            ref={imageRef}
            src={imageDataUrl}
            alt="명함 자르기"
            style={{ transform: `rotate(${rotation}deg)` }}
            className="max-w-full max-h-[70vh] object-contain block pointer-events-none transition-transform duration-200"
          />

          {/* Dark Overlay Outside Crop Area */}
          <div className="absolute inset-0 pointer-events-none bg-black/55" />

          {/* Transparent Crop Box Area */}
          <div
            style={{
              left: `${cropRect.x * 100}%`,
              top: `${cropRect.y * 100}%`,
              width: `${cropRect.width * 100}%`,
              height: `${cropRect.height * 100}%`,
            }}
            className="absolute border-2 border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] cursor-move transition-shadow"
            onPointerDown={(e) => handlePointerDown('move', e)}
          >
            {/* Guide Grid lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
              <div className="border-r border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-b border-white/60" />
              <div className="border-r border-white/60" />
              <div className="border-r border-white/60" />
              <div />
            </div>

            {/* Corner Handles */}
            <div
              className="absolute -top-2.5 -left-2.5 w-6 h-6 bg-cyan-400 rounded-full border-2 border-white shadow-md cursor-nw-resize active:scale-125"
              onPointerDown={(e) => handlePointerDown('nw', e)}
            />
            <div
              className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-cyan-400 rounded-full border-2 border-white shadow-md cursor-ne-resize active:scale-125"
              onPointerDown={(e) => handlePointerDown('ne', e)}
            />
            <div
              className="absolute -bottom-2.5 -left-2.5 w-6 h-6 bg-cyan-400 rounded-full border-2 border-white shadow-md cursor-sw-resize active:scale-125"
              onPointerDown={(e) => handlePointerDown('sw', e)}
            />
            <div
              className="absolute -bottom-2.5 -right-2.5 w-6 h-6 bg-cyan-400 rounded-full border-2 border-white shadow-md cursor-se-resize active:scale-125"
              onPointerDown={(e) => handlePointerDown('se', e)}
            />

            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-sm shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-300" />
                <span>명함 영역</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 max-w-lg mx-auto w-full pb-safe">
        <button
          onClick={onClose}
          className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
        >
          취소
        </button>

        <button
          onClick={handleApplyCrop}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition active:scale-95"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>명함만 오려내기 완료</span>
        </button>
      </div>
    </div>
  );
};

// 회전 유틸
async function rotateDataUrl(sourceDataUrl: string, degrees: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(sourceDataUrl);

      if (degrees === 90 || degrees === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = sourceDataUrl;
  });
}
