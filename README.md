# PE-Liner 원가계산 자동화 시스템

PE-Liner 원가계산 자동화 시스템은 상수도 관로 공사에서 PE 라이닝 공법의 원가를 자동으로 계산하는 웹 애플리케이션입니다.

## 데이터베이스 설정

이 프로젝트는 PostgreSQL과 Drizzle ORM을 사용합니다.

### 필수 요구사항

- Node.js 18 이상
- PostgreSQL 14 이상

### 환경 설정

1. `.env.example` 파일을 복사하여 `.env` 파일을 생성합니다.

```bash
cp .env.example .env
```

2. `.env` 파일을 열고 데이터베이스 연결 정보를 설정합니다.

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=pe_liner
```

### 데이터베이스 마이그레이션

1. 마이그레이션 파일 생성

```bash
npm run db:generate
```

2. 마이그레이션 실행

```bash
npm run db:migrate
```

### 데이터 시딩

초기 데이터를 데이터베이스에 삽입하는 방법은 두 가지가 있습니다:

#### 1. 기본 데이터 사용

아무 설정 없이 다음 명령어를 실행하면 기본 데이터가 삽입됩니다:

```bash
npm run db:seed
```

#### 2. CSV 파일에서 데이터 가져오기

CSV 파일에서 데이터를 가져오려면 다음 위치에 CSV 파일을 준비합니다:

- 자재: `public/data/D1200mm 주철관기준(2024).xlsx - 자재.csv`
- 노임: `public/data/D1200mm 주철관기준(2024).xlsx - 노임.csv`
- 중기사용료: `public/data/D1200mm 주철관기준(2024).xlsx - 중기사용료.csv`

CSV 파일 형식:

**자재.csv**
```
번호,품명,단위,단가,비고
1,PE 라이너,m,15000,
2,에폭시 수지,kg,8000,
...
```

**노임.csv**
```
번호,직종명,공표노임,비고
1,특별인부,120000,
2,보통인부,100000,
...
```

**중기사용료.csv**
```
번호,분류,자재명,단위,가격,비고
1,라이닝 장비,라이닝기,시간,50000,
2,라이닝 장비,공기압축기,시간,30000,
...
```

파일을 준비한 후 다음 명령어를 실행합니다:

```bash
npm run db:seed
```

### Drizzle Studio 실행

데이터베이스 내용을 GUI로 확인하려면 Drizzle Studio를 사용할 수 있습니다.

```bash
npm run db:studio
```

## 개발 서버 실행

```bash
npm run dev
```

## 프로덕션 빌드

```bash
npm run build
npm start
```

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
