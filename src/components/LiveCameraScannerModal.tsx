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
  Loader2
} from 'lucide-react';

interface LiveCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideBoxRef = useRef<HTMLDivElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Auto-capture states
  const [isCardAligned, setIsCardAligned] = useState(false);
  const [alignProgress, setAlignProgress] = useState(0); // 0 to 100%
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Animation frame ref
  const animFrameId = useRef<number | null>(null);
  const lastCheckTime = useRef<number>(0);
  const alignedFrameCount = useRef<number>(0);

  // 1. 카메라 시작 (다단계 제약조건 폴백으로 100% 연결 보장)
  const startCamera = useCallback(async () => {
    try {
      setIsLoadingCamera(true);
      setPermissionError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('이 브라우저는 웹 실시간 카메라 스트리밍을 지원하지 않습니다.');
      }

      let mediaStream: MediaStream | null = null;

      // 1차 시도: 후면 카메라 + 고화질 ideal (min 제약조건 제거)
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
          // 2차 시도: 기본 후면 카메라
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
        } catch (e2) {
          console.warn('Fallback 1 failed, trying fallback 2 (any video):', e2);
          // 3차 시도: 기본 시스템 카메라
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!mediaStream) {
        throw new Error('카메라 스트림을 획득할 수 없습니다.');
      }

      setStream(mediaStream);
      setHasPermission(true);

      // Torch (플래시) 지원 확인
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() as any) || {};
        if (capabilities.torch) {
          setHasTorch(true);
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

  // stream 변경 시 비디오 엘리먼트에 즉시 바인딩 및 재생
  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      video.play()
        .then(() => setIsLoadingCamera(false))
        .catch((err) => {
          console.warn('Direct video.play failed, waiting for metadata:', err);
          video.onloadedmetadata = () => {
            video.play().then(() => setIsLoadingCamera(false)).catch(console.warn);
          };
        });
    }
  }, [stream]);

  // 2. 카메라 정리
  const stopCamera = useCallback(() => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    alignedFrameCount.current = 0;
    setIsCardAligned(false);
    setAlignProgress(0);
    setIsLoadingCamera(false);
  }, [stream]);

  // 플래시 토글
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
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

    stopCamera();
    onCapture(capturedDataUrl);
    setIsCapturing(false);
  }, [isCapturing, onCapture, stopCamera]);

  // 4. 실시간 가이드라인 정렬 및 손떨림 감지 루프
  useEffect(() => {
    if (!isOpen || !hasPermission || !videoRef.current) return;

    let isRunning = true;

    const checkAlignment = () => {
      if (!isRunning) return;

      const now = performance.now();
      // 약 100ms마다 한 번씩 분석 (초당 10회 검사)
      if (now - lastCheckTime.current >= 100) {
        lastCheckTime.current = now;

        const video = videoRef.current;
        const guide = guideBoxRef.current;

        if (video && guide && video.readyState >= 2) {
          const videoRect = video.getBoundingClientRect();
          const guideRect = guide.getBoundingClientRect();

          // 가이드 박스가 비디오 뷰포트 내 차지하는 상대 비율
          const guideRelLeft = (guideRect.left - videoRect.left) / videoRect.width;
          const guideRelTop = (guideRect.top - videoRect.top) / videoRect.height;
          const guideRelWidth = guideRect.width / videoRect.width;
          const guideRelHeight = guideRect.height / videoRect.height;

          // 오프스크린 캔버스에 가이드 영역 주변을 샘플링 (120x70)
          const sampleW = 120;
          const sampleH = 70;
          const canvas = canvasRef.current || document.createElement('canvas');
          canvas.width = sampleW;
          canvas.height = sampleH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            const vidW = video.videoWidth;
            const vidH = video.videoHeight;

            const srcX = Math.max(0, guideRelLeft * vidW);
            const srcY = Math.max(0, guideRelTop * vidH);
            const srcW = Math.min(vidW - srcX, guideRelWidth * vidW);
            const srcH = Math.min(vidH - srcY, guideRelHeight * vidH);

            if (srcW > 0 && srcH > 0) {
              ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, sampleW, sampleH);
              const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
              const data = imgData.data;

              const getB = (x: number, y: number) => {
                const i = (y * sampleW + x) * 4;
                return (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
              };

              // 1) 내부 중앙부 평균 밝기 (종이)
              let innerSum = 0;
              let innerCount = 0;
              for (let y = Math.round(sampleH * 0.25); y < sampleH * 0.75; y += 4) {
                for (let x = Math.round(sampleW * 0.25); x < sampleW * 0.75; x += 6) {
                  innerSum += getB(x, y);
                  innerCount++;
                }
              }
              const innerAvg = innerSum / Math.max(1, innerCount);

              // 2) 가이드라인 안쪽 테두리 밝기 (명함 종이가 꽉 찼는지 확인)
              let borderSum = 0;
              let borderCount = 0;
              for (let x = 10; x < sampleW - 10; x += 8) {
                borderSum += getB(x, 6);
                borderSum += getB(x, sampleH - 7);
                borderCount += 2;
              }
              for (let y = 8; y < sampleH - 8; y += 6) {
                borderSum += getB(6, y);
                borderSum += getB(sampleW - 7, y);
                borderCount += 2;
              }
              const borderAvg = borderSum / Math.max(1, borderCount);

              // 명함이 가이드라인 박스를 채우고 있는지 조건 판정
              const isFilled = innerAvg > 105 && borderAvg > 90 && Math.abs(innerAvg - borderAvg) < 60;

              if (isFilled) {
                alignedFrameCount.current += 1;
                setIsCardAligned(true);
                const progress = Math.min(100, Math.round((alignedFrameCount.current / 5) * 100));
                setAlignProgress(progress);

                if (alignedFrameCount.current >= 5) {
                  // 자동 셔터 발동!
                  triggerCapture();
                  return;
                }
              } else {
                alignedFrameCount.current = Math.max(0, alignedFrameCount.current - 1);
                setAlignProgress(Math.round((alignedFrameCount.current / 5) * 100));
                if (alignedFrameCount.current === 0) {
                  setIsCardAligned(false);
                }
              }
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

  // 모달 열림/닫힘 생명주기
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
            <p className="text-[10px] text-slate-300">가이드라인에 맞추면 자동 촬영됩니다.</p>
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
      <div className="relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden">
        {/* Loading Spinner */}
        {isLoadingCamera && !permissionError && (
          <div className="absolute z-20 flex flex-col items-center gap-3 text-white">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-xs font-semibold text-slate-200">카메라 렌즈를 연결하는 중입니다...</p>
          </div>
        )}

        {/* Live Camera Video (확실한 전체 화면 커버) */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={() => {
            videoRef.current?.play().then(() => setIsLoadingCamera(false)).catch(console.warn);
          }}
          onPlaying={() => setIsLoadingCamera(false)}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Permission Error fallback banner */}
        {permissionError && (
          <div className="relative z-40 max-w-sm mx-4 p-6 rounded-3xl bg-slate-900/95 border border-slate-700 text-white text-center space-y-4 shadow-2xl backdrop-blur-md animate-fade-in">
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
            {/* Guide Box */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div
                ref={guideBoxRef}
                style={{
                  width: 'min(86vw, 420px)',
                  aspectRatio: '1.68 / 1', // 표준 명함 비율 (90mm x 54mm)
                }}
                className={`relative rounded-3xl transition-all duration-300 ${
                  isCardAligned
                    ? 'border-4 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.65),0_0_30px_rgba(52,211,153,0.6)] scale-[1.01]'
                    : 'border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]'
                }`}
              >
                {/* 4 Corner Accents */}
                <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl transition-colors ${
                  isCardAligned ? 'border-emerald-300' : 'border-blue-400'
                }`} />
                <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl transition-colors ${
                  isCardAligned ? 'border-emerald-300' : 'border-blue-400'
                }`} />
                <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl transition-colors ${
                  isCardAligned ? 'border-emerald-300' : 'border-blue-400'
                }`} />
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-xl transition-colors ${
                  isCardAligned ? 'border-emerald-300' : 'border-blue-400'
                }`} />

                {/* Auto-shutter progress bar (when aligned) */}
                {isCardAligned && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-950/60 rounded-t-2xl overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-100 ease-out"
                      style={{ width: `${alignProgress}%` }}
                    />
                  </div>
                )}

                {/* Center Status Badge */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md transition-all duration-300 flex items-center gap-1.5 shadow-lg ${
                      isCardAligned
                        ? 'bg-emerald-500/90 text-white scale-105 animate-pulse'
                        : 'bg-black/55 text-white/90 border border-white/20'
                    }`}
                  >
                    {isCardAligned ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>명함 감지됨! 고정해주세요 ({alignProgress}%)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                        <span>가이드라인 안에 명함을 맞춰주세요</span>
                      </>
                    )}
                  </div>
                </div>
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

        {/* Main Shutter Button (수동 셔터 - 언제든 즉시 찰칵) */}
        <button
          onClick={triggerCapture}
          disabled={isCapturing || !hasPermission}
          className="relative group p-1.5 rounded-full bg-white/20 backdrop-blur-md transition active:scale-90 disabled:opacity-40"
          title="사진 촬영"
        >
          <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white transition flex items-center justify-center ${
            isCardAligned ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-900'
          }`}>
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-slate-900/10 transition ${
              isCardAligned ? 'bg-emerald-400' : 'bg-white'
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
