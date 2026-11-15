import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Star, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  FolderOpen,
  Smartphone,
  Download,
  X,
  Camera,
  Cloud,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { BusinessCardData, ViewMode } from './types/card';
import { 
  fetchCards, 
  createCard, 
  updateCard, 
  deleteCard, 
  fetchMyCard, 
  saveMyCardApi 
} from './utils/api';
import { loadCards, loadMyCard } from './utils/storage';
import { Navbar } from './components/Navbar';
import { BusinessCard } from './components/BusinessCard';
import { CardModal } from './components/CardModal';
import { CardFormModal } from './components/CardFormModal';
import { MyCardModal } from './components/MyCardModal';
import { ShareQRModal } from './components/ShareQRModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { InstallPromptModal } from './components/InstallPromptModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { THEME_CONFIGS } from './utils/theme';

export function App() {
  const [cards, setCards] = useState<BusinessCardData[]>(loadCards());
  const [myCard, setMyCard] = useState<BusinessCardData>(loadMyCard());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'name' | 'company'>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isSyncing, setIsSyncing] = useState(false);

  // Mobile navigation state
  const [mobileTab, setMobileTab] = useState<'cards' | 'favorites' | 'search'>('cards');

  // Modals state
  const [selectedCard, setSelectedCard] = useState<BusinessCardData | null>(null);
  const [qrModalCard, setQrModalCard] = useState<BusinessCardData | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [openLiveCameraOnForm, setOpenLiveCameraOnForm] = useState(false);
  const [editingCard, setEditingCard] = useState<BusinessCardData | null>(null);
  const [isMyCardModalOpen, setIsMyCardModalOpen] = useState(false);
  const [isEditingMyCard, setIsEditingMyCard] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Load from Cloudflare D1 Backend on mount
  const syncWithCloud = async () => {
    setIsSyncing(true);
    try {
      const [remoteCards, remoteMyCard] = await Promise.all([
        fetchCards(),
        fetchMyCard()
      ]);
      setCards(remoteCards);
      if (remoteMyCard) setMyCard(remoteMyCard);
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncWithCloud();

    // Check standalone PWA mode
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!checkStandalone) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Shortcuts support
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('open') === 'mycard') {
      setIsMyCardModalOpen(true);
    } else if (urlParams.get('open') === 'add') {
      setIsFormModalOpen(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Toggle favorite
  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = cards.find((c) => c.id === id);
    if (!target) return;

    const updated = { ...target, isFavorite: !target.isFavorite, updatedAt: Date.now() };
    const nextList = cards.map((c) => (c.id === id ? updated : c));
    setCards(nextList);
    if (selectedCard && selectedCard.id === id) {
      setSelectedCard(updated);
    }

    await updateCard(updated);
  };

  // Save or edit card
  const handleSaveCard = async (cardData: Omit<BusinessCardData, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => {
    if (isEditingMyCard) {
      const updated: BusinessCardData = {
        ...myCard,
        ...cardData,
        updatedAt: Date.now(),
      };
      setMyCard(updated);
      setIsEditingMyCard(false);
      await saveMyCardApi(updated);
      return;
    }

    if (id) {
      // Edit existing
      const existing = cards.find((c) => c.id === id);
      const updated: BusinessCardData = {
        ...existing,
        ...cardData,
        id,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      setCards(cards.map((c) => (c.id === id ? updated : c)));
      await updateCard(updated);
    } else {
      // Create new
      const newCard: BusinessCardData = {
        ...cardData,
        id: 'card-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setCards([newCard, ...cards]);
      await createCard(newCard);
    }
  };

  // Delete card
  const handleDeleteCard = async (id: string) => {
    setCards(cards.filter((c) => c.id !== id));
    await deleteCard(id);
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

  const favoriteCount = useMemo(() => {
    return cards.filter((c) => c.isFavorite).length;
  }, [cards]);

  // Handle Mobile Bottom Nav tab changes
  const handleSelectMobileTab = (tab: 'cards' | 'favorites' | 'search') => {
    setMobileTab(tab);
    if (tab === 'cards') {
      setOnlyFavorites(false);
      setSelectedTag(null);
    } else if (tab === 'favorites') {
      setOnlyFavorites(true);
      setSelectedTag(null);
    } else if (tab === 'search') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        input?.focus();
      }, 100);
    }
  };

  // Filtered & Sorted cards
  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
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

        if (selectedTag && !card.tags?.includes(selectedTag)) {
          return false;
        }

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
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [cards, searchQuery, selectedTag, onlyFavorites, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* PWA Mobile Install Top Notification Banner */}
      {!isStandalone && showInstallBanner && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 flex items-center justify-between text-xs shadow-md transition-all">
          <div className="flex items-center gap-2 font-medium">
            <Smartphone className="w-4 h-4 text-cyan-300 animate-pulse" />
            <span>BUCARD를 홈 화면에 앱으로 설치해보세요!</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="bg-white text-blue-700 font-bold px-3 py-1 rounded-lg text-xs shadow-xs hover:bg-blue-50 transition active:scale-95"
            >
              설치하기
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="p-1 hover:bg-white/20 rounded-md text-white/80 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCards={cards.length}
        cards={cards}
        myCard={myCard}
        onImportBackup={async (newCards, newMy) => {
          setCards(newCards);
          if (newMy) setMyCard(newMy);
          // Sync backup to D1
          for (const c of newCards) {
            await createCard(c);
          }
        }}
        onOpenNewModal={() => {
          setEditingCard(null);
          setIsEditingMyCard(false);
          setIsFormModalOpen(true);
        }}
        onOpenMyCardModal={() => setIsMyCardModalOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 pb-28 md:pb-8">
        {/* Hero Quick Banner / Summary Bar */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center font-extrabold text-lg sm:text-xl shadow-md shadow-blue-500/20 shrink-0">
              {myCard.name.slice(0, 1) || 'B'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                  {myCard.name}님의 클라우드 명함첩
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-emerald-600" />
                  <span>Cloudflare D1 & R2 연동</span>
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                  {cards.length}장 보관 중
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {myCard.company} {myCard.position ? `· ${myCard.position}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={syncWithCloud}
              disabled={isSyncing}
              title="클라우드 실시간 새로고침"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={() => setIsMyCardModalOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition active:scale-95 shadow-xs text-center"
            >
              내 명함 QR
            </button>
            <button
              onClick={() => {
                setEditingCard(null);
                setIsEditingMyCard(false);
                setOpenLiveCameraOnForm(true);
                setIsFormModalOpen(true);
              }}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition active:scale-95 shadow-md shadow-blue-600/25 flex items-center justify-center gap-1.5"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>명함 스캔 / 등록</span>
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          {/* Tag filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs no-scrollbar">
            <button
              onClick={() => {
                setSelectedTag(null);
                setOnlyFavorites(false);
                setMobileTab('cards');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-medium shrink-0 transition ${
                !selectedTag && !onlyFavorites
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              전체 ({cards.length})
            </button>

            <button
              onClick={() => {
                setOnlyFavorites(!onlyFavorites);
                setMobileTab(!onlyFavorites ? 'favorites' : 'cards');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition ${
                onlyFavorites
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-white' : 'text-amber-500'}`} />
              <span>즐겨찾기 ({favoriteCount})</span>
            </button>

            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1 transition ${
                  selectedTag === tag
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>#{tag}</span>
              </button>
            ))}
          </div>

          {/* View Mode & Sort */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 shadow-2xs">
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
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
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
            <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs divide-y divide-slate-100">
              {filteredCards.map((card) => {
                const cfg = THEME_CONFIGS[card.theme];
                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="p-4 sm:px-6 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-4 active:bg-slate-100/70"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {card.avatarUrl ? (
                        <img
                          src={card.avatarUrl}
                          alt={card.name}
                          className="w-12 h-8 object-cover rounded-lg border border-slate-200 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-2xl ${cfg.previewBg} text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs`}>
                          {card.name.slice(0, 1)}
                        </div>
                      )}
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
                        className="p-2 rounded-xl hover:bg-slate-200/60 transition"
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
                : '첫 번째 비즈니스 파트너의 명함을 카메라로 찍어 클라우드에 스마트하게 등록해보세요.'}
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
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/25 transition active:scale-95 flex items-center gap-1.5 mx-auto"
              >
                <Camera className="w-4 h-4" />
                <span>명함 카메라 촬영 / 등록</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="hidden md:block border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">
          BUCARD · 클라우드 실시간 동기화 명함 지갑 (bucard.iamchang.me)
        </p>
        <p className="text-slate-400">
          Cloudflare D1 Database & R2 Storage · Gemini AI Vision · React
        </p>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={mobileTab}
        onSelectTab={handleSelectMobileTab}
        onOpenNewCard={() => {
          setEditingCard(null);
          setIsEditingMyCard(false);
          setIsFormModalOpen(true);
        }}
        onOpenMyCard={() => setIsMyCardModalOpen(true)}
        favoriteCount={favoriteCount}
      />

      {/* PWA Install Modal */}
      <InstallPromptModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => {
          setIsStandalone(true);
          setShowInstallBanner(false);
        }}
      />

      {/* Gemini API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaved={() => {
          console.log('Gemini API Key saved');
        }}
      />

      {/* Card Detail Modal */}
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
        initialOpenLiveCamera={openLiveCameraOnForm}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCard(null);
          setIsEditingMyCard(false);
          setOpenLiveCameraOnForm(false);
        }}
        onSave={handleSaveCard}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
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
