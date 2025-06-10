# PE-Liner 공사비 계산 시스템

이 프로젝트는 PE-Liner 공사비 계산 자동화 시스템입니다.

## 기술 스택

- Next.js (React)
- TypeScript
- Drizzle ORM
- PostgreSQL
- Docker

## 설치 및 실행 방법

### 사전 요구사항

- Node.js 18 이상
- Docker Desktop

### 개발 환경 설정

1. 저장소 클론
```bash
git clone https://github.com/your-username/pe-liner.git
cd pe-liner
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
```bash
cp .env.example .env
```
필요한 경우 .env 파일의 데이터베이스 연결 정보를 수정하세요.

4. Docker로 PostgreSQL 실행
```bash
docker run --name pe-liner-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=pe-liner -p 5432:5432 -d postgres:16
```

5. 데이터베이스 마이그레이션 실행
```bash
npm run db:migrate
```

6. 초기 데이터 시드 실행
```bash
npm run db:seed
```

7. 개발 서버 실행
```bash
npm run dev
```

8. 브라우저에서 http://localhost:3000 접속

## 주요 기능

- PE-Liner 공사비 자동 계산
- 관종, 관경, 길이 등 조건별 계산
- 입상관 할증 적용
- 상세 내역서 생성

## 데이터베이스 구조

### 테이블 구조

1. `price_list` - 자재, 노무, 장비 단가 정보
2. `unit_price_rules` - 관종 및 관경별 투입 자원 규칙
3. `surcharge_rules` - 할증 규칙 (입상관 등)

### 데이터 시딩

`src/db/seed.ts` 파일은 초기 데이터를 데이터베이스에 삽입합니다.

## API 엔드포인트

- `POST /api/calculate` - 공사비 계산 API
  - 요청 본문: `{ pipeType, diameter, length, isRiser }`
  - 응답: 계산된 공사비 및 상세 내역

## 문제 해결

### 데이터베이스 연결 오류

Docker가 실행 중인지 확인하세요:
```bash
docker ps
```

PostgreSQL 컨테이너가 실행 중이 아니라면 다시 시작하세요:
```bash
docker start pe-liner-postgres
```
