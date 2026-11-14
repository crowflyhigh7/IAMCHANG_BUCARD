import React, { useState } from 'react';
import { 
  X, 
  Key, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Info 
} from 'lucide-react';
import { getGeminiApiKey, saveGeminiApiKey } from '../utils/geminiOcr';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [keyInput, setKeyInput] = useState(getGeminiApiKey());
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      alert('API 키를 입력해주세요.');
      return;
    }
    saveGeminiApiKey(keyInput.trim());
    setIsSaved(true);
    onSaved(keyInput.trim());
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <Key className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <span>AI 명함 인식 API 키 설정</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
            무료
          </span>
        </h3>
        <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
          구글 Gemini AI를 이용해 카메라로 찍은 명함의 이름, 연락처, 회사명을 1초 만에 99% 정확도로 자동 추출합니다.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Google AI Studio API Key
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition font-mono"
            />
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between font-bold text-blue-900">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                무료 API 키 발급 방법 (1분 소요)
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>발급받기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-0.5">
              <li>Google AI Studio 로그인 (구글 계정)</li>
              <li><strong>"Create API key"</strong> 버튼 클릭</li>
              <li>발급된 키를 복사하여 위 입력란에 붙여넣기</li>
            </ol>
            <p className="text-[11px] text-slate-500 pt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>입력하신 키는 서버로 전송되지 않고 본인 기기(브라우저)에만 암호화 보관됩니다.</span>
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              닫기
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition active:scale-95"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>저장 완료!</span>
                </>
              ) : (
                <span>API 키 저장하기</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
