# 📊 POC 기반 주식 종목 추천 시스템 (Yahoo Finance 버전)

매물대 차트(Volume Profile)의 POC(Point of Control)를 활용한 자동 종목 추천 시스템입니다.

## 🎯 현재 버전: Yahoo Finance (무료 테스트 버전)

이 버전은 **Yahoo Finance API**를 사용하여 **API 키 없이** 바로 테스트할 수 있습니다!

### ✅ 장점:
- 완전 무료
- API 키 발급 불필요
- 즉시 사용 가능
- 증권사 계좌 없어도 OK

### ⚠️ 제한사항:
- Yahoo Finance 데이터 (한국 주식 지원하지만 일부 데이터 누락 가능)
- 실시간이 아닌 약간의 지연 있음
- 매매 기능 없음 (시세 조회만)

---

## 📈 업그레이드 로드맵

### Phase 1: 현재 (Yahoo Finance) ✅
- API 키 불필요
- 무료 테스트
- 기본 기능 검증

### Phase 2: 한국투자증권 (업그레이드)
- 실시간 정확한 데이터
- 모의투자 지원
- 실전 매매 가능
- [한국투자증권 API 신청](https://apiportal.koreainvestment.com/)

---

## 🚀 설치 및 실행 방법

### 1단계: GitHub 저장소 생성

1. [GitHub](https://github.com) 로그인
2. "New repository" 클릭
3. Repository name: `stock-recommendation`
4. Public 선택
5. "Create repository" 클릭

### 2단계: 파일 업로드

제공받은 모든 파일을 GitHub에 업로드:
- 드래그 앤 드롭으로 업로드
- 또는 Git 명령어 사용

```bash
git init
git add .
git commit -m "Initial commit: Yahoo Finance version"
git remote add origin https://github.com/your-username/stock-recommendation.git
git push -u origin main
```

### 3단계: Vercel 배포

1. [Vercel](https://vercel.com) 계정 생성 (GitHub 연동)
2. "New Project" 클릭
3. GitHub 저장소 선택 `stock-recommendation`
4. **환경 변수 설정 불필요!** (Yahoo Finance는 API 키 필요 없음)
5. "Deploy" 클릭!

### 4단계: 접속 및 사용

- 배포 완료 후 제공되는 URL로 접속
- 모바일/PC 모두 사용 가능
- "종목 검색 시작" 클릭하면 바로 작동!

---

## 💰 비용

**완전 무료!**
- GitHub: 무료
- Vercel: 무료 티어
- Yahoo Finance: 무료
- **총 비용: 0원**

---

## 🔄 한국투자증권으로 업그레이드하기

더 정확한 데이터와 실전 매매를 원하시면:

### 1. 한국투자증권 API 발급
1. [한국투자증권](https://www.koreainvestment.com/) 계좌 개설
2. [KIS Developers](https://apiportal.koreainvestment.com/) 에서 API 신청
3. APP_KEY, APP_SECRET 발급

### 2. 업그레이드된 코드 사용
- 별도로 제공된 `api/scan-kis.js` 파일 사용
- `api/scan.js`를 `scan-kis.js`로 교체
- Vercel 환경변수 설정:
  - `KIS_APP_KEY`
  - `KIS_APP_SECRET`

### 3. 재배포
- Git push 하면 Vercel이 자동으로 재배포
- 더 정확한 실시간 데이터로 업그레이드 완료!

---

## 📱 사용 방법

### 1. 조건 설정
- **POC 오차범위**: 2% (기본값, 1-5% 권장)
- **최소 반등 강도**: 1% (기본값)
- **거래량 배수**: 1.5배 (기본값)
- **가격 범위**: 5,000원 ~ 100,000원

### 2. 종목 검색
- "종목 검색 시작" 버튼 클릭
- 10-20초 대기 (20개 종목 분석)

### 3. 결과 확인
- 매수/매도 시그널 종목 리스트
- POC 가격, 거래량, 추천 근거 확인
- 매물대 차트 시각화

---

## 🛠 기술 스택

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js (Vercel Serverless)
- **Data Source**: Yahoo Finance API (현재)
- **Hosting**: Vercel + GitHub
- **Cost**: 100% Free

---

## 📊 지원 종목

현재 20개 주요 종목:
- 삼성전자, SK하이닉스, NAVER, 현대차
- LG화학, 삼성SDI, 카카오, 셀트리온
- POSCO, 현대모비스, LG전자, SK이노베이션
- 그 외 금융, 통신, 운수 등

`api/scan.js`에서 종목 추가/변경 가능!

---

## 💡 POC 매매 전략이란?

**POC (Point of Control)**: 특정 기간 동안 가장 많은 거래가 일어난 가격대

### 매수 시그널:
- 주가가 POC 근처까지 하락
- POC에서 지지 받고 반등
- 거래량 증가 동반
→ 상승 가능성 높음

### 매도 시그널:
- 주가가 POC 근처까지 상승
- POC에서 저항 받고 하락
- 거래량 증가 동반
→ 조정 가능성 높음

---

## ⚠️ 면책 조항

이 시스템은 **교육 및 정보 제공 목적**입니다.
- 투자 권유가 아닙니다
- 수익을 보장하지 않습니다
- 모든 투자 결정은 본인 책임입니다

---

## 🆘 문제 해결

### "조건에 맞는 종목이 없습니다"
→ 조건을 완화하세요 (POC 오차범위 3-5%, 거래량 1.2배)

### 로딩이 오래 걸림
→ 정상입니다 (20개 종목 분석 시 약 10-20초)

### API 연결 실패
→ 네트워크 확인, Yahoo Finance 서비스 상태 확인

---

## 📞 다음 단계

1. ✅ Yahoo Finance로 시스템 테스트
2. 📈 전략 검증 및 조건 최적화
3. 🚀 한국투자증권 API로 업그레이드
4. 💰 실전 모의투자 시작!

**Happy Trading! 📊✨**
