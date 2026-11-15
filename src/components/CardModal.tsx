import React, { useState, useRef } from 'react';
import { 
  X, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Building2, 
  Star,
  FileText,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BusinessCardData } from '../types/card';
import { THEME_CONFIGS } from '../utils/theme';
import { downloadVCard, generateVCardString } from '../utils/vcard';

interface CardModalProps {
  card: BusinessCardData;
  onClose: () => void;
  onEdit: (card: BusinessCardData) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const CardModal: React.FC<CardModalProps> = ({
  card,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const theme = THEME_CONFIGS[card.theme] || THEME_CONFIGS['modern-blue'];
  const hasPhoto = Boolean(card.avatarUrl && card.avatarUrl.trim().length > 0);

  // 실물 명함 사진 줌(Zoom) 및 드래그(Pan) 상태
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);
  const lastTapTimeRef = useRef<number>(0);

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel((prev) => Math.min(3.5, Math.round((prev + 0.5) * 10) / 10));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel((prev) => {
      const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const closePhotoZoom = () => {
    setIsPhotoZoomed(false);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleImageDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoomLevel(2.2);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setZoomLevel((prev) => Math.min(3.5, Math.round((prev + 0.25) * 100) / 100));
    } else {
      setZoomLevel((prev) => {
        const next = Math.max(1, Math.round((prev - 0.25) * 100) / 100);
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialZoomRef.current = zoomLevel;
    } else if (e.touches.length === 1) {
      const now = performance.now();
      if (now - lastTapTimeRef.current < 300) {
        handleImageDoubleTap(e);
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      if (zoomLevel > 1) {
        isDraggingRef.current = true;
        dragStartRef.current = {
          x: e.touches[0].clientX - panOffset.x,
          y: e.touches[0].clientY - panOffset.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleChange = dist / initialPinchDistRef.current;
      const nextZoom = Math.min(3.5, Math.max(1, initialZoomRef.current * scaleChange));
      setZoomLevel(Math.round(nextZoom * 100) / 100);
      if (nextZoom === 1) setPanOffset({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDraggingRef.current && zoomLevel > 1) {
      const newX = e.touches[0].clientX - dragStartRef.current.x;
      const newY = e.touches[0].clientY - dragStartRef.current.y;
      setPanOffset({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
    isDraggingRef.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current && zoomLevel > 1) {
      e.preventDefault();
      e.stopPropagation();
      setPanOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const vCardData = generateVCardString(card);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
        <div 
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-100 transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: 실물 명함 사진이 있으면 사진 뷰어로, 없으면 디자인 배너로 표시 */}
          {hasPhoto ? (
            <div className="relative bg-slate-950 group">
              <div 
                className="w-full h-56 sm:h-64 cursor-zoom-in overflow-hidden flex items-center justify-center relative select-none"
                onClick={() => setIsPhotoZoomed(true)}
              >
                <img
                  src={card.avatarUrl}
                  alt={`${card.name} 명함 실물`}
                  className="w-full h-full object-contain bg-slate-900 transition-transform duration-300 group-hover:scale-[1.02]"
                />
                
                {/* Visual hint on photo */}
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 shadow-md">
                  <Maximize2 className="w-3.5 h-3.5 text-blue-300" />
                  <span>터치하여 크게보기</span>
                </div>
              </div>

              {/* Floating controls on top of photo */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <button
                  onClick={() => onToggleFavorite(card.id)}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition active:scale-95"
                >
                  <Star
                    className={`w-4 h-4 transition ${
                      card.isFavorite 
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-white/80 hover:text-white'
                    }`}
                  />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom banner info overlay */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-t border-slate-800">
                <div className="min-w-0 mr-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                    {card.name}
                  </h2>
                  <p className="text-xs text-blue-300 font-medium truncate">
                    {card.position || '직책'} · {card.company || '소속 미지정'}
                  </p>
                </div>
                
                {/* 실물 명함 클릭 시 원본 크게보기 팝업 열기 */}
                <button
                  type="button"
                  onClick={() => setIsPhotoZoomed(true)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition active:scale-95 shrink-0 shadow-sm"
                  title="실물 명함 원본 크게 보기"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold">실물 명함</span>
                  <Maximize2 className="w-3 h-3 text-emerald-400 opacity-70" />
                </button>
              </div>
            </div>
          ) : (
            /* 가상 그래픽 배너 헤더 */
            <div className={`p-6 sm:p-8 relative ${theme.cardBg}`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-bold uppercase tracking-wider ${theme.subTextColor}`}>
                  {card.company || '소속 없음'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleFavorite(card.id)}
                    className="p-1.5 rounded-full hover:bg-white/20 transition active:scale-95"
                  >
                    <Star
                      className={`w-5 h-5 transition ${
                        card.isFavorite 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'text-white/60 hover:text-white'
                      }`}
                    />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-white/20 text-white transition active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${theme.textColor}`}>
                  {card.name}
                </h2>
                <p className={`text-sm sm:text-base font-medium mt-1 ${theme.accentColor}`}>
                  {card.position || '직책 미입력'} {card.department ? `· ${card.department}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Modal Body */}
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Quick Contact Links */}
            <div className="grid grid-cols-2 gap-3">
              {card.phone && (
                <a
                  href={`tel:${card.phone}`}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 font-semibold text-sm transition active:scale-95"
                >
                  <Phone className="w-4 h-4" />
                  <span>전화 걸기</span>
                </a>
              )}
              {card.email && (
                <a
                  href={`mailto:${card.email}`}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 font-semibold text-sm transition active:scale-95"
                >
                  <Mail className="w-4 h-4" />
                  <span>이메일 쓰기</span>
                </a>
              )}
            </div>

            {/* Detailed Info List */}
            <div className="space-y-3.5 divide-y divide-slate-100 text-sm">
              {card.phone && (
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="font-mono text-slate-900 font-medium">{card.phone}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(card.phone, 'phone')}
                    className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium"
                  >
                    {copiedField === 'phone' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {card.tel && (
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="font-mono text-slate-900">{card.tel} (사무실)</span>
                  </div>
                  <button
                    onClick={() => handleCopy(card.tel!, 'tel')}
                    className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium"
                  >
                    {copiedField === 'tel' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {card.email && (
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-900 font-medium">{card.email}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(card.email, 'email')}
                    className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium"
                  >
                    {copiedField === 'email' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {card.website && (
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-3 text-slate-600 truncate mr-2">
                    <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                    <a 
                      href={card.website.startsWith('http') ? card.website : `https://${card.website}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-blue-600 hover:underline truncate"
                    >
                      {card.website}
                    </a>
                  </div>
                </div>
              )}

              {card.address && (
                <div className="flex items-start gap-3 pt-3 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-800">{card.address}</span>
                </div>
              )}

              {card.memo && (
                <div className="pt-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>메모</span>
                  </div>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl text-sm whitespace-pre-wrap leading-relaxed border border-slate-100">
                    {card.memo}
                  </p>
                </div>
              )}
            </div>

            {/* QR Code Section */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center gap-4">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs shrink-0">
                <QRCodeSVG 
                  value={vCardData} 
                  size={88}
                  level="M"
                />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">QR 코드로 연락처 저장</h4>
                <p className="text-xs text-slate-500">
                  스마트폰 기본 카메라로 비추면 바로 연락처 추가 화면이 뜹니다.
                </p>
                <button
                  onClick={() => downloadVCard(card)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>vCard (.vcf) 다운로드</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  if (confirm(`'${card.name}' 명함을 삭제하시겠습니까?`)) {
                    onDelete(card.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 text-sm font-medium py-2 px-3 rounded-lg hover:bg-rose-50 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>삭제</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onEdit(card);
                }}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-2 px-4 rounded-xl shadow-md transition active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                <span>수정하기</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Photo Lightbox Modal (z-[110]으로 모달 최상단에 완전 표시 & 핀치/더블탭/버튼 줌 지원) */}
      {isPhotoZoomed && hasPhoto && (
        <div 
          className="fixed inset-0 z-[110] bg-black/95 flex flex-col justify-between p-4 sm:p-6 animate-fade-in touch-none select-none"
          onClick={closePhotoZoom}
        >
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between text-white z-20 pt-safe">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{card.name}</span>
              <span className="text-xs text-slate-400">· 실물 명함 원본</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={card.avatarUrl}
                download={`${card.name}_명함.jpg`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition active:scale-95"
                title="사진 다운로드"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                onClick={closePhotoZoom}
                className="p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition active:scale-95"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Centered Interactive Zoom Viewport */}
          <div 
            className="flex-1 w-full flex items-center justify-center p-2 min-h-0 overflow-hidden relative cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDraggingRef.current) {
                closePhotoZoom();
              }
            }}
          >
            <img
              src={card.avatarUrl}
              alt={`${card.name} 명함 원본`}
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transition: isDraggingRef.current ? 'none' : 'transform 0.15s ease-out',
                maxHeight: '85vh',
                maxWidth: '92vw',
              }}
              className="object-contain rounded-2xl shadow-2xl select-none"
              onDoubleClick={handleImageDoubleTap}
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
          </div>

          {/* Bottom Floating Zoom Controls Bar */}
          <div 
            className="pb-safe z-20 flex flex-col items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Interactive Zoom Controls Pill */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/85 border border-slate-700/80 shadow-2xl backdrop-blur-md text-white">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className="p-2 rounded-xl hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-90"
                title="축소"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetZoom}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold hover:bg-white/15 transition active:scale-95 text-emerald-400"
                title="100% 원본 크기로 리셋"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3.5}
                className="p-2 rounded-xl hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-90"
                title="확대"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {zoomLevel > 1 && (
                <button
                  onClick={handleResetZoom}
                  className="flex items-center gap-1 pl-2 pr-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-white/15 rounded-lg border-l border-slate-700 transition"
                  title="원본 비율 복귀"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>원복</span>
                </button>
              )}
            </div>

            {/* Sub-hint */}
            <span className="text-[11px] text-slate-400">
              더블 탭 또는 두 손가락 핀치 줌으로 확대 / 드래그하여 이동
            </span>
          </div>
        </div>
      )}
    </>
  );
};
