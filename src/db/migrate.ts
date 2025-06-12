import { db, closeConnection } from './index';
import { sql } from 'drizzle-orm';
import * as migration_0001 from './migrations/0001_add_overhead_rules';
import * as migration_0002 from './migrations/0002_add_work_category';

async function runMigrations() {
  console.log('Running migrations...');

  try {
    // 마이그레이션 테이블 생성
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 마이그레이션 실행
    const migrations = [
      { name: '0001_add_overhead_rules', up: migration_0001.up, down: migration_0001.down },
      { name: '0002_add_work_category', up: migration_0002.up, down: migration_0002.down },
    ];

    for (const migration of migrations) {
      // 마이그레이션이 이미 실행되었는지 확인
      const result = await db.execute(sql`
        SELECT id FROM migrations WHERE name = ${migration.name}
      `);

      if (result.rowCount === 0) {
        console.log(`Executing migration: ${migration.name}`);
        await migration.up(db);
        await db.execute(sql`
          INSERT INTO migrations (name) VALUES (${migration.name})
        `);
        console.log(`Migration ${migration.name} completed successfully.`);
      } else {
        console.log(`Migration ${migration.name} already executed. Skipping.`);
      }
    }

    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await closeConnection();
  }
}

// 스크립트가 직접 실행될 때만 마이그레이션 실행
if (require.main === module) {
  runMigrations();
}

export { runMigrations }; 