export type CardTheme = 
  | 'modern-blue' 
  | 'slate-dark' 
  | 'emerald-fresh' 
  | 'sunset-gradient' 
  | 'purple-luxury' 
  | 'minimal-white';

export interface BusinessCardData {
  id: string;
  name: string;
  position: string;         // 직책 (예: 대표, 수석 엔지니어, 팀장)
  company: string;          // 회사/소속
  department?: string;      // 부서
  email: string;
  phone: string;
  tel?: string;             // 유선전화
  website?: string;
  address?: string;
  memo?: string;            // 메모
  tags: string[];           // 태그 (예: 거래처, 개발, 디자인, VIP)
  avatarUrl?: string;       // 프로필 사진 또는 명함 사진 (base64 or URL)
  theme: CardTheme;         // 명함 테마 스타일
  isFavorite: boolean;      // 즐겨찾기
  createdAt: number;
  updatedAt: number;
}

export type ViewMode = 'grid' | 'compact' | 'list';
