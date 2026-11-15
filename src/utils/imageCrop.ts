/**
 * 캔버스 픽셀 분석 기반 초정밀 스마트 명함 영역 자동 감지 (Center-Outward Multi-Ray Scan)
 * 사진 중심부의 명함 종이와 주변 배경(책상, 테이블 등)의 명암/색상 대비를 분석하여
 * 글자나 책상 반사광에 방해받지 않고 실제 명함 사각 테두리만을 0~1 정규화 좌표로 완벽하게 감지합니다.
 */

export interface CropRect {
  x: number;      // 0 ~ 1 (좌측 시작 비율)
  y: number;      // 0 ~ 1 (상단 시작 비율)
  width: number;  // 0 ~ 1 (너비 비율)
  height: number; // 0 ~ 1 (높이 비율)
}

/**
 * 캔버스에서 이미지의 배경과 명함 종이의 색상 차이를 분석하여 명함 바운딩 박스를 자동으로 찾습니다.
 */
export function detectCardBounds(img: HTMLImageElement): CropRect {
  const sampleWidth = 400;
  const sampleHeight = Math.max(100, Math.round((sampleWidth * img.height) / img.width));

  const canvas = document.createElement('canvas');
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { x: 0.05, y: 0.15, width: 0.9, height: 0.7 };
  }

  ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imageData.data;

  // 픽셀 밝기 계산 헬퍼 (0 ~ 255)
  function getBrightness(x: number, y: number): number {
    const cx = Math.max(0, Math.min(sampleWidth - 1, x));
    const cy = Math.max(0, Math.min(sampleHeight - 1, y));
    const idx = (cy * sampleWidth + cx) * 4;
    return (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
  }

  // 1. 상단 모서리 2곳의 배경 밝기 추정 (하단 조명 반사광 영향 배제)
  const bgTopLeft = getBrightness(10, 10);
  const bgTopRight = getBrightness(sampleWidth - 11, 10);
  const bgBrightness = (bgTopLeft + bgTopRight) / 2;

  // 2. 명함 중앙부 밝기 추정 (사용자는 보통 명함을 화면 중앙에 둠)
  const centerX = Math.round(sampleWidth / 2);
  const centerY = Math.round(sampleHeight * 0.48);
  let cardBrightness = getBrightness(centerX, centerY);

  // 중앙 픽셀이 글자(검은색)에 위치했을 경우를 대비하여 11x11 반경 내 최대 밝기 탐색
  for (let dy = -6; dy <= 6; dy += 2) {
    for (let dx = -6; dx <= 6; dx += 2) {
      const b = getBrightness(centerX + dx, centerY + dy);
      if (b > cardBrightness) cardBrightness = b;
    }
  }

  const isLightCard = cardBrightness > bgBrightness + 20;
  // 동적 감지 임계값
  const threshold = isLightCard
    ? Math.max(90, Math.round(bgBrightness + (cardBrightness - bgBrightness) * 0.4))
    : Math.round((bgBrightness + cardBrightness) / 2);

  // 3. Center-Outward Multi-Ray 스캔: 중앙에서 외곽으로 방사형 탐색
  // (외곽 책상 반사광이나 주변 잡음에 전혀 영향받지 않고 오직 명함 테두리만 검출)
  const lefts: number[] = [];
  const rights: number[] = [];

  // 가로 레이 스캔 (Y축 36% ~ 60% 구간의 여러 단면)
  const yPercentages = [0.36, 0.40, 0.44, 0.48, 0.52, 0.56, 0.60];
  for (const yPct of yPercentages) {
    const y = Math.round(sampleHeight * yPct);

    // 중앙에서 좌측으로 스캔
    let foundLeft = -1;
    for (let x = centerX; x >= 5; x--) {
      const b = getBrightness(x, y);
      const isBg = isLightCard ? b < threshold : b > threshold;
      if (isBg) {
        // 명함 내 글자나 로고에 의한 일시적 어두움 방지를 위해 연속 7픽셀 이상 배경 유지 여부 확인
        let sustained = true;
        for (let d = 1; d <= 7; d++) {
          if (x - d >= 0) {
            const b2 = getBrightness(x - d, y);
            const isBg2 = isLightCard ? b2 < threshold + 15 : b2 > threshold - 15;
            if (!isBg2) {
              sustained = false;
              break;
            }
          }
        }
        if (sustained) {
          foundLeft = x + 1;
          break;
        }
      }
    }
    if (foundLeft !== -1 && foundLeft < sampleWidth * 0.42) {
      lefts.push(foundLeft);
    }

    // 중앙에서 우측으로 스캔
    let foundRight = -1;
    for (let x = centerX; x < sampleWidth - 5; x++) {
      const b = getBrightness(x, y);
      const isBg = isLightCard ? b < threshold : b > threshold;
      if (isBg) {
        let sustained = true;
        for (let d = 1; d <= 7; d++) {
          if (x + d < sampleWidth) {
            const b2 = getBrightness(x + d, y);
            const isBg2 = isLightCard ? b2 < threshold + 15 : b2 > threshold - 15;
            if (!isBg2) {
              sustained = false;
              break;
            }
          }
        }
        if (sustained) {
          foundRight = x - 1;
          break;
        }
      }
    }
    if (foundRight !== -1 && foundRight > sampleWidth * 0.58) {
      rights.push(foundRight);
    }
  }

  // 세로 레이 스캔 (X축 28% ~ 72% 구간의 여러 단면)
  const tops: number[] = [];
  const bottoms: number[] = [];
  const xPercentages = [0.28, 0.35, 0.42, 0.50, 0.58, 0.65, 0.72];

  for (const xPct of xPercentages) {
    const x = Math.round(sampleWidth * xPct);

    // 중앙에서 위쪽으로 스캔
    let foundTop = -1;
    for (let y = centerY; y >= 5; y--) {
      const b = getBrightness(x, y);
      const isBg = isLightCard ? b < threshold : b > threshold;
      if (isBg) {
        let sustained = true;
        for (let d = 1; d <= 7; d++) {
          if (y - d >= 0) {
            const b2 = getBrightness(x, y - d);
            const isBg2 = isLightCard ? b2 < threshold + 15 : b2 > threshold - 15;
            if (!isBg2) {
              sustained = false;
              break;
            }
          }
        }
        if (sustained) {
          foundTop = y + 1;
          break;
        }
      }
    }
    if (foundTop !== -1 && foundTop < sampleHeight * 0.48) {
      tops.push(foundTop);
    }

    // 중앙에서 아래쪽으로 스캔
    let foundBottom = -1;
    for (let y = centerY; y < sampleHeight - 5; y++) {
      const b = getBrightness(x, y);
      const isBg = isLightCard ? b < threshold : b > threshold;
      if (isBg) {
        let sustained = true;
        for (let d = 1; d <= 7; d++) {
          if (y + d < sampleHeight) {
            const b2 = getBrightness(x, y + d);
            const isBg2 = isLightCard ? b2 < threshold + 15 : b2 > threshold - 15;
            if (!isBg2) {
              sustained = false;
              break;
            }
          }
        }
        if (sustained) {
          foundBottom = y - 1;
          break;
        }
      }
    }
    if (foundBottom !== -1 && foundBottom > sampleHeight * 0.48) {
      bottoms.push(foundBottom);
    }
  }

  // 중위값(Median) 추출
  function getMedian(arr: number[]): number | null {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  const medLeft = getMedian(lefts);
  const medRight = getMedian(rights);
  const medTop = getMedian(tops);
  const medBottom = getMedian(bottoms);

  // 결과 검증 및 정규화
  if (
    medLeft !== null &&
    medRight !== null &&
    medTop !== null &&
    medBottom !== null &&
    medRight > medLeft &&
    medBottom > medTop
  ) {
    const rawW = medRight - medLeft;
    const rawH = medBottom - medTop;

    // 명함 크기가 화면의 25%~98% 범위 내에 있는지 확인
    if (rawW > sampleWidth * 0.25 && rawH > sampleHeight * 0.12) {
      return {
        x: Math.max(0, Math.min(0.9, medLeft / sampleWidth)),
        y: Math.max(0, Math.min(0.9, medTop / sampleHeight)),
        width: Math.min(1, rawW / sampleWidth),
        height: Math.min(1, rawH / sampleHeight),
      };
    }
  }

  // 기본 여백 Fallback (가운데 80%)
  return {
    x: 0.1,
    y: 0.25,
    width: 0.8,
    height: 0.5,
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
      canvas.width = Math.max(1, cropW);
      canvas.height = Math.max(1, cropH);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const base64 = sourceDataUrl.split(',')[1] || '';
        resolve({ croppedDataUrl: sourceDataUrl, croppedBase64: base64 });
        return;
      }

      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.94);
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
 * 이미지를 90도 시계방향 회전
 */
export async function rotateDataUrl(dataUrl: string, degrees: number): Promise<string> {
  if (degrees % 360 === 0) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      const rad = (degrees * Math.PI) / 180;
      if (degrees === 90 || degrees === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/jpeg', 0.94));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
