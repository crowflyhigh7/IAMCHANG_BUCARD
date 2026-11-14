import React from 'react';
import { 
  CreditCard, 
  Search, 
  Plus, 
  Star, 
  QrCode 
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'cards' | 'favorites' | 'search';
  onSelectTab: (tab: 'cards' | 'favorites' | 'search') => void;
  onOpenNewCard: () => void;
  onOpenMyCard: () => void;
  favoriteCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewCard,
  onOpenMyCard,
  favoriteCount,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 pb-safe transition-all shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {/* All Cards */}
        <button
          onClick={() => onSelectTab('cards')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            activeTab === 'cards' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <CreditCard className={`w-5 h-5 transition-transform ${activeTab === 'cards' ? 'scale-110' : ''}`} />
          <span className="text-[11px] mt-1">명함첩</span>
        </button>

        {/* Search */}
        <button
          onClick={() => onSelectTab('search')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            activeTab === 'search' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Search className={`w-5 h-5 transition-transform ${activeTab === 'search' ? 'scale-110' : ''}`} />
          <span className="text-[11px] mt-1">검색</span>
        </button>

        {/* Center Floating Add Button */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            onClick={onOpenNewCard}
            aria-label="새 명함 등록"
            className="w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/35 active:scale-90 transition-transform"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Favorites */}
        <button
          onClick={() => onSelectTab('favorites')}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative transition ${
            activeTab === 'favorites' ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Star className={`w-5 h-5 transition-transform ${activeTab === 'favorites' ? 'scale-110 fill-amber-500' : ''}`} />
          <span className="text-[11px] mt-1">즐겨찾기</span>
          {favoriteCount > 0 && (
            <span className="absolute top-1 right-4 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {favoriteCount}
            </span>
          )}
        </button>

        {/* My Card QR */}
        <button
          onClick={onOpenMyCard}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-indigo-600 font-medium transition active:scale-95"
        >
          <QrCode className="w-5 h-5 text-indigo-600" />
          <span className="text-[11px] mt-1 text-slate-600">내 명함</span>
        </button>
      </div>
    </nav>
  );
};
