/**
 * Gemini AI Vision API를 이용한 명함 자동 인식 및 정보 추출 유틸리티
 */

const STORAGE_KEY_GEMINI_API_KEY = 'bucard_gemini_api_key';

export function getGeminiApiKey(): string {
  const localKey = localStorage.getItem(STORAGE_KEY_GEMINI_API_KEY);
  if (localKey && localKey.trim()) return localKey.trim();
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
}

export function saveGeminiApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY_GEMINI_API_KEY, key.trim());
}

export interface ExtractedCardInfo {
  name: string;
  position?: string;
  company?: string;
  department?: string;
  phone?: string;
  tel?: string;
  email?: string;
  website?: string;
  address?: string;
  memo?: string;
  tags?: string[];
}

/**
 * 모바일 고해상도 사진을 브라우저 캔버스를 통해 1000px 이내로 리사이징 및 압축합니다.
 */
export async function resizeImageToDataUrl(file: File, maxDimension = 1000): Promise<{ dataUrl: string; base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지 로딩에 실패했습니다.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context error'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, 0.8);
        const base64Data = dataUrl.split(',')[1];
        resolve({ dataUrl, base64Data, mimeType });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 타임아웃(기본 20초)이 적용된 fetch 헬퍼
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다 (20초 타임아웃). 네트워크 연결을 확인해주세요.');
    }
    throw error;
  }
}

/**
 * 해당 API 키에서 실제로 사용 가능한 모델을 ListModels API로 즉시 조회합니다.
 */
async function findAvailableModel(apiKey: string): Promise<string> {
  try {
    const listRes = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' },
      8000
    );

    if (listRes.ok) {
      const data = await listRes.json();
      const models: any[] = data.models || [];

      // 1순위: generateContent 지원 & flash 모델
      const flashModel = models.find(
        (m) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent') &&
          m.name.includes('flash')
      );
      if (flashModel) {
        return flashModel.name.replace('models/', '');
      }

      // 2순위: generateContent 지원하는 아무 gemini 모델
      const anyGemini = models.find(
        (m) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent') &&
          m.name.includes('gemini')
      );
      if (anyGemini) {
        return anyGemini.name.replace('models/', '');
      }
    }
  } catch (e) {
    console.warn('ListModels failed, using fallback list:', e);
  }

  // fallback 기본값
  return 'gemini-1.5-flash-latest';
}

/**
 * Gemini 비전 모델을 호출하여 명함 사진에서 연락처 정보를 JSON으로 추출합니다.
 */
export async function extractCardInfoWithGemini(
  base64Image: string,
  mimeType: string,
  apiKey: string,
  onStatusUpdate?: (msg: string) => void
): Promise<ExtractedCardInfo> {
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }

  onStatusUpdate?.('사용 가능한 AI 모델 확인 중...');
  const targetModel = await findAvailableModel(apiKey);
  console.log('Selected Gemini Model:', targetModel);

  onStatusUpdate?.(`AI가 명함 정보를 정밀 판독하는 중 (${targetModel})...`);

  const prompt = `
당신은 명함 판독 최고 전문가입니다.
제공된 명함 사진에서 글자를 정확하게 인식(OCR)하고 문맥을 파악하여 다음 JSON 스키마에 맞춰 정보를 추출하세요.

반드시 마크다운이나 기타 텍스트 없이 오직 유효한 순수 JSON만 반환하세요:
{
  "name": "성명 (반드시 성과 이름 포함)",
  "position": "직책 및 직급 (예: 대표이사, 팀장, 수석연구원, CEO 등. 없으면 빈 문자열)",
  "company": "회사명/상호명 (예: (주)알파소프트 등)",
  "department": "부서명 (없으면 빈 문자열)",
  "phone": "휴대전화번호 (010-XXXX-XXXX 형식, 없으면 빈 문자열)",
  "tel": "대표/사무실 유선전화번호 (없으면 빈 문자열)",
  "email": "이메일 주소 (없으면 빈 문자열)",
  "website": "웹사이트 주소 (없으면 빈 문자열)",
  "address": "회사/사업장 주소 (없으면 빈 문자열)",
  "memo": "명함에 적힌 주요 슬로건 또는 업무 요약 (없으면 빈 문자열)",
  "tags": ["업종이나 직무 관련 추천 키워드 1~3개"]
}
`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json"
    }
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    },
    20000 // 20초 타임아웃
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errMsg = errorData?.error?.message || `HTTP ${response.status}`;
    throw new Error(`AI 판독 실패: ${errMsg}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('AI 응답에서 판독 결과를 찾을 수 없습니다.');
  }

  try {
    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('JSON parse error on text:', rawText);
    throw new Error('명함 정보를 JSON으로 파싱하지 못했습니다. 다시 촬영해 보세요.');
  }
}
