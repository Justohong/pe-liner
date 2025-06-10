import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, closeConnection } from './index';
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

// 마이그레이션 실행 함수
async function runMigration() {
  try {
    console.log('마이그레이션 시작...');
    
    // drizzle 디렉토리의 마이그레이션 파일을 적용
    await migrate(db, { migrationsFolder: 'drizzle' });
    
    console.log('마이그레이션 완료!');
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error);
    process.exit(1);
  } finally {
    // 데이터베이스 연결 종료
    await closeConnection();
  }
}

// 스크립트가 직접 실행될 때만 마이그레이션 실행
if (require.main === module) {
  runMigration();
}

export default runMigration; 