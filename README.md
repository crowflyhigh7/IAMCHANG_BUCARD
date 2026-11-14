# BUCARD (bucard.iamchang.me)

> 모던 & 스마트 명함 관리 웹 애플리케이션  
> React + TypeScript + Vite + Tailwind CSS 기반 초경량 / 고성능 웹앱

---

## 🌟 주요 기능

1. **디지털 비즈니스 카드 관리**
   - 6가지 모던 프리미엄 카드 테마 (오션 블루, 매트 블랙, 에메랄드, 로열 퍼플, 선셋 등)
   - 이름, 직책, 회사, 부서, 이메일, 휴대폰/유선전화, 웹사이트, 주소, 미팅 메모
   - 태그 분류 및 즐겨찾기 기능

2. **내 디지털 명함 (My Card) & 풀스크린 QR 공유**
   - 언제 어디서든 모바일로 내 명함을 띄워 상대방에게 제시
   - 카메라로 즉시 스캔 가능한 vCard QR 코드 지원

3. **vCard (.vcf) 원클릭 주소록 저장**
   - 모바일 기본 연락처 앱(아이폰 연락처, 갤럭시 연락처)과 완벽 호환
   - QR 스캔 또는 파일 다운로드로 원클릭 연락처 등록

4. **검색 및 필터링**
   - 이름, 회사, 직책, 태그, 메모 통합 실시간 검색
   - 태그별 원클릭 필터 & 즐겨찾기 모아보기
   - 최신순, 이름순, 회사명순 정렬 및 카드 뷰/리스트 뷰 전환

5. **완벽한 프라이버시 & 데이터 백업**
   - 모든 데이터는 사용자의 브라우저(LocalStorage)에 안전하게 저장
   - 원클릭 JSON 데이터 전체 백업 및 파일 복원 지원

---

## 🚀 로컬 개발 및 실행

```bash
# 패키지 설치
npm install

# 개발 서버 실행 (localhost:5173)
npm run dev

# 프로덕션 빌드
npm run build
```

---

## ☁️ Cloudflare Pages 배포 & 도메인 연결 가이드

### 1단계: GitHub에 소스코드 푸시
```bash
git init
git add .
git commit -m "feat: initial commit for BUCARD"
git branch -M main
git remote add origin https://github.com/{사용자이름}/IAMCHANG_BUCARD.git
git push -u origin main
```

### 2단계: Cloudflare Pages 연동
1. [Cloudflare 대시보드](https://dash.cloudflare.com/)에 로그인합니다.
2. 좌측 메뉴에서 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**을 선택합니다.
3. 방금 푸시한 `IAMCHANG_BUCARD` GitHub 레포지토리를 선택합니다.
4. 빌드 설정을 다음과 같이 지정합니다:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. **Save and Deploy** 버튼을 클릭하면 1분 이내로 배포가 완료됩니다.

### 3단계: 커스텀 도메인 (`bucard.iamchang.me`) 연결
1. 배포된 Pages 프로젝트의 **Custom domains** 탭으로 이동합니다.
2. **Set up a custom domain** 버튼을 클릭합니다.
3. `bucard.iamchang.me`를 입력하고 계속을 누릅니다.
4. 이미 `iamchang.me` 도메인이 Cloudflare에 등록되어 있다면 자동으로 DNS 레코드(CNAME)가 추가되고 SSL 인증서가 즉시 발급됩니다.
