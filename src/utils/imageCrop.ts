/**
 * 캔버스 픽셀 분석 기반 스마트 명함 영역 자동 감지 (Edge Detection)
 * 배경(책상, 테이블 등)과 명함(밝은 종이)의 색상 대비를 분석하여 명함 테두리를 0~1 비율로 검출합니다.
 */

export interface CropRect {
  x: number;      // 0 ~ 1
  y: number;      // 0 ~ 1
  width: number;  // 0 ~ 1
  height: number; // 0 ~ 1
}

/**
 * 캔버스에서 이미지의 배경과 명함 종이의 색상 차이를 분석하여 명함 바운딩 박스를 자동으로 찾습니다.
 */
export function detectCardBounds(img: HTMLImageElement): CropRect {
  const sampleWidth = 300;
  const sampleHeight = Math.round((sampleWidth * img.height) / img.width);

  const canvas = document.createElement('canvas');
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };
  }

  ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imageData.data;

  // 1. 네 모서리 부근의 평균 색상을 배경색(Background Color)으로 추정
  function getPixel(x: number, y: number) {
    const idx = (y * sampleWidth + x) * 4;
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
  }

  // 모서리 4개 지점 샘플
  const corners = [
    getPixel(5, 5),
    getPixel(sampleWidth - 6, 5),
    getPixel(5, sampleHeight - 6),
    getPixel(sampleWidth - 6, sampleHeight - 6),
  ];

  const bgR = corners.reduce((acc, c) => acc + c.r, 0) / 4;
  const bgG = corners.reduce((acc, c) => acc + c.g, 0) / 4;
  const bgB = corners.reduce((acc, c) => acc + c.b, 0) / 4;
  const bgBrightness = (bgR * 299 + bgG * 587 + bgB * 114) / 1000;

  // 배경과 명함의 색상/밝기 차이 임계값
  function isForeground(x: number, y: number): boolean {
    const p = getPixel(x, y);
    const pBrightness = (p.r * 299 + p.g * 587 + p.b * 114) / 1000;
    const diff = Math.abs(pBrightness - bgBrightness);
    const colorDist = Math.sqrt(
      Math.pow(p.r - bgR, 2) + Math.pow(p.g - bgG, 2) + Math.pow(p.b - bgB, 2)
    );
    return diff > 35 || colorDist > 55;
  }

  // 2. 상, 하, 좌, 우에서 스캔하여 명함 시작 위치 탐색
  let top = 0;
  let bottom = sampleHeight - 1;
  let left = 0;
  let right = sampleWidth - 1;

  // Top scan
  for (let y = 0; y < sampleHeight / 2; y++) {
    let fgCount = 0;
    for (let x = Math.round(sampleWidth * 0.2); x < sampleWidth * 0.8; x++) {
      if (isForeground(x, y)) fgCount++;
    }
    if (fgCount > sampleWidth * 0.2) {
      top = Math.max(0, y - 2);
      break;
    }
  }

  // Bottom scan
  for (let y = sampleHeight - 1; y > sampleHeight / 2; y--) {
    let fgCount = 0;
    for (let x = Math.round(sampleWidth * 0.2); x < sampleWidth * 0.8; x++) {
      if (isForeground(x, y)) fgCount++;
    }
    if (fgCount > sampleWidth * 0.2) {
      bottom = Math.min(sampleHeight - 1, y + 2);
      break;
    }
  }

  // Left scan
  for (let x = 0; x < sampleWidth / 2; x++) {
    let fgCount = 0;
    for (let y = Math.round(sampleHeight * 0.2); y < sampleHeight * 0.8; y++) {
      if (isForeground(x, y)) fgCount++;
    }
    if (fgCount > sampleHeight * 0.2) {
      left = Math.max(0, x - 2);
      break;
    }
  }

  // Right scan
  for (let x = sampleWidth - 1; x > sampleWidth / 2; x--) {
    let fgCount = 0;
    for (let y = Math.round(sampleHeight * 0.2); y < sampleHeight * 0.8; y++) {
      if (isForeground(x, y)) fgCount++;
    }
    if (fgCount > sampleHeight * 0.2) {
      right = Math.min(sampleWidth - 1, x + 2);
      break;
    }
  }

  const detectedW = right - left;
  const detectedH = bottom - top;

  // 만약 너무 작거나(실패) 거의 전체면 기본 안전 패딩 적용
  if (detectedW < sampleWidth * 0.3 || detectedH < sampleHeight * 0.2) {
    return { x: 0.05, y: 0.08, width: 0.9, height: 0.84 };
  }

  return {
    x: left / sampleWidth,
    y: top / sampleHeight,
    width: detectedW / sampleWidth,
    height: detectedH / sampleHeight,
  };
}

/**
 * 주어진 CropRect(0~1 비율)에 맞추어 이미지를 잘라내고 DataURL과 Base64를 반환합니다.
 */
export async function cropImageByRect(
  sourceDataUrl: string,
  rect: CropRect
): Promise<{ croppedDataUrl: string; croppedBase64: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cropX = Math.round(rect.x * img.width);
      const cropY = Math.round(rect.y * img.height);
      const cropW = Math.round(rect.width * img.width);
      const cropH = Math.round(rect.height * img.height);

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
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
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
