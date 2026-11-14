import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Star, 
  Layers, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  Tag as TagIcon, 
  Briefcase,
  ExternalLink,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { BusinessCardData, ViewMode } from './types/card';
import { 
  loadCards, 
  saveCards, 
  loadMyCard, 
  saveMyCard,
  INITIAL_CARDS 
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { BusinessCard } from './components/BusinessCard';
import { CardModal } from './components/CardModal';
import { CardFormModal } from './components/CardFormModal';
import { MyCardModal } from './components/MyCardModal';
import { ShareQRModal } from './components/ShareQRModal';
import { THEME_CONFIGS } from './utils/theme';
import { downloadVCard } from './utils/vcard';

export function App() {
  const [cards, setCards] = useState<BusinessCardData[]>([]);
  const [myCard, setMyCard] = useState<BusinessCardData>(loadMyCard());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'name' | 'company'>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Modals state
  const [selectedCard, setSelectedCard] = useState<BusinessCardData | null>(null);
  const [qrModalCard, setQrModalCard] = useState<BusinessCardData | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<BusinessCardData | null>(null);
  const [isMyCardModalOpen, setIsMyCardModalOpen] = useState(false);
  const [isEditingMyCard, setIsEditingMyCard] = useState(false);

  // Initial load
  useEffect(() => {
    setCards(loadCards());
  }, []);

  // Save on state change
  const handleUpdateCards = (newCards: BusinessCardData[]) => {
    setCards(newCards);
    saveCards(newCards);
  };

  const handleUpdateMyCard = (updated: BusinessCardData) => {
    setMyCard(updated);
    saveMyCard(updated);
  };

  // Toggle favorite
  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = cards.map((c) => 
      c.id === id ? { ...c, isFavorite: !c.isFavorite, updatedAt: Date.now() } : c
    );
    handleUpdateCards(updated);
    if (selectedCard && selectedCard.id === id) {
      setSelectedCard((prev) => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  // Save or edit card
  const handleSaveCard = (cardData: Omit<BusinessCardData, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => {
    if (isEditingMyCard) {
      const updated: BusinessCardData = {
        ...myCard,
        ...cardData,
        updatedAt: Date.now(),
      };
      handleUpdateMyCard(updated);
      setIsEditingMyCard(false);
      return;
    }

    if (id) {
      // Edit existing
      const updated = cards.map((c) => 
        c.id === id 
          ? { ...c, ...cardData, updatedAt: Date.now() } 
          : c
      );
      handleUpdateCards(updated);
    } else {
      // Create new
      const newCard: BusinessCardData = {
        ...cardData,
        id: 'card-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      handleUpdateCards([newCard, ...cards]);
    }
  };

  // Delete card
  const handleDeleteCard = (id: string) => {
    const updated = cards.filter((c) => c.id !== id);
    handleUpdateCards(updated);
  };

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagCount: Record<string, number> = {};
    cards.forEach((card) => {
      card.tags?.forEach((t) => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    });
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [cards]);

  // Filtered & Sorted cards
  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = card.name.toLowerCase().includes(q);
          const matchCompany = card.company?.toLowerCase().includes(q);
          const matchPosition = card.position?.toLowerCase().includes(q);
          const matchDept = card.department?.toLowerCase().includes(q);
          const matchPhone = card.phone?.includes(q);
          const matchEmail = card.email?.toLowerCase().includes(q);
          const matchMemo = card.memo?.toLowerCase().includes(q);
          const matchTag = card.tags?.some((t) => t.toLowerCase().includes(q));
          if (!(matchName || matchCompany || matchPosition || matchDept || matchPhone || matchEmail || matchMemo || matchTag)) {
            return false;
          }
        }

        // Tag filter
        if (selectedTag && !card.tags?.includes(selectedTag)) {
          return false;
        }

        // Favorites filter
        if (onlyFavorites && !card.isFavorite) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name, 'ko');
        }
        if (sortBy === 'company') {
          return (a.company || '').localeCompare(b.company || '', 'ko');
        }
        // Latest (createdAt desc)
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [cards, searchQuery, selectedTag, onlyFavorites, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col">
      {/* Navigation Bar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCards={cards.length}
        cards={cards}
        myCard={myCard}
        onImportBackup={(newCards, newMy) => {
          handleUpdateCards(newCards);
          if (newMy) handleUpdateMyCard(newMy);
        }}
        onOpenNewModal={() => {
          setEditingCard(null);
          setIsEditingMyCard(false);
          setIsFormModalOpen(true);
        }}
        onOpenMyCardModal={() => setIsMyCardModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Hero Quick Banner / Summary Bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
              {myCard.name.slice(0, 1) || 'B'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">
                  {myCard.name}님의 명함첩
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  총 {cards.length}장 보관 중
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {myCard.company} · {myCard.position}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMyCardModalOpen(true)}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition active:scale-95 shadow-sm"
            >
              내 명함 QR 열기
            </button>
            <button
              onClick={() => {
                setEditingCard(null);
                setIsEditingMyCard(false);
                setIsFormModalOpen(true);
              }}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition active:scale-95 shadow-sm shadow-blue-600/20 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>명함 추가</span>
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          {/* Tag filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs no-scrollbar">
            <button
              onClick={() => {
                setSelectedTag(null);
                setOnlyFavorites(false);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
                !selectedTag && !onlyFavorites
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              전체 ({cards.length})
            </button>

            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition ${
                onlyFavorites
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-white' : 'text-amber-500'}`} />
              <span>즐겨찾기</span>
            </button>

            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1 transition ${
                  selectedTag === tag
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>#{tag}</span>
              </button>
            ))}
          </div>

          {/* View Mode & Sort */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-medium text-slate-600">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent outline-none cursor-pointer py-0.5"
              >
                <option value="latest">최신 등록순</option>
                <option value="name">이름 가나다순</option>
                <option value="company">회사 가나다순</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                title="카드 그리드 뷰"
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' 
                    ? 'bg-slate-100 text-slate-900 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="목록 리스트 뷰"
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list' 
                    ? 'bg-slate-100 text-slate-900 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Card Grid / List */}
        {filteredCards.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCards.map((card) => (
                <BusinessCard
                  key={card.id}
                  card={card}
                  onClick={(c) => setSelectedCard(c)}
                  onToggleFavorite={handleToggleFavorite}
                  onShowQR={(c, e) => {
                    e.stopPropagation();
                    setQrModalCard(c);
                  }}
                />
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
              {filteredCards.map((card) => {
                const cfg = THEME_CONFIGS[card.theme];
                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="p-4 sm:px-6 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl ${cfg.previewBg} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm`}>
                        {card.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {card.name}
                          </h4>
                          {card.position && (
                            <span className="text-xs text-slate-500 font-medium truncate">
                              {card.position}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {card.company || '소속 미지정'} {card.department ? `· ${card.department}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {card.phone && (
                        <span className="text-xs font-mono text-slate-600 hidden sm:inline">
                          {card.phone}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleToggleFavorite(card.id, e)}
                        className="p-1.5 rounded-lg hover:bg-slate-200/60 transition"
                      >
                        <Star className={`w-4 h-4 ${card.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Empty State */
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {searchQuery || selectedTag || onlyFavorites
                ? '조건에 맞는 명함이 없습니다.'
                : '등록된 명함이 없습니다.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              {searchQuery || selectedTag || onlyFavorites
                ? '검색어나 필터를 초기화해 보세요.'
                : '첫 번째 비즈니스 파트너의 명함을 등록하고 스마트하게 관리해보세요.'}
            </p>
            {searchQuery || selectedTag || onlyFavorites ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag(null);
                  setOnlyFavorites(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                필터 초기화
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingCard(null);
                  setIsEditingMyCard(false);
                  setIsFormModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/25 transition"
              >
                + 새 명함 등록하기
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">
          BUCARD · 스마트 명함 관리 웹앱 (bucard.iamchang.me)
        </p>
        <p className="text-slate-400">
          Powered by React, Vite, Tailwind CSS & Cloudflare Pages
        </p>
      </footer>

      {/* Modals */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onEdit={(card) => {
            setEditingCard(card);
            setIsEditingMyCard(false);
            setIsFormModalOpen(true);
          }}
          onDelete={handleDeleteCard}
          onToggleFavorite={(id) => handleToggleFavorite(id)}
        />
      )}

      {/* QR Modal */}
      <ShareQRModal
        card={qrModalCard}
        onClose={() => setQrModalCard(null)}
      />

      {/* Card Form Modal (New / Edit) */}
      <CardFormModal
        isOpen={isFormModalOpen}
        initialData={isEditingMyCard ? myCard : editingCard}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCard(null);
          setIsEditingMyCard(false);
        }}
        onSave={handleSaveCard}
      />

      {/* My Card Fullscreen Modal */}
      <MyCardModal
        isOpen={isMyCardModalOpen}
        myCard={myCard}
        onClose={() => setIsMyCardModalOpen(false)}
        onEditMyCard={() => {
          setIsEditingMyCard(true);
          setIsFormModalOpen(true);
        }}
      />
    </div>
  );
}
