/**
 * Gemini AI Vision API를 이용한 명함 자동 인식 및 테두리 자동 크롭 유틸리티
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
  // 명함 본체의 0~1000 정규화 좌표 [ymin, xmin, ymax, xmax]
  box_2d?: [number, number, number, number];
}

/**
 * 모바일 원본 사진을 1200px 수준으로 1차 리사이징/압축
 */
export async function resizeImageToDataUrl(file: File, maxDimension = 1400): Promise<{ dataUrl: string; base64Data: string; mimeType: string; originalWidth: number; originalHeight: number }> {
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
        const dataUrl = canvas.toDataURL(mimeType, 0.85);
        const base64Data = dataUrl.split(',')[1];
        resolve({ dataUrl, base64Data, mimeType, originalWidth: width, originalHeight: height });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * AI가 감지한 [ymin, xmin, ymax, xmax] (0~1000 정규화 좌표)를 기준으로
 * 책상 배경이나 여백을 잘라내고 명함 본체만 깔끔하게 오려냅니다.
 */
export async function cropImageToBoundingBox(
  sourceDataUrl: string,
  box?: [number, number, number, number]
): Promise<{ croppedDataUrl: string; croppedBase64: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 유효한 바운딩 박스가 없으면 원본 그대로 반환
      if (!box || !Array.isArray(box) || box.length !== 4) {
        const base64 = sourceDataUrl.split(',')[1] || '';
        resolve({ croppedDataUrl: sourceDataUrl, croppedBase64: base64 });
        return;
      }

      let [ymin, xmin, ymax, xmax] = box;

      // 0~1000 정규화 좌표를 0~1 범위로 보정
      if (ymax <= 1 && xmax <= 1) {
        ymin = ymin * 1000;
        xmin = xmin * 1000;
        ymax = ymax * 1000;
        xmax = xmax * 1000;
      }

      // 살짝의 여백(패딩 1%)을 주어 명함 테두리가 잘리지 않도록 안전 처리
      const padY = Math.round((ymax - ymin) * 0.01);
      const padX = Math.round((xmax - xmin) * 0.01);

      const clampedYmin = Math.max(0, ymin - padY);
      const clampedXmin = Math.max(0, xmin - padX);
      const clampedYmax = Math.min(1000, ymax + padY);
      const clampedXmax = Math.min(1000, xmax + padX);

      const cropX = Math.round((clampedXmin / 1000) * img.width);
      const cropY = Math.round((clampedYmin / 1000) * img.height);
      const cropW = Math.round(((clampedXmax - clampedXmin) / 1000) * img.width);
      const cropH = Math.round(((clampedYmax - clampedYmin) / 1000) * img.height);

      if (cropW < 50 || cropH < 50) {
        // 크롭 영역이 너무 작거나 비정상이면 원본 유지
        const base64 = sourceDataUrl.split(',')[1] || '';
        resolve({ croppedDataUrl: sourceDataUrl, croppedBase64: base64 });
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const base64 = sourceDataUrl.split(',')[1] || '';
        resolve({ croppedDataUrl: sourceDataUrl, croppedBase64: base64 });
        return;
      }

      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const croppedBase64 = croppedDataUrl.split(',')[1];
      resolve({ croppedDataUrl, croppedBase64 });
    };
    img.onerror = () => {
      const base64 = sourceDataUrl.split(',')[1] || '';
      resolve({ croppedDataUrl: sourceDataUrl, croppedBase64: base64 });
    };
    img.src = sourceDataUrl;
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

  return 'gemini-1.5-flash-latest';
}

/**
 * Gemini 비전 모델을 호출하여 명함 사진에서 연락처 정보와 명함의 바운딩 박스(box_2d)를 함께 추출합니다.
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

  onStatusUpdate?.(`명함 본체 자동 감지 및 텍스트 판독 중 (${targetModel})...`);

  const prompt = `
당신은 대한민국 및 글로벌 비즈니스 명함 판독 최고 전문가입니다.
제공된 사진에서 다음 두 가지 작업을 정확하게 수행하세요:

1. [가장 중요] 사진 속에 놓인 '실제 종이 명함 본체'의 사각 테두리 경계 영역(Bounding Box)을 0~1000 범위의 정규화 정수 좌표 [ymin, xmin, ymax, xmax]로 정확히 감지하세요. (책상, 손가락, 주변 배경은 제외하고 오직 명함 종이 영역만 지정)
2. 명함 내의 글자를 정확히 읽어 인적 사항 및 연락처 정보를 추출하세요.

반드시 마크다운이나 기타 설명 없이 오직 유효한 순수 JSON만 반환하세요:
{
  "box_2d": [ymin, xmin, ymax, xmax],
  "name": "성명 (반드시 성과 이름 포함)",
  "position": "직책 및 직급 (예: 대표이사, 실장, 팀장, 수석연구원 등. 없으면 빈 문자열)",
  "company": "회사명/상호명 (예: (주)카스갤러리 등)",
  "department": "부서명 (없으면 빈 문자열)",
  "phone": "휴대전화번호 (010-XXXX-XXXX 형식, 없으면 빈 문자열)",
  "tel": "대표/사무실 유선전화번호 (없으면 빈 문자열)",
  "email": "이메일 주소 (없으면 빈 문자열)",
  "website": "웹사이트 주소 (없으면 빈 문자열)",
  "address": "사업장 또는 회사 주소 (없으면 빈 문자열)",
  "memo": "명함에 기재된 슬로건, 주요 취급 품목 등 부가 요약 (없으면 빈 문자열)",
  "tags": ["업종이나 직무와 관련된 추천 키워드 1~3개"]
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
    20000
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
