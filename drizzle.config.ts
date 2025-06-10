import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'pe_liner',
  },
} satisfies Config; 