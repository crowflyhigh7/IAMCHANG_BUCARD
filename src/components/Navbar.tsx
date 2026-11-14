import React, { useRef } from 'react';
import { 
  CreditCard, 
  Plus, 
  QrCode, 
  Search, 
  Download, 
  Upload, 
  Key,
  Camera,
  Sparkles
} from 'lucide-react';
import { BusinessCardData } from '../types/card';
import { exportBackupJSON } from '../utils/storage';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCards: number;
  onOpenNewModal: () => void;
  onOpenMyCardModal: () => void;
  onOpenApiKeyModal: () => void;
  cards: BusinessCardData[];
  myCard: BusinessCardData;
  onImportBackup: (importedCards: BusinessCardData[], importedMyCard?: BusinessCardData) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  totalCards,
  onOpenNewModal,
  onOpenMyCardModal,
  onOpenApiKeyModal,
  cards,
  myCard,
  onImportBackup,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportBackupJSON(cards, myCard);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json.cards)) {
          onImportBackup(json.cards, json.myCard);
          alert(`성공적으로 ${json.cards.length}개의 명함 데이터를 불러왔습니다.`);
        } else {
          alert('올바른 BUCARD 백업 파일 형식이 아닙니다.');
        }
      } catch (err) {
        alert('백업 파일을 파싱하는 데 실패했습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all shadow-xs pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  BUCARD
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 hidden sm:inline-block">
                  AI OCR
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block leading-none mt-0.5">
                스마트 디지털 명함 관리 지갑
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md mx-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="이름, 회사, 직책, 태그 검색..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-slate-400 text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  지우기
                </button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* AI API Key Button */}
            <button
              onClick={onOpenApiKeyModal}
              title="Gemini AI 키 설정"
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
            >
              <Key className="w-4 h-4" />
            </button>

            {/* My Card Button */}
            <button
              onClick={onOpenMyCardModal}
              title="내 디지털 명함 보기 및 QR 공유"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition active:scale-95"
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>내 명함</span>
            </button>

            {/* Backup / Export Menu */}
            <div className="hidden lg:flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                onClick={handleExport}
                title="데이터 백업 (JSON 다운로드)"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="데이터 복원 (JSON 파일 업로드)"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>

            {/* Add Card Button */}
            <button
              onClick={onOpenNewModal}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition active:scale-95"
            >
              <Camera className="w-4 h-4 sm:hidden stroke-[2.5]" />
              <Plus className="w-4 h-4 hidden sm:inline stroke-[2.5]" />
              <span className="hidden xs:inline">명함 추가</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
