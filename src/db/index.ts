import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

// 환경 변수에서 데이터베이스 연결 정보를 가져옵니다.
let pool: Pool;

// DATABASE_URL이 있으면 연결 문자열 사용, 없으면 개별 설정 사용
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
} else {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'pe_liner',
  });
}

// Drizzle ORM 인스턴스 생성
export const db = drizzle(pool, { schema });

// 데이터베이스 연결 테스트 함수
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('데이터베이스 연결 성공:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('데이터베이스 연결 실패:', error);
    return false;
  }
}

// 데이터베이스 연결 종료 함수
export async function closeConnection() {
  await pool.end();
  console.log('데이터베이스 연결이 종료되었습니다.');
} 