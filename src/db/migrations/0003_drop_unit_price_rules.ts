import { sql } from 'drizzle-orm';

export async function up(db: any) {
  // UnitPriceRules 테이블에 대한 외래 키 제약 조건 삭제
  await db.execute(sql`
    ALTER TABLE IF EXISTS unit_price_rules
    DROP CONSTRAINT IF EXISTS unit_price_rules_item_code_fkey;
  `);
  
  // UnitPriceRules 테이블 삭제
  await db.execute(sql`
    DROP TABLE IF EXISTS unit_price_rules;
  `);
}

export async function down(db: any) {
  // 테이블 복원 로직 (필요한 경우)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS unit_price_rules (
      id SERIAL PRIMARY KEY,
      item_code VARCHAR(255) NOT NULL,
      pipe_type VARCHAR(255) NOT NULL,
      diameter INTEGER NOT NULL,
      quantity DECIMAL(10, 4) NOT NULL,
      unit VARCHAR(50) NOT NULL,
      work_category VARCHAR(255) NOT NULL DEFAULT 'default',
      FOREIGN KEY (item_code) REFERENCES price_list(item_code)
    );
  `);
}
