import React from 'react';
import { 
  X, 
  Download, 
  Share, 
  PlusSquare, 
  Smartphone, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

interface InstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess: () => void;
}

export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess,
}) => {
  if (!isOpen) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        onInstallSuccess();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 mb-safe transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <Smartphone className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-xl font-extrabold text-slate-900">
          BUCARD를 홈 화면에 설치하세요
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5">
          앱스토어 다운로드 없이, 스마트폰 홈 화면에 바로 설치하여 네이티브 앱처럼 오프라인에서도 빠르게 사용할 수 있습니다.
        </p>

        {/* Benefits list */}
        <div className="space-y-2 mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>상대방에게 보여줄 내 명함 QR 즉시 실행</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>오프라인이나 인터넷이 불안정한 환경에서도 동작</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>브라우저 주소창 없는 깔끔한 전체 화면 앱</span>
          </div>
        </div>

        {/* Conditional Content based on iOS vs Android/Desktop */}
        {isIOS ? (
          <div className="space-y-3 bg-blue-50/60 border border-blue-100 p-4 rounded-2xl text-xs text-slate-700">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>아이폰(iOS) 사파리 설치 방법</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
              <span>하단 바의 <strong className="text-blue-700 inline-flex items-center gap-0.5"><Share className="w-3.5 h-3.5" /> 공유</strong> 버튼을 터치합니다.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
              <span>메뉴를 아래로 내려 <strong className="text-blue-700 inline-flex items-center gap-0.5"><PlusSquare className="w-3.5 h-3.5" /> 홈 화면에 추가</strong>를 선택합니다.</span>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-3 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md transition active:scale-95"
            >
              확인했습니다
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>앱 바로 설치하기</span>
              </button>
            ) : (
              <p className="text-xs text-slate-500 text-center w-full py-2">
                브라우저 메뉴(⋮)에서 <strong>'앱 설치'</strong> 또는 <strong>'홈 화면에 추가'</strong>를 선택하세요.
              </p>
            )}
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              나중에
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
