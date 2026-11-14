import { BusinessCardData } from '../types/card';
import { loadCards, saveCards, loadMyCard, saveMyCard } from './storage';

/**
 * Cloudflare D1 & R2 Backend API Client
 */

export async function fetchCards(): Promise<BusinessCardData[]> {
  try {
    const res = await fetch('/api/cards', { cache: 'no-store' });
    if (!res.ok) throw new Error('API fetch failed');
    const data = await res.json();
    if (Array.isArray(data)) {
      // LocalStorage 캐시 동기화
      saveCards(data);
      return data;
    }
    return loadCards();
  } catch (err) {
    console.warn('Backend offline or error, falling back to local storage:', err);
    return loadCards();
  }
}

export async function createCard(card: BusinessCardData): Promise<BusinessCardData> {
  // Optimistic local update
  const localCards = loadCards();
  saveCards([card, ...localCards]);

  try {
    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    if (!res.ok) throw new Error('Failed to create card on server');
  } catch (err) {
    console.warn('Failed to sync card creation with D1, saved locally:', err);
  }

  return card;
}

export async function updateCard(card: BusinessCardData): Promise<BusinessCardData> {
  // Optimistic local update
  const localCards = loadCards();
  const updated = localCards.map((c) => (c.id === card.id ? card : c));
  saveCards(updated);

  try {
    const res = await fetch(`/api/cards/${card.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    if (!res.ok) throw new Error('Failed to update card on server');
  } catch (err) {
    console.warn('Failed to sync card update with D1, saved locally:', err);
  }

  return card;
}

export async function deleteCard(id: string): Promise<void> {
  // Optimistic local update
  const localCards = loadCards();
  saveCards(localCards.filter((c) => c.id !== id));

  try {
    const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete card on server');
  } catch (err) {
    console.warn('Failed to delete card on D1, removed locally:', err);
  }
}

/**
 * 명함 이미지를 Cloudflare R2 스토리지에 업로드하고 영구 URL을 반환받습니다.
 */
export async function uploadCardImage(base64Data: string, mime: string): Promise<string> {
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, mime }),
    });

    if (!res.ok) throw new Error('Image upload failed');
    const data = await res.json();
    return data.url; // e.g. /api/images/card-xxxx.jpg
  } catch (err) {
    console.warn('Failed to upload image to R2, fallback to data url:', err);
    return `data:${mime};base64,${base64Data}`;
  }
}

export async function fetchMyCard(): Promise<BusinessCardData> {
  try {
    const res = await fetch('/api/mycard', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.name) {
        saveMyCard(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('Using local fallback for my card:', err);
  }
  return loadMyCard();
}

export async function saveMyCardApi(card: BusinessCardData): Promise<void> {
  saveMyCard(card);
  try {
    await fetch('/api/mycard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
  } catch (err) {
    console.warn('Failed to sync my card to D1:', err);
  }
}
