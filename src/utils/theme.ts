import { CardTheme } from '../types/card';

export interface ThemeConfig {
  id: CardTheme;
  name: string;
  cardBg: string;
  textColor: string;
  subTextColor: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  previewBg: string;
}

export const THEME_CONFIGS: Record<CardTheme, ThemeConfig> = {
  'slate-dark': {
    id: 'slate-dark',
    name: '매트 블랙 & 골드',
    cardBg: 'bg-gradient-to-br from-slate-900 via-neutral-900 to-zinc-950 text-white shadow-xl shadow-slate-900/30',
    textColor: 'text-white',
    subTextColor: 'text-slate-400',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-slate-800/80 border border-slate-700/60',
    badgeText: 'text-slate-300',
    borderClass: 'border-slate-800',
    previewBg: 'bg-gradient-to-r from-slate-900 to-zinc-900',
  },
  'modern-blue': {
    id: 'modern-blue',
    name: '모던 오션 블루',
    cardBg: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white shadow-xl shadow-blue-500/25',
    textColor: 'text-white',
    subTextColor: 'text-blue-100/80',
    accentColor: 'text-cyan-300',
    badgeBg: 'bg-white/15 backdrop-blur-sm border border-white/20',
    badgeText: 'text-white',
    borderClass: 'border-blue-400/30',
    previewBg: 'bg-gradient-to-r from-blue-600 to-indigo-600',
  },
  'emerald-fresh': {
    id: 'emerald-fresh',
    name: '에메랄드 딥그린',
    cardBg: 'bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-900 text-white shadow-xl shadow-emerald-900/25',
    textColor: 'text-white',
    subTextColor: 'text-emerald-100/80',
    accentColor: 'text-emerald-300',
    badgeBg: 'bg-white/15 backdrop-blur-sm border border-white/20',
    badgeText: 'text-white',
    borderClass: 'border-emerald-400/30',
    previewBg: 'bg-gradient-to-r from-emerald-600 to-teal-800',
  },
  'sunset-gradient': {
    id: 'sunset-gradient',
    name: '선셋 오렌지 & 핑크',
    cardBg: 'bg-gradient-to-br from-rose-500 via-orange-500 to-amber-600 text-white shadow-xl shadow-orange-500/25',
    textColor: 'text-white',
    subTextColor: 'text-orange-50/90',
    accentColor: 'text-amber-200',
    badgeBg: 'bg-white/20 backdrop-blur-sm border border-white/30',
    badgeText: 'text-white',
    borderClass: 'border-orange-300/30',
    previewBg: 'bg-gradient-to-r from-rose-500 to-orange-500',
  },
  'purple-luxury': {
    id: 'purple-luxury',
    name: '로열 퍼플 & 바이올렛',
    cardBg: 'bg-gradient-to-br from-purple-700 via-indigo-800 to-slate-950 text-white shadow-xl shadow-purple-900/30',
    textColor: 'text-white',
    subTextColor: 'text-purple-200/80',
    accentColor: 'text-fuchsia-300',
    badgeBg: 'bg-white/15 backdrop-blur-sm border border-white/20',
    badgeText: 'text-white',
    borderClass: 'border-purple-400/30',
    previewBg: 'bg-gradient-to-r from-purple-700 to-indigo-900',
  },
  'minimal-white': {
    id: 'minimal-white',
    name: '클린 미니멀 화이트',
    cardBg: 'bg-white text-slate-800 shadow-xl shadow-slate-200/70 border border-slate-200/80',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-500',
    accentColor: 'text-blue-600',
    badgeBg: 'bg-slate-100 border border-slate-200',
    badgeText: 'text-slate-600',
    borderClass: 'border-slate-200',
    previewBg: 'bg-white border border-slate-300',
  }
};
