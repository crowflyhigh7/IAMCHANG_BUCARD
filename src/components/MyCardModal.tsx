import React, { useState } from 'react';
import { 
  X, 
  Edit3, 
  QrCode, 
  Download, 
  Share2, 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  Sparkles,
  Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BusinessCardData } from '../types/card';
import { THEME_CONFIGS } from '../utils/theme';
import { downloadVCard, generateVCardString } from '../utils/vcard';

interface MyCardModalProps {
  myCard: BusinessCardData;
  isOpen: boolean;
  onClose: () => void;
  onEditMyCard: () => void;
}

export const MyCardModal: React.FC<MyCardModalProps> = ({
  myCard,
  isOpen,
  onClose,
  onEditMyCard,
}) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const theme = THEME_CONFIGS[myCard.theme] || THEME_CONFIGS['slate-dark'];
  const vCardStr = generateVCardString(myCard);

  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: `${myCard.name}의 디지털 명함`,
        text: `${myCard.company} ${myCard.position} ${myCard.name}의 연락처입니다.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>내 디지털 명함</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEditMyCard();
              }}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition text-xs flex items-center gap-1 font-semibold"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>정보 수정</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Card Presentation Section */}
        <div className="p-6 space-y-6">
          {/* Virtual Card Rendering */}
          <div className={`w-full rounded-2xl p-6 ${theme.cardBg} shadow-xl relative overflow-hidden transition-all duration-300 min-h-[220px] flex flex-col justify-between`}>
            {/* Background elements */}
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />

            {/* Top row */}
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold tracking-wider uppercase ${theme.subTextColor}`}>
                {myCard.company || 'BUCARD'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${theme.badgeBg} ${theme.badgeText}`}>
                내 프로필
              </span>
            </div>

            {/* Middle row */}
            <div className="my-auto py-3">
              <h3 className={`text-2xl font-black tracking-tight ${theme.textColor}`}>
                {myCard.name}
              </h3>
              <p className={`text-sm font-medium mt-0.5 ${theme.accentColor}`}>
                {myCard.position || '직책'} {myCard.department ? `· ${myCard.department}` : ''}
              </p>
            </div>

            {/* Bottom contact info */}
            <div className="space-y-1 text-xs pt-3 border-t border-white/10">
              {myCard.phone && (
                <div className={`flex items-center gap-2 font-mono ${theme.subTextColor}`}>
                  <Phone className="w-3.5 h-3.5 opacity-70" />
                  <span>{myCard.phone}</span>
                </div>
              )}
              {myCard.email && (
                <div className={`flex items-center gap-2 ${theme.subTextColor}`}>
                  <Mail className="w-3.5 h-3.5 opacity-70" />
                  <span className="truncate">{myCard.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Presentation (Scan directly with phone camera) */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-center space-y-3">
            <div className="inline-block bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200">
              <QRCodeSVG 
                value={vCardStr} 
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                카메라로 스캔하여 연락처 바로 추가
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                상대방 스마트폰 기본 카메라로 비추면 바로 주소록에 등록됩니다.
              </p>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => downloadVCard(myCard)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-md transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>vCard 저장</span>
            </button>
            <button
              onClick={handleShareLink}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>링크 복사완료!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>웹링크 공유</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
