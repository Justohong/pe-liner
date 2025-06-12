import { sql } from 'drizzle-orm';

export async function up(db: any) {
  await db.execute(sql`
    ALTER TABLE unit_price_rules
    ADD COLUMN IF NOT EXISTS work_category VARCHAR(255) NOT NULL DEFAULT '기타';
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    ALTER TABLE unit_price_rules
    DROP COLUMN IF EXISTS work_category;
  `);
} 