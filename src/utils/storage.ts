import { BusinessCardData } from '../types/card';

const STORAGE_KEY_CARDS = 'bucard_cards_v1';
const STORAGE_KEY_MY_CARD = 'bucard_my_card_v1';

export const INITIAL_CARDS: BusinessCardData[] = [
  {
    id: 'sample-1',
    name: '김서연',
    position: '수석 프로덕트 디자이너',
    company: '네오스튜디오 (Neo Studio)',
    department: '디자인 혁신팀',
    email: 'seoyeon.kim@neostudio.io',
    phone: '010-8912-3456',
    tel: '02-555-1234',
    website: 'https://neostudio.io',
    address: '서울특별시 강남구 테헤란로 152',
    memo: '2026 UX/UI 디자인 컨퍼런스에서 미팅. 신규 모바일 디자인 시스템 협업 논의 예정.',
    tags: ['디자인', '협력사', 'VIP'],
    theme: 'purple-luxury',
    isFavorite: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: 'sample-2',
    name: '박진우',
    position: '클라우드 아키텍트 / 리드 개발자',
    company: '넥스트클라우드 테크놀로지',
    department: '인프라 솔루션본부',
    email: 'jinwoo.park@nextcloud.dev',
    phone: '010-3456-7890',
    website: 'https://nextcloud.dev',
    address: '경기도 성남시 분당구 판교역로 235',
    memo: 'Cloudflare Workers 및 엣지 컴퓨팅 기반 서버리스 아키텍처 전문가.',
    tags: ['개발', '클라우드', '판교'],
    theme: 'modern-blue',
    isFavorite: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    id: 'sample-3',
    name: '이수민',
    position: '투자심사역 / 팀장',
    company: '스파크 벤처파트너스',
    department: 'ICT 투자본부',
    email: 'sm.lee@sparkvp.kr',
    phone: '010-7788-9900',
    tel: '02-789-0123',
    website: 'https://sparkvp.kr',
    address: '서울특별시 서초구 강남대로 311',
    memo: 'AI 및 SaaS 스타트업 투자 담당. Q3 IR 미팅 진행하기로 함.',
    tags: ['투자', 'VC', '파트너'],
    theme: 'emerald-fresh',
    isFavorite: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
  },
  {
    id: 'sample-4',
    name: '최민호',
    position: '마케팅 총괄 이사 (CMO)',
    company: '하이퍼그로스 주식회사',
    department: '그로스마케팅실',
    email: 'minho.choi@hypergrowth.co.kr',
    phone: '010-2345-6789',
    website: 'https://hypergrowth.co.kr',
    address: '서울특별시 송파구 올림픽로 300 롯데월드타워',
    memo: '글로벌 브랜딩 및 퍼포먼스 마케팅 제휴 협의.',
    tags: ['마케팅', '비즈니스'],
    theme: 'sunset-gradient',
    isFavorite: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
  }
];

export const INITIAL_MY_CARD: BusinessCardData = {
  id: 'my-card-primary',
  name: '홍길동',
  position: 'CEO & 풀스택 개발자',
  company: 'BUCARD Lab',
  department: '디지털 서비스팀',
  email: 'contact@iamchang.me',
  phone: '010-1234-5678',
  tel: '02-123-4567',
  website: 'https://bucard.iamchang.me',
  address: '서울특별시 중구 세종대로',
  memo: '반갑습니다! 스마트 명함 솔루션 BUCARD입니다.',
  tags: ['내명함', '대표'],
  theme: 'slate-dark',
  isFavorite: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export function loadCards(): BusinessCardData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CARDS);
    if (!raw) {
      saveCards(INITIAL_CARDS);
      return INITIAL_CARDS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load cards from localStorage:', e);
    return INITIAL_CARDS;
  }
}

export function saveCards(cards: BusinessCardData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
  } catch (e) {
    console.error('Failed to save cards to localStorage:', e);
  }
}

export function loadMyCard(): BusinessCardData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MY_CARD);
    if (!raw) {
      saveMyCard(INITIAL_MY_CARD);
      return INITIAL_MY_CARD;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load my card:', e);
    return INITIAL_MY_CARD;
  }
}

export function saveMyCard(card: BusinessCardData): void {
  try {
    localStorage.setItem(STORAGE_KEY_MY_CARD, JSON.stringify(card));
  } catch (e) {
    console.error('Failed to save my card:', e);
  }
}

export function exportBackupJSON(cards: BusinessCardData[], myCard: BusinessCardData): void {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    cards,
    myCard,
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BUCARD_백업_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
