import React, { useState } from 'react';
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
                className="w-full h-56 sm:h-64 cursor-zoom-in overflow-hidden flex items-center justify-center relative"
                onClick={() => setIsPhotoZoomed(true)}
              >
                <img
                  src={card.avatarUrl}
                  alt={`${card.name} 명함 실물`}
                  className="w-full h-full object-contain bg-slate-900"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="px-3 py-1.5 rounded-xl bg-black/70 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>사진 크게 보기</span>
                  </span>
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
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    {card.name}
                  </h2>
                  <p className="text-xs text-blue-300 font-medium">
                    {card.position || '직책'} · {card.company || '소속 미지정'}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                  <span>실물 명함</span>
                </span>
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

      {/* Fullscreen Photo Lightbox Modal */}
      {isPhotoZoomed && hasPhoto && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setIsPhotoZoomed(false)}
        >
          <button
            onClick={() => setIsPhotoZoomed(false)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={card.avatarUrl}
            alt={`${card.name} 명함 원본`}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
};
