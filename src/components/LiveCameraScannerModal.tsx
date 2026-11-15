import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Camera, 
  Sparkles, 
  Check, 
  RotateCcw,
  Zap,
  ZapOff,
  AlertCircle,
  Loader2,
  Scan
} from 'lucide-react';
import { CropRect } from '../utils/imageCrop';

interface LiveCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, guideCropRect?: CropRect) => void;
  onFallbackToFile: () => void;
  onFallbackToNativeCamera?: () => void;
}

export const LiveCameraScannerModal: React.FC<LiveCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFile,
  onFallbackToNativeCamera,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideBoxRef = useRef<HTMLDivElement>(null);

  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Auto-capture states
  const [focusState, setFocusState] = useState<'searching' | 'focusing' | 'locked'>('searching');
  const [alignProgress, setAlignProgress] = useState(0); // 0 to 100%
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Debug metric display for instant troubleshooting
  const [debugMetric, setDebugMetric] = useState<string>('');

  // Tap-to-focus animation state
  const [focusRing, setFocusRing] = useState<{ x: number; y: number } | null>(null);

  // Tracking refs
  const animFrameId = useRef<number | null>(null);
  const lastCheckTime = useRef<number>(0);
  const stabilityRef = useRef<number>(0); // 0.0 to 1.0 (smooth accumulator)
  const prevFrameLumRef = useRef<Float32Array | null>(null);

  // 1. 카메라 시작 (연속 자동 초점 focusMode: continuous 적용)
  const startCamera = useCallback(async () => {
    try {
      setIsLoadingCamera(true);
      setPermissionError(null);

      // 이미 활성 스트림이 있다면 재사용
      if (streamRef.current && streamRef.current.active) {
        setIsLoadingCamera(false);
        setHasPermission(true);
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('이 브라우저는 웹 실시간 카메라 스트리밍을 지원하지 않습니다.');
      }

      let mediaStream: MediaStream | null = null;

      // 1차: 후면 카메라 + 고해상도(1080p ideal)
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (e1) {
        console.warn('Primary camera constraints failed, trying fallback 1:', e1);
        try {
          // 2차: 단순 후면 카메라
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
        } catch (e2) {
          console.warn('Fallback 1 failed, trying fallback 2 (any video):', e2);
          // 3차: 기본 비디오
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!mediaStream) {
        throw new Error('카메라 스트림을 획득할 수 없습니다.');
      }

      streamRef.current = mediaStream;
      setHasPermission(true);

      const video = videoRef.current;
      if (video) {
        video.srcObject = mediaStream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        try {
          await video.play();
          setIsLoadingCamera(false);
        } catch (playErr) {
          console.warn('Direct video.play failed, waiting for metadata:', playErr);
          video.onloadedmetadata = () => {
            video.play().then(() => setIsLoadingCamera(false)).catch(console.warn);
          };
        }
      }

      // 비디오 트랙 고급 제어 (플래시 확인 & 연속 자동초점 모드 활성화)
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = (videoTrack.getCapabilities?.() as any) || {};
          if (capabilities.torch) {
            setHasTorch(true);
          }
          // 모바일 브라우저에 연속 자동초점(continuous auto-focus) 요청
          if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
            await (videoTrack as any).applyConstraints({
              advanced: [{ focusMode: 'continuous' }]
            });
          }
        } catch (capErr) {
          console.warn('Track constraint application failed:', capErr);
        }
      }
    } catch (err: any) {
      console.warn('Camera access failed:', err);
      setIsLoadingCamera(false);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('카메라 사용 권한이 차단되었습니다. 브라우저 주소창 좌측의 설정/자물쇠 아이콘을 눌러 카메라 권한을 허용해주세요.');
      } else {
        setPermissionError(err.message || '카메라를 시작할 수 없습니다. 기본 카메라 앱으로 촬영해주세요.');
      }
    }
  }, []);

  // 2. 카메라 정리
  const stopCamera = useCallback(() => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    stabilityRef.current = 0;
    prevFrameLumRef.current = null;
    setFocusState('searching');
    setAlignProgress(0);
    setIsLoadingCamera(false);
    setIsTorchOn(false);
  }, []);

  // 화면 터치로 초점 다시 맞추기 (Tap to Focus)
  const handleTouchFocus = async (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setFocusRing({ x: clientX - rect.left, y: clientY - rect.top });
    setTimeout(() => setFocusRing(null), 1200);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          const caps = (track.getCapabilities?.() as any) || {};
          if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
            await (track as any).applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
          }
        } catch (_) {}
      }
    }
  };

  // 플래시 토글
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  // 3. 사진 캡처 트리거 (자동 또는 수동 셔터)
  const triggerCapture = useCallback(() => {
    if (isCapturing || !videoRef.current) return;
    setIsCapturing(true);

    // 플래시 효과 애니메이션 & 진동
    setIsFlashActive(true);
    if (navigator.vibrate) {
      try { navigator.vibrate(60); } catch (_) {}
    }

    setTimeout(() => {
      setIsFlashActive(false);
    }, 150);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    // 비디오 원본 프레임을 고해상도로 캡처
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.94);

    // 뷰파인더 가이드라인의 정확한 정규화 사각영역(CropRect) 계산
    let guideCropRect: CropRect | undefined;
    const guide = guideBoxRef.current;
    if (guide) {
      const videoRect = video.getBoundingClientRect();
      const guideRect = guide.getBoundingClientRect();
      const W_screen = videoRect.width;
      const H_screen = videoRect.height;
      const W_vid = video.videoWidth || 1920;
      const H_vid = video.videoHeight || 1080;

      const scale = Math.max(W_screen / W_vid, H_screen / H_vid);
      const renderedW = W_vid * scale;
      const renderedH = H_vid * scale;
      const offsetX = (W_screen - renderedW) / 2;
      const offsetY = (H_screen - renderedH) / 2;

      const guideXonScreen = guideRect.left - videoRect.left;
      const guideYonScreen = guideRect.top - videoRect.top;

      const srcX = Math.max(0, Math.round((guideXonScreen - offsetX) / scale));
      const srcY = Math.max(0, Math.round((guideYonScreen - offsetY) / scale));
      const srcW = Math.min(W_vid - srcX, Math.round(guideRect.width / scale));
      const srcH = Math.min(H_vid - srcY, Math.round(guideRect.height / scale));

      guideCropRect = {
        x: Math.max(0, Math.min(0.9, srcX / W_vid)),
        y: Math.max(0, Math.min(0.9, srcY / H_vid)),
        width: Math.max(0.1, Math.min(1, srcW / W_vid)),
        height: Math.max(0.1, Math.min(1, srcH / H_vid)),
      };
    }

    stopCamera();
    onCapture(capturedDataUrl, guideCropRect);
    setIsCapturing(false);
  }, [isCapturing, onCapture, stopCamera]);

  // 4. 모달 열림/닫힘 생명주기
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // 5. 실시간 초점(Sharpness) 및 손떨림 안정성 정밀 감지 루프
  useEffect(() => {
    if (!isOpen || !hasPermission) return;

    let isRunning = true;

    const checkAlignment = () => {
      if (!isRunning) return;

      const now = performance.now();
      // 약 100ms마다 한 번씩 검사 (초당 10회)
      if (now - lastCheckTime.current >= 100) {
        lastCheckTime.current = now;

        const video = videoRef.current;
        const guide = guideBoxRef.current;

        if (video && guide && video.readyState >= 2) {
          const videoRect = video.getBoundingClientRect();
          const guideRect = guide.getBoundingClientRect();

          const W_screen = videoRect.width;
          const H_screen = videoRect.height;
          const W_vid = video.videoWidth || 1920;
          const H_vid = video.videoHeight || 1080;

          // object-cover 스타일의 정확한 스케일 및 오프셋 역산
          const scale = Math.max(W_screen / W_vid, H_screen / H_vid);
          const renderedW = W_vid * scale;
          const renderedH = H_vid * scale;
          const offsetX = (W_screen - renderedW) / 2;
          const offsetY = (H_screen - renderedH) / 2;

          // 가이드 박스의 비디오 프레임 내 정확한 픽셀 좌표
          const guideXonScreen = guideRect.left - videoRect.left;
          const guideYonScreen = guideRect.top - videoRect.top;

          const srcX = Math.max(0, Math.round((guideXonScreen - offsetX) / scale));
          const srcY = Math.max(0, Math.round((guideYonScreen - offsetY) / scale));
          const srcW = Math.min(W_vid - srcX, Math.round(guideRect.width / scale));
          const srcH = Math.min(H_vid - srcY, Math.round(guideRect.height / scale));

          // 100x60 크기로 다운샘플링하여 초고속 분석 (비용 0.2ms 미만)
          const sampleW = 100;
          const sampleH = 60;
          const canvas = canvasRef.current || document.createElement('canvas');
          canvas.width = sampleW;
          canvas.height = sampleH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx && srcW > 0 && srcH > 0) {
            ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, sampleW, sampleH);
            const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
            const data = imgData.data;

            const getB = (x: number, y: number) => {
              const i = (y * sampleW + x) * 4;
              return (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
            };

            // A. 평균 밝기 측정 (명함 종이 유무)
            let sumB = 0;
            let countB = 0;
            for (let y = 6; y < sampleH - 6; y += 3) {
              for (let x = 6; x < sampleW - 6; x += 3) {
                sumB += getB(x, y);
                countB++;
              }
            }
            const avgBrightness = Math.round(sumB / Math.max(1, countB));

            // B. 고주파 엣지 그래디언트(초점 선명도) 측정
            // 외곽 테두리 제외한 내부 글자/로고 영역(15% ~ 85%)만 샘플링
            const minX = Math.round(sampleW * 0.15);
            const maxX = Math.round(sampleW * 0.85);
            const minY = Math.round(sampleH * 0.15);
            const maxY = Math.round(sampleH * 0.85);

            let edgeSum = 0;
            let edgeCount = 0;
            let sharpEdgeCount = 0; // 글자 경계의 강한 엣지 픽셀 수

            for (let y = minY; y <= maxY; y += 2) {
              for (let x = minX; x <= maxX; x += 2) {
                const gx = Math.abs(getB(x + 1, y) - getB(x - 1, y));
                const gy = Math.abs(getB(x, y + 1) - getB(x, y - 1));
                const grad = gx + gy;
                edgeSum += grad;
                if (grad >= 22) {
                  sharpEdgeCount++;
                }
                edgeCount++;
              }
            }
            const sharpness = Math.round((edgeSum / Math.max(1, edgeCount)) * 10) / 10;

            // C. 이전 프레임 대비 변화량 (손떨림 및 카메라 이동 감지)
            const currentLum = new Float32Array(sampleW * sampleH);
            for (let y = 0; y < sampleH; y++) {
              for (let x = 0; x < sampleW; x++) {
                currentLum[y * sampleW + x] = getB(x, y);
              }
            }

            let motionDiff = 0;
            if (prevFrameLumRef.current && prevFrameLumRef.current.length === sampleW * sampleH) {
              let diffSum = 0;
              let diffCount = 0;
              for (let i = 0; i < sampleW * sampleH; i += 6) {
                diffSum += Math.abs(currentLum[i] - prevFrameLumRef.current[i]);
                diffCount++;
              }
              motionDiff = diffCount > 0 ? diffSum / diffCount : 0;
            }
            prevFrameLumRef.current = currentLum;

            // D. 다단계 종합 판정
            // 1) 명함 종이 존재: 어두운 배경(책상 등) 대비 밝기 > 75
            const isCardPresent = avgBrightness > 75;

            // 2) 초점 선명도 판정:
            // 글자 엣지(sharpEdgeCount)가 12개 이상이거나 평균 그래디언트 >= 11
            const isSharp = sharpness >= 11 || sharpEdgeCount >= 12;

            // 3) 손떨림 방지: 프레임 간 변위가 7.0 미만으로 고정된 상태
            const isStill = motionDiff < 7.0;

            // E. 초점 및 정렬 상태 전이
            if (!isCardPresent) {
              // 명함이 가이드라인 안에 없음
              setFocusState('searching');
              stabilityRef.current = Math.max(0.0, stabilityRef.current - 0.25);
            } else if (!isSharp || !isStill) {
              // 명함은 들어왔으나 아직 렌즈가 초점을 잡는 중이거나 손이 떨리는 중
              setFocusState('focusing');
              // 초점이 덜 맞았을 때는 자동 촬영으로 바로 넘어가지 않도록 게이지를 20% 이내로 홀드
              if (stabilityRef.current > 0.25) {
                stabilityRef.current = Math.max(0.15, stabilityRef.current - 0.1);
              } else {
                stabilityRef.current = Math.min(0.2, stabilityRef.current + 0.04);
              }
            } else {
              // 초점이 뚜렷하게 잡히고 손이 멈춘 상태 (고화질 촬영 조건 충족!)
              setFocusState('locked');
              // 0.8초 ~ 1.0초간 흔들림 없이 유지되어야 100% 도달 (+0.12씩 누적)
              stabilityRef.current = Math.min(1.0, stabilityRef.current + 0.12);
            }

            const currentScore = stabilityRef.current;
            const progress = Math.round(currentScore * 100);
            setAlignProgress(progress);
            setDebugMetric(`초점:${sharpness}(엣지:${sharpEdgeCount}) | 모션:${motionDiff.toFixed(1)} | 안정:${progress}%`);

            // F. 95% 이상 안정성 도달 시 찰칵 자동 촬영 발동! (초점이 100% 선명할 때만 찍힘)
            if (currentScore >= 0.95) {
              triggerCapture();
              return;
            }
          }
        }
      }

      animFrameId.current = requestAnimationFrame(checkAlignment);
    };

    animFrameId.current = requestAnimationFrame(checkAlignment);

    return () => {
      isRunning = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isOpen, hasPermission, triggerCapture]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-between overflow-hidden select-none animate-fade-in touch-none">
      {/* Offscreen hidden canvas for CV frame analysis */}
      <canvas ref={canvasRef} className="hidden" />

      {/* White Flash Effect Overlay */}
      {isFlashActive && (
        <div className="absolute inset-0 bg-white z-[120] pointer-events-none animate-ping opacity-90" />
      )}

      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent text-white pt-safe">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600/90 flex items-center justify-center backdrop-blur-md shadow-md">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight">스마트 명함 스캐너</span>
            <p className="text-[10px] text-slate-300">초점이 선명하게 맞으면 자동으로 촬영됩니다.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-full transition backdrop-blur-md ${
                isTorchOn ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/40' : 'bg-white/20 text-white'
              }`}
              title="조명 플래시"
            >
              {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition backdrop-blur-md"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Camera Viewport */}
      <div 
        onClick={handleTouchFocus}
        className="relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden cursor-crosshair"
      >
        {/* Loading Spinner */}
        {isLoadingCamera && !permissionError && (
          <div className="absolute z-20 flex flex-col items-center gap-3 text-white pointer-events-none">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-xs font-semibold text-slate-200">카메라 렌즈를 연결하는 중입니다...</p>
          </div>
        )}

        {/* Live Camera Video (전체 화면 커버) */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Tap to focus touch ripple ring */}
        {focusRing && (
          <div
            style={{ left: focusRing.x - 24, top: focusRing.y - 24 }}
            className="absolute z-30 w-12 h-12 rounded-full border-2 border-amber-300 animate-ping pointer-events-none shadow-lg shadow-amber-300/40"
          />
        )}

        {/* Permission Error fallback banner */}
        {permissionError && (
          <div className="relative z-40 max-w-sm mx-4 p-6 rounded-3xl bg-slate-900/95 border border-slate-700 text-white text-center space-y-4 shadow-2xl backdrop-blur-md animate-fade-in pointer-events-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold">카메라 연결 안내</h4>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{permissionError}</p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              {onFallbackToNativeCamera && (
                <button
                  onClick={() => {
                    stopCamera();
                    onClose();
                    onFallbackToNativeCamera();
                  }}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>스마트폰 기본 카메라로 촬영</span>
                </button>
              )}
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                  onFallbackToFile();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                사진 앨범에서 선택하기
              </button>
            </div>
          </div>
        )}

        {/* Dark Vignette Mask Outside Guideline Box */}
        {!permissionError && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Guide Box (외곽 치수는 불변으로 고정) */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div
                ref={guideBoxRef}
                style={{
                  width: 'min(86vw, 420px)',
                  aspectRatio: '1.68 / 1', // 표준 명함 비율 (90mm x 54mm)
                }}
                className={`relative rounded-3xl border-[3px] transition-all duration-200 ${
                  focusState === 'locked'
                    ? 'border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.65),0_0_25px_rgba(52,211,153,0.5)] scale-[1.01]'
                    : focusState === 'focusing'
                    ? 'border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.65),0_0_20px_rgba(251,191,36,0.35)]'
                    : 'border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]'
                }`}
              >
                {/* 4 Corner Accents */}
                <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl transition-colors duration-200 ${
                  focusState === 'locked' ? 'border-emerald-300' : focusState === 'focusing' ? 'border-amber-300' : 'border-blue-400'
                }`} />
                <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl transition-colors duration-200 ${
                  focusState === 'locked' ? 'border-emerald-300' : focusState === 'focusing' ? 'border-amber-300' : 'border-blue-400'
                }`} />
                <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl transition-colors duration-200 ${
                  focusState === 'locked' ? 'border-emerald-300' : focusState === 'focusing' ? 'border-amber-300' : 'border-blue-400'
                }`} />
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-xl transition-colors duration-200 ${
                  focusState === 'locked' ? 'border-emerald-300' : focusState === 'focusing' ? 'border-amber-300' : 'border-blue-400'
                }`} />

                {/* Auto-shutter progress bar (when aligned & focused) */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/40 rounded-t-2xl overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ease-out ${
                      focusState === 'locked' ? 'bg-emerald-400' : focusState === 'focusing' ? 'bg-amber-400' : 'bg-transparent'
                    }`}
                    style={{ width: `${alignProgress}%` }}
                  />
                </div>

                {/* Center Status Badge */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md transition-all duration-200 flex items-center gap-1.5 shadow-lg ${
                      focusState === 'locked'
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-300/40'
                        : focusState === 'focusing'
                        ? 'bg-amber-600/90 text-white ring-2 ring-amber-300/30'
                        : 'bg-black/60 text-white/90 border border-white/20'
                    }`}
                  >
                    {focusState === 'locked' ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>초점 고정 완료! 가만히 계세요 ({alignProgress}%)</span>
                      </>
                    ) : focusState === 'focusing' ? (
                      <>
                        <Scan className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                        <span>초점을 맞추는 중입니다... 흔들리지 마세요</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                        <span>가이드라인 안에 명함을 맞춰주세요</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Live Real-time Debug Metric Pill */}
                {debugMetric && (
                  <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-black/60 text-slate-300 backdrop-blur-xs">
                      {debugMetric}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Shutter & Controls Bar */}
      <div className="relative z-30 p-6 sm:p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-around pb-safe">
        {/* Switch to Album / Gallery */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
            onFallbackToFile();
          }}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition active:scale-95 text-center min-w-[70px]"
        >
          <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
            <RotateCcw className="w-5 h-5 text-white" />
          </div>
          <span className="text-[11px] font-medium">앨범 선택</span>
        </button>

        {/* Main Shutter Button (수동 셔터 - 사용자가 원할 때 언제든 즉시 찰칵) */}
        <button
          onClick={triggerCapture}
          disabled={isCapturing || !hasPermission}
          className="relative group p-1.5 rounded-full bg-white/20 backdrop-blur-md transition active:scale-90 disabled:opacity-40"
          title="사진 촬영"
        >
          <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white transition flex items-center justify-center ${
            focusState === 'locked' ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-900'
          }`}>
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-slate-900/10 transition ${
              focusState === 'locked' ? 'bg-emerald-400' : 'bg-white'
            }`} />
          </div>
        </button>

        {/* Fallback to Native Device Camera */}
        {onFallbackToNativeCamera ? (
          <button
            onClick={() => {
              stopCamera();
              onClose();
              onFallbackToNativeCamera();
            }}
            className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition active:scale-95 text-center min-w-[70px]"
            title="기본 카메라 앱"
          >
            <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-medium">기본 앱</span>
          </button>
        ) : (
          <div className="min-w-[70px] flex flex-col items-center gap-1 opacity-0 pointer-events-none">
            <div className="w-11 h-11 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
};