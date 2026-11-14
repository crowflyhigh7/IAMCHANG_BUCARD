/**
 * Gemini AI Vision API를 이용한 명함 자동 인식 및 정보 추출 유틸리티
 */

const STORAGE_KEY_GEMINI_API_KEY = 'bucard_gemini_api_key';

export function getGeminiApiKey(): string {
  const localKey = localStorage.getItem(STORAGE_KEY_GEMINI_API_KEY);
  if (localKey && localKey.trim()) return localKey.trim();
  // Vite 환경변수 fallback (배포 환경에서 지정된 경우)
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
 * 고해상도 모바일 사진을 브라우저 캔버스를 통해 최적화된 크기(1200px)와 JPEG로 압축합니다.
 * 이를 통해 AI 전송 속도가 1~2초 이내로 대폭 향상됩니다.
 */
export async function resizeImageToDataUrl(file: File, maxDimension = 1200): Promise<{ dataUrl: string; base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
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
        resolve({ dataUrl, base64Data, mimeType });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Gemini 비전 모델을 호출하여 명함 사진에서 연락처 정보를 JSON으로 추출합니다.
 */
export async function extractCardInfoWithGemini(
  base64Image: string,
  mimeType: string,
  apiKey: string
): Promise<ExtractedCardInfo> {
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }

  // gemini-2.5-flash 또는 gemini-1.5-flash 모델 사용
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `
당신은 대한민국 및 글로벌 비즈니스 명함 판독 최고 전문가입니다.
제공된 명함 사진에서 글자를 정확하게 인식(OCR)하고 문맥을 파악하여 다음 JSON 스키마에 맞춰 정보를 추출하세요.

반드시 아래 JSON 형식으로만 응답해야 하며, 마크다운 코드블록(\`\`\`json)이나 기타 설명 없이 오직 순수한 JSON만 반환하세요:
{
  "name": "성명 (반드시 성과 이름 포함)",
  "position": "직책 및 직급 (예: 대표이사, 팀장, 수석연구원, CEO 등. 없으면 빈 문자열)",
  "company": "회사명/상호명 (예: (주)알파소프트, 네이버 등)",
  "department": "부서명 (예: 개발본부, 기획실 등. 없으면 빈 문자열)",
  "phone": "휴대전화번호 (010-XXXX-XXXX 형식으로 정리. 없으면 빈 문자열)",
  "tel": "대표/사무실 유선전화번호 (지역번호 포함, 없으면 빈 문자열)",
  "email": "이메일 주소 (없으면 빈 문자열)",
  "website": "웹사이트 주소 (http/https 생략 가능, 없으면 빈 문자열)",
  "address": "사업장 또는 회사 주소 (없으면 빈 문자열)",
  "memo": "명함에 기재된 슬로건, 주요 취급 품목, 자격사항 등 부가 정보 한 줄 요약 (없으면 빈 문자열)",
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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const msg = errorData?.error?.message || `API 요청 실패 (HTTP ${response.status})`;
    throw new Error(msg);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('AI 응답에서 텍스트를 추출할 수 없습니다.');
  }

  // Parse JSON
  try {
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed: ExtractedCardInfo = JSON.parse(cleanJson);
    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini response:', rawText);
    throw new Error('AI 응답을 JSON으로 변환하지 못했습니다. 명함 사진이 선명한지 확인해 주세요.');
  }
}
