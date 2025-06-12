import { sql } from 'drizzle-orm';
import { pgTable, serial, varchar, real } from 'drizzle-orm/pg-core';

export async function up(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "overhead_rules" (
      "id" serial PRIMARY KEY,
      "item_name" varchar(255) NOT NULL UNIQUE,
      "basis" varchar(100) NOT NULL,
      "rate" real NOT NULL
    );
  `);
}

export async function down(db: any) {
  await db.execute(sql`DROP TABLE IF EXISTS "overhead_rules";`);
} 