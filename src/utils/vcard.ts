import { BusinessCardData } from '../types/card';

/**
 * BusinessCardData 객체를 vCard (.vcf) 표준 문자열로 변환합니다.
 */
export function generateVCardString(card: BusinessCardData): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN;CHARSET=UTF-8:${card.name}`,
    `N;CHARSET=UTF-8:${card.name};;;;`,
    card.company ? `ORG;CHARSET=UTF-8:${card.company}${card.department ? ';' + card.department : ''}` : '',
    card.position ? `TITLE;CHARSET=UTF-8:${card.position}` : '',
    card.phone ? `TEL;TYPE=CELL,VOICE:${card.phone}` : '',
    card.tel ? `TEL;TYPE=WORK,VOICE:${card.tel}` : '',
    card.email ? `EMAIL;TYPE=WORK,INTERNET:${card.email}` : '',
    card.website ? `URL:${card.website}` : '',
    card.address ? `ADR;TYPE=WORK;CHARSET=UTF-8:;;${card.address};;;;` : '',
    card.memo ? `NOTE;CHARSET=UTF-8:${card.memo}` : '',
    'END:VCARD'
  ];

  return lines.filter(Boolean).join('\r\n');
}

/**
 * vCard 파일(.vcf)을 다운로드 트리거합니다. 모바일 브라우저에서는 연락처 앱으로 바로 연결됩니다.
 */
export function downloadVCard(card: BusinessCardData): void {
  const vcard = generateVCardString(card);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${card.name.trim()}_연락처.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
