import { pgTable, serial, text, varchar, integer, real, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * @description 단가 데이터베이스 (Price DB)
 * 자재, 노임, 중기사용료 등 모든 개별 항목의 단가를 저장하는 테이블입니다.
 * 엑셀 파일 '자재.csv', '노임.csv', '중기사용료.csv'의 통합본 역할을 합니다.
 */
export const PriceList = pgTable('price_list', {
  id: serial('id').primaryKey(),
  itemCode: varchar('item_code', { length: 50 }).notNull().unique(), // 품목 코드 (예: M-001, L-001)
  itemName: varchar('item_name', { length: 255 }).notNull(),        // 품명 (예: 에폭시수지, 특별인부)
  unit: varchar('unit', { length: 50 }),                            // 단위 (예: kg, 인, 시간)
  unitPrice: integer('unit_price').notNull(),                       // 단가
  type: varchar('type', { length: 50 }).notNull(),                  // 타입 ('material', 'labor', 'equipment')
}, (table) => {
  return {
    itemCodeIdx: uniqueIndex('item_code_idx').on(table.itemCode),
  };
});

/**
 * @description 할증 및 특수조건 규칙 테이블
 * 곡관부, 입상관 등 특정 조건에 따른 추가 계산 규칙을 정의합니다.
 */
export const SurchargeRules = pgTable('surcharge_rules', {
    id: serial('id').primaryKey(),
    condition: varchar('condition', { length: 100 }).notNull().unique(), // 적용 조건 (예: 'riser', 'bend_3_or_more')
    description: text('description'),
    
    // 할증 타입: 'percentage' (노무비의 30% 등), 'fixed' (고정값 추가)
    surchargeType: varchar('surcharge_type', { length: 50 }).notNull(), 
    
    // 적용될 값 (예: 30%일 경우 1.3, 15%일 경우 1.15)
    value: real('value').notNull(), 
    
    // 할증이 적용될 대상 (예: 'labor_cost', 'total_cost')
    target: varchar('target', { length: 100 }).notNull(),
});

/**
 * @description 간접비(경비) 계산 규칙 테이블
 * 산재보험료, 안전관리비, 이윤 등 간접비 항목과 요율을 저장합니다.
 */
export const OverheadRules = pgTable('overhead_rules', {
  id: serial('id').primaryKey(),
  itemName: varchar('item_name', { length: 255 }).notNull().unique(), // 경비 항목명
  // 적용 기준: 'direct_labor_cost', 'direct_material_cost', 'total_direct_cost' 등
  basis: varchar('basis', { length: 100 }).notNull(),
  rate: real('rate').notNull(), // 적용 요율 (예: 3.2%일 경우 0.032)
}); 