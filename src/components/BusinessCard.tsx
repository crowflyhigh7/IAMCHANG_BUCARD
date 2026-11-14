import React from 'react';
import { 
  Building2, 
  Mail, 
  Phone, 
  Star, 
  Download, 
  QrCode,
  Tag,
  ImageIcon
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
      className="group relative cursor-pointer select-none transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl rounded-2xl"
    >
      {/* 1. Real Photo Card View (실제 촬영/업로드한 실물 명함 사진이 있는 경우) */}
      {hasPhoto ? (
        <div className="w-full rounded-2xl overflow-hidden shadow-md border border-slate-200/80 bg-slate-900 relative min-h-[220px] sm:min-h-[240px] flex flex-col justify-between group-hover:border-blue-500/50 transition-all">
          {/* Background Real Business Card Photo */}
          <div className="absolute inset-0 z-0 bg-slate-950">
            <img
              src={card.avatarUrl}
              alt={`${card.name} 명함 사진`}
              className="w-full h-full object-cover object-center filter brightness-[0.92] group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {/* Top gradient shadow for badge readability */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />
            {/* Bottom gradient shadow for info readability */}
            <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/90 via-black/55 to-transparent pointer-events-none" />
          </div>

          {/* Top Row: Company & Favorite */}
          <div className="flex items-start justify-between relative z-10 p-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white max-w-[80%]">
              <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-[11px] font-semibold truncate">
                {card.company || '실물 명함'}
              </span>
            </div>

            <button
              onClick={(e) => onToggleFavorite(card.id, e)}
              title={card.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md transition active:scale-90"
            >
              <Star
                className={`w-4 h-4 transition ${
                  card.isFavorite 
                    ? 'fill-amber-400 text-amber-400' 
                    : 'text-white/70 hover:text-white'
                }`}
              />
            </button>
          </div>

          {/* Bottom Row: Name, Position, Quick contacts overlay */}
          <div className="relative z-10 p-4 pt-0">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight drop-shadow-md">
                {card.name}
              </h3>
              {card.position && (
                <span className="text-xs sm:text-sm font-semibold text-blue-300 drop-shadow-sm">
                  {card.position}
                </span>
              )}
            </div>

            {/* Sub-contact details */}
            <div className="flex items-center gap-3 text-xs text-white/80 mt-1 font-mono">
              {card.phone && <span>{card.phone}</span>}
              {card.email && <span className="truncate text-white/60 font-sans">· {card.email}</span>}
            </div>

            {/* Real photo badge */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/15">
              <span className="text-[10px] text-white/70 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-emerald-400" />
                <span>실물 명함 촬영됨</span>
              </span>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => onShowQR(card, e)}
                  title="QR 코드 보기"
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDownload}
                  title="연락처(vCard) 다운로드"
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Synthetic Design Card View (사진이 없는 경우 기존 테마 그래픽 카드) */
        <div 
          className={`w-full rounded-2xl p-5 sm:p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[220px] sm:min-h-[240px] ${theme.cardBg}`}
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
                {card.tags.length > 3 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${theme.badgeBg} ${theme.badgeText}`}>
                    +{card.tags.length - 3}
                  </span>
                )}
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

          {/* Quick action buttons on hover */}
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
