import React from 'react';
import { X, Download, UserCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BusinessCardData } from '../types/card';
import { generateVCardString, downloadVCard } from '../utils/vcard';

interface ShareQRModalProps {
  card: BusinessCardData | null;
  onClose: () => void;
}

export const ShareQRModal: React.FC<ShareQRModalProps> = ({ card, onClose }) => {
  if (!card) return null;

  const vCardStr = generateVCardString(card);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <UserCheck className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">{card.name} 명함 QR</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {card.company} {card.position ? `· ${card.position}` : ''}
        </p>

        {/* QR container */}
        <div className="my-5 inline-block p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <QRCodeSVG 
            value={vCardStr} 
            size={190} 
            level="M" 
          />
        </div>

        <p className="text-xs text-slate-500 mb-4">
          스마트폰 기본 카메라로 비추면 연락처에 바로 저장됩니다.
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => downloadVCard(card)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>vCard 다운로드</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
