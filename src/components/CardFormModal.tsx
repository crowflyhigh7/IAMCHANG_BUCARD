import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  Building2, 
  Briefcase, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  FileText, 
  Tag as TagIcon,
  Palette,
  Check,
  Camera,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Key,
  Crop
} from 'lucide-react';
import { BusinessCardData, CardTheme } from '../types/card';
import { THEME_CONFIGS } from '../utils/theme';
import { 
  getGeminiApiKey, 
  resizeImageToDataUrl, 
  extractCardInfoWithGemini 
} from '../utils/geminiOcr';
import { uploadCardImage } from '../utils/api';
import { ImageCropModal } from './ImageCropModal';
import { LiveCameraScannerModal } from './LiveCameraScannerModal';
import { CropRect, detectCardBounds, cropImageByRect } from '../utils/imageCrop';

interface CardFormModalProps {
  initialData?: BusinessCardData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Omit<BusinessCardData, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => void;
  onOpenApiKeyModal: () => void;
}

const THEME_OPTIONS: CardTheme[] = [
  'modern-blue',
  'slate-dark',
  'emerald-fresh',
  'purple-luxury',
  'sunset-gradient',
  'minimal-white',
];

export const CardFormModal: React.FC<CardFormModalProps> = ({
  initialData,
  isOpen,
  onClose,
  onSave,
  onOpenApiKeyModal,
}) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [theme, setTheme] = useState<CardTheme>('modern-blue');
  const [isFavorite, setIsFavorite] = useState(false);

  // AI OCR & Photo state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState('');
  const [scannedImagePreview, setScannedImagePreview] = useState<string | null>(null);

  // Interactive Crop Modal state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rawPhotoDataUrl, setRawPhotoDataUrl] = useState<string | null>(null);
  const [detectedCropRect, setDetectedCropRect] = useState<CropRect | null>(null);

  // Live Real-time Camera Scanner state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPosition(initialData.position || '');
      setCompany(initialData.company || '');
      setDepartment(initialData.department || '');
      setPhone(initialData.phone || '');
      setTel(initialData.tel || '');
      setEmail(initialData.email || '');
      setWebsite(initialData.website || '');
      setAddress(initialData.address || '');
      setMemo(initialData.memo || '');
      setTagInput(initialData.tags?.join(', ') || '');
      setTheme(initialData.theme || 'modern-blue');
      setIsFavorite(initialData.isFavorite ?? false);
      setScannedImagePreview(initialData.avatarUrl || null);
    } else {
      setName('');
      setPosition('');
      setCompany('');
      setDepartment('');
      setPhone('');
      setTel('');
      setEmail('');
      setWebsite('');
      setAddress('');
      setMemo('');
      setTagInput('');
      setTheme('modern-blue');
      setIsFavorite(false);
      setScannedImagePreview(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // 오려낸 깨끗한 명함 사진으로 R2 업로드 및 Gemini OCR 수행
  const processCroppedImage = async (croppedDataUrl: string, croppedBase64: string) => {
    setScannedImagePreview(croppedDataUrl);

    // 1. 오려낸 명함을 Cloudflare R2에 비동기 업로드
    uploadCardImage(croppedBase64, 'image/jpeg')
      .then((r2Url) => {
        if (r2Url) setScannedImagePreview(r2Url);
      })
      .catch((err) => console.warn('R2 upload failed:', err));

    // 2. Gemini API 키 확인 후 AI 텍스트 판독
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setIsScanning(false);
      alert('AI 명함 인식을 위해 Google Gemini 무료 API 키를 등록해주세요.');
      onOpenApiKeyModal();
      return;
    }

    try {
      setIsScanning(true);
      setScanStatusMessage('AI 모델 연결 및 명함 정밀 판독 중...');

      const extracted = await extractCardInfoWithGemini(
        croppedBase64,
        'image/jpeg',
        apiKey,
        (msg) => setScanStatusMessage(msg)
      );

      // Auto-fill form fields
      if (extracted.name) setName(extracted.name);
      if (extracted.position) setPosition(extracted.position);
      if (extracted.company) setCompany(extracted.company);
      if (extracted.department) setDepartment(extracted.department);
      if (extracted.phone) setPhone(extracted.phone);
      if (extracted.tel) setTel(extracted.tel);
      if (extracted.email) setEmail(extracted.email);
      if (extracted.website) setWebsite(extracted.website);
      if (extracted.address) setAddress(extracted.address);
      if (extracted.memo) setMemo(extracted.memo);
      if (extracted.tags && extracted.tags.length > 0) {
        setTagInput(extracted.tags.join(', '));
      }

      setScanStatusMessage('명함 오려내기 및 정보 추출 완료!');
      setTimeout(() => {
        setIsScanning(false);
        setScanStatusMessage('');
      }, 1000);
    } catch (err: any) {
      console.error('OCR Error:', err);
      alert(err.message || '명함 판독 중 오류가 발생했습니다.');
      setIsScanning(false);
      setScanStatusMessage('');
    }
  };

  // 1단계: 카메라 촬영 또는 사진 선택 시 즉시 초정밀 명함 테두리 자동 감지 & 오려내기
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setScanStatusMessage('사진 분석 및 스마트 명함 영역 자동 감지 중...');
      const { dataUrl } = await resizeImageToDataUrl(file);
      setRawPhotoDataUrl(dataUrl);

      // 캔버스 기반 Center-Outward 초정밀 엣지 디텍션
      const img = new Image();
      img.onload = async () => {
        try {
          const bounds = detectCardBounds(img);
          setDetectedCropRect(bounds);
          const { croppedDataUrl, croppedBase64 } = await cropImageByRect(dataUrl, bounds);
          await processCroppedImage(croppedDataUrl, croppedBase64);
        } catch (cropErr) {
          console.warn('Auto-crop error, falling back to full image:', cropErr);
          const base64 = dataUrl.split(',')[1] || '';
          await processCroppedImage(dataUrl, base64);
        }
      };
      img.onerror = async () => {
        const base64 = dataUrl.split(',')[1] || '';
        await processCroppedImage(dataUrl, base64);
      };
      img.src = dataUrl;
    } catch (err: any) {
      setIsScanning(false);
      alert(err.message || '사진 로딩에 실패했습니다.');
    } finally {
      e.target.value = '';
    }
  };

  // 2단계: 모달에서 수동으로 자르기 조정한 경우 호출
  const handleCropComplete = async (croppedDataUrl: string, croppedBase64: string) => {
    setScannedImagePreview(croppedDataUrl);
    // Cloudflare R2에 새로 오려낸 이미지 업로드
    uploadCardImage(croppedBase64, 'image/jpeg')
      .then((r2Url) => {
        if (r2Url) setScannedImagePreview(r2Url);
      })
      .catch((err) => console.warn('R2 upload failed:', err));
  };

  // 3단계: 실시간 카메라 스캐너에서 촬영되었을 때 (자동 또는 수동 셔터)
  const handleLiveCameraCapture = async (dataUrl: string) => {
    setIsLiveCameraOpen(false);
    setRawPhotoDataUrl(dataUrl);
    setIsScanning(true);
    setScanStatusMessage('사진 분석 및 스마트 명함 영역 자동 감지 중...');

    const img = new Image();
    img.onload = async () => {
      try {
        const bounds = detectCardBounds(img);
        setDetectedCropRect(bounds);
        const { croppedDataUrl, croppedBase64 } = await cropImageByRect(dataUrl, bounds);
        await processCroppedImage(croppedDataUrl, croppedBase64);
      } catch (cropErr) {
        console.warn('Auto-crop error, falling back to full image:', cropErr);
        const base64 = dataUrl.split(',')[1] || '';
        await processCroppedImage(dataUrl, base64);
      }
    };
    img.onerror = async () => {
      const base64 = dataUrl.split(',')[1] || '';
      await processCroppedImage(dataUrl, base64);
    };
    img.src = dataUrl;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('성함을 입력해주세요.');
      return;
    }

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave(
      {
        name: name.trim(),
        position: position.trim(),
        company: company.trim(),
        department: department.trim(),
        phone: phone.trim(),
        tel: tel.trim(),
        email: email.trim(),
        website: website.trim(),
        address: address.trim(),
        memo: memo.trim(),
        tags,
        theme,
        isFavorite,
        avatarUrl: scannedImagePreview || undefined,
      },
      initialData?.id
    );

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
        <div 
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {initialData ? '명함 정보 수정' : '새 명함 등록'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                카메라로 찍으면 명함만 쏙 오려내어 클라우드에 자동 저장됩니다.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* AI Camera Scan Banner */}
          <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border-b border-blue-100/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                  <Crop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>AI 명함 자동 오려내기 & 스캔</span>
                    <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-md">Auto-Crop</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    책상 배경을 싹 잘라내고 명함 본체만 깔끔하게 저장합니다.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Real-time Camera Scanner Button */}
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => setIsLiveCameraOpen(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition active:scale-95 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 stroke-[2.5]" />
                  <span>스마트 자동 촬영</span>
                </button>

                {/* Photo Album Button */}
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span>사진 선택</span>
                </button>

                {/* API Key settings shortcut */}
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  title="Gemini API 키 설정"
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition"
                >
                  <Key className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hidden inputs */}
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleImageSelected}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelected}
              accept="image/*"
              className="hidden"
            />

            {/* AI Scanning progress status indicator */}
            {isScanning && (
              <div className="mt-3.5 pt-3 border-t border-blue-200/60 flex items-center gap-3 bg-white/80 p-3 rounded-2xl animate-pulse">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-blue-900">{scanStatusMessage}</p>
                  <p className="text-[11px] text-slate-500">명함 정보를 분석하는 중입니다...</p>
                </div>
              </div>
            )}

            {/* Scanned & Cropped Card Preview Thumbnail */}
            {scannedImagePreview && !isScanning && (
              <div className="mt-3.5 pt-3 border-t border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white/70 p-3 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-0.5 bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden shrink-0">
                    <img
                      src={scannedImagePreview}
                      alt="오려낸 명함 미리보기"
                      className="w-20 h-12 object-contain rounded-lg bg-slate-50"
                    />
                  </div>
                  <div>
                    <span className="text-slate-800 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>명함 본체 자동 오려내기 완료</span>
                    </span>
                    <p className="text-[11px] text-slate-500">책상 배경이 완전히 제거되었습니다.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {rawPhotoDataUrl && (
                    <button
                      type="button"
                      onClick={() => setIsCropModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 font-semibold text-[11px] transition flex items-center gap-1 shadow-2xs"
                    >
                      <Crop className="w-3.5 h-3.5 text-blue-600" />
                      <span>영역 직접 조정</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setScannedImagePreview(null);
                      setRawPhotoDataUrl(null);
                      setDetectedCropRect(null);
                    }}
                    className="text-slate-400 hover:text-rose-600 text-[11px] px-2 py-1.5 rounded-lg hover:bg-white transition"
                  >
                    사진 삭제
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[60vh] sm:max-h-[65vh] overflow-y-auto">
            {/* Card Theme Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-600" />
                <span>명함 디자인 테마 (실물 사진이 없을 때 표시)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {THEME_OPTIONS.map((thKey) => {
                  const cfg = THEME_CONFIGS[thKey];
                  const isSelected = theme === thKey;
                  return (
                    <button
                      key={thKey}
                      type="button"
                      onClick={() => setTheme(thKey)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg ${cfg.previewBg} shrink-0 shadow-sm flex items-center justify-center text-white`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {cfg.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>인적 사항 & 소속</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    이름 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    직책 / 역할
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="예: 대표이사, 수석연구원, 팀장"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    회사 / 조직명
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="예: (주)알파테크"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    부서
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="예: 전략기획실, 개발팀"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>연락처 정보</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    휴대폰 번호
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    유선전화 (사무실)
                  </label>
                  <input
                    type="tel"
                    value={tel}
                    onChange={(e) => setTel(e.target.value)}
                    placeholder="02-000-0000"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    이메일 주소
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    웹사이트 / 링크
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  사무실 주소
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="예: 서울특별시 강남구 테헤란로 123"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                />
              </div>
            </div>

            {/* Tags & Notes */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <TagIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>태그 및 메모</span>
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  태그 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="예: 거래처, VIP, 세미나, 개발"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  미팅 메모 / 주요 사항
                </label>
                <textarea
                  rows={3}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="어디서 만났는지, 어떤 대화를 나누었는지 자유롭게 기록하세요..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isScanning}
                className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition active:scale-95 disabled:opacity-50"
              >
                {initialData ? '수정 완료' : '명함 저장'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Interactive Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageDataUrl={rawPhotoDataUrl}
        initialCropRect={detectedCropRect || undefined}
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={handleCropComplete}
      />

      {/* Real-time Live Camera Scanner Modal */}
      <LiveCameraScannerModal
        isOpen={isLiveCameraOpen}
        onClose={() => setIsLiveCameraOpen(false)}
        onCapture={handleLiveCameraCapture}
        onFallbackToFile={() => fileInputRef.current?.click()}
      />
    </>
  );
};
