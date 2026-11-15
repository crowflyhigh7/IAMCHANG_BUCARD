import React from 'react';
import { 
  Building2, 
  Mail, 
  Phone, 
  Star, 
  Download, 
  QrCode,
  Tag,
  ImageIcon,
  Sparkles
} from 'lucide-react';
import { BusinessCardData } from '../types/card';
import { THEME_CONFIGS } from '../utils/theme';
import { downloadVCard } from '../utils/vcard';

interface BusinessCardProps {
  card: BusinessCardData;
  onClick: (card: BusinessCardData) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onShowQR: (card: BusinessCardData, e: React.MouseEvent) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  card,
  onClick,
  onToggleFavorite,
  onShowQR,
}) => {
  const theme = THEME_CONFIGS[card.theme] || THEME_CONFIGS['modern-blue'];
  const hasPhoto = Boolean(card.avatarUrl && card.avatarUrl.trim().length > 0);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadVCard(card);
  };

  return (
    <div
      onClick={() => onClick(card)}
      className="group relative cursor-pointer select-none transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl rounded-3xl"
    >
      {/* 1. Real Cropped Photo Business Card (실물 명함 사진이 있는 경우) */}
      {hasPhoto ? (
        <div className="w-full bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-slate-200/80 transition-all flex flex-col">
          {/* Top: 100% Clean Cropped Business Card Image (글자로 가리지 않는 순수 명함 본체) */}
          <div className="w-full bg-slate-100/60 p-2 sm:p-2.5 flex items-center justify-center border-b border-slate-100 overflow-hidden relative">
            <div className="w-full aspect-[1.75/1] rounded-2xl overflow-hidden bg-white shadow-xs border border-slate-200/90 relative group-hover:border-blue-400 transition-all">
              <img
                src={card.avatarUrl}
                alt={`${card.name} 명함`}
                className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </div>
            
            {/* Subtle corner badge for real photo */}
            <span className="absolute top-4 left-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
              실물 명함
            </span>
          </div>

          {/* Bottom: Clean Meta Information Bar (명함을 가리지 않고 아래에 정갈하게 배치) */}
          <div className="p-4 sm:p-4.5 bg-white flex flex-col justify-between flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                    {card.name}
                  </h3>
                  {card.position && (
                    <span className="text-xs font-semibold text-blue-600 truncate">
                      {card.position}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {card.company || '소속 미지정'} {card.department ? `· ${card.department}` : ''}
                </p>
              </div>

              {/* Favorite Button */}
              <button
                onClick={(e) => onToggleFavorite(card.id, e)}
                title={card.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                className="p-1.5 rounded-xl hover:bg-slate-100 transition active:scale-90 shrink-0"
              >
                <Star
                  className={`w-4 h-4 transition ${
                    card.isFavorite 
                      ? 'fill-amber-400 text-amber-400' 
                      : 'text-slate-300 hover:text-slate-500'
                  }`}
                />
              </button>
            </div>

            {/* Quick Contact & Action Buttons */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 font-mono truncate mr-2">
                {card.phone ? (
                  <>
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{card.phone}</span>
                  </>
                ) : card.email ? (
                  <>
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-sans">{card.email}</span>
                  </>
                ) : (
                  <span className="text-slate-400 text-[11px]">터치하여 상세 보기</span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => onShowQR(card, e)}
                  title="QR 코드 보기"
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDownload}
                  title="연락처(vCard) 다운로드"
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Synthetic Design Card (사진이 없을 때 표시되는 그래픽 테마 카드) */
        <div 
          className={`w-full rounded-3xl p-5 sm:p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[220px] sm:min-h-[240px] shadow-sm hover:shadow-md ${theme.cardBg}`}
        >
          {/* Subtle Background Pattern */}
          <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute right-6 top-6 w-32 h-32 rounded-full border border-white/5 pointer-events-none" />

          {/* Top Section */}
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-2 max-w-[80%]">
              <Building2 className={`w-4 h-4 shrink-0 ${theme.accentColor}`} />
              <span className={`text-xs font-semibold tracking-wider uppercase truncate ${theme.subTextColor}`}>
                {card.company || '프리랜서 / 개인'}
              </span>
              {card.department && (
                <span className={`text-[11px] truncate opacity-75 ${theme.subTextColor}`}>
                  · {card.department}
                </span>
              )}
            </div>

            <button
              onClick={(e) => onToggleFavorite(card.id, e)}
              title={card.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              className="p-1 rounded-full hover:bg-white/10 transition active:scale-90"
            >
              <Star
                className={`w-4 h-4 transition ${
                  card.isFavorite 
                    ? 'fill-amber-400 text-amber-400' 
                    : 'text-white/40 hover:text-white/80'
                }`}
              />
            </button>
          </div>

          {/* Middle Section */}
          <div className="my-auto py-2 relative z-10">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textColor}`}>
                {card.name}
              </h3>
              {card.position && (
                <span className={`text-xs sm:text-sm font-medium ${theme.accentColor}`}>
                  {card.position}
                </span>
              )}
            </div>

            {/* Tags */}
            {card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {card.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${theme.badgeBg} ${theme.badgeText}`}
                  >
                    <Tag className="w-2.5 h-2.5 opacity-60" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <div className="pt-3 border-t border-white/10 space-y-1 relative z-10 text-xs">
            {card.phone && (
              <div className={`flex items-center gap-2 truncate ${theme.subTextColor}`}>
                <Phone className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="font-mono">{card.phone}</span>
              </div>
            )}
            {card.email && (
              <div className={`flex items-center gap-2 truncate ${theme.subTextColor}`}>
                <Mail className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="truncate">{card.email}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="absolute right-3 bottom-3 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => onShowQR(card, e)}
              title="QR 코드 보기"
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition active:scale-95"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              title="연락처(vCard) 파일 다운로드"
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition active:scale-95"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
