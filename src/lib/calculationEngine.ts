import { db } from '@/db';
import { PriceList, UnitPriceRules, SurchargeRules } from '@/db/schema';
import { and, eq, lte, gte, inArray } from 'drizzle-orm';

// --- 1. 타입 정의 ---

// 계산 함수에 필요한 입력 값 타입
export interface CalculationOptions {
  pipeType: 'steel' | 'ductile';
  diameter: number; // 예: 300
  length: number;   // 예: 150 (m)
  isRiser: boolean;
  // TODO: 향후 '곡관부' 등 추가 조건 확장 가능
}

// 계산 결과 타입
export interface CalculationResult {
  totalCost: number;
  directMaterialCost: number; // 직접 재료비
  directLaborCost: number;    // 직접 노무비
  directEquipmentCost: number; // 직접 경비 (중기사용료)
  surchargeDetails: { description: string; amount: number }[];
  lineItems: {
    itemName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    type: 'material' | 'labor' | 'equipment';
  }[];
}

// --- 2. 핵심 계산 함수 ---

export async function calculateConstructionCost(options: CalculationOptions): Promise<CalculationResult> {
  // 1. 조건에 맞는 '단위 공사 규칙' 조회
  const rules = await db.select().from(UnitPriceRules).where(
    and(
      eq(UnitPriceRules.pipeType, options.pipeType),
      lte(UnitPriceRules.minDiameter, options.diameter),
      gte(UnitPriceRules.maxDiameter, options.diameter)
    )
  );

  if (rules.length === 0) {
    throw new Error(`해당 조건(관종: ${options.pipeType}, 관경: ${options.diameter}mm)에 맞는 공사 규칙을 찾을 수 없습니다.`);
  }

  // 2. 규칙에 포함된 모든 자원의 단가 한 번에 조회
  const itemCodes = rules.map(rule => rule.itemCode);
  const prices = await db.select().from(PriceList).where(
    inArray(PriceList.itemCode, itemCodes)
  );
  
  // 가격 조회를 쉽게 하기 위해 Map으로 변환
  const priceMap = new Map(prices.map(p => [p.itemCode, p]));

  // 3. 1m당 직접 공사비 계산
  let directMaterialCostPerMeter = 0;
  let directLaborCostPerMeter = 0;
  let directEquipmentCostPerMeter = 0;
  const lineItems: CalculationResult['lineItems'] = [];

  for (const rule of rules) {
    const priceInfo = priceMap.get(rule.itemCode);
    if (!priceInfo) {
      // 이 오류는 데이터 정합성이 맞으면 발생하지 않아야 함
      throw new Error(`단가 목록에 없는 품목 코드(${rule.itemCode})가 규칙에 포함되어 있습니다.`);
    }

    const costPerMeter = rule.quantity * priceInfo.unitPrice;
    lineItems.push({
      itemName: priceInfo.itemName,
      unit: priceInfo.unit || '개',
      quantity: rule.quantity,
      unitPrice: priceInfo.unitPrice,
      totalPrice: costPerMeter,
      type: priceInfo.type as any,
    });

    if (priceInfo.type === 'material') directMaterialCostPerMeter += costPerMeter;
    else if (priceInfo.type === 'labor') directLaborCostPerMeter += costPerMeter;
    else if (priceInfo.type === 'equipment') directEquipmentCostPerMeter += costPerMeter;
  }

  // 4. 할증 규칙 적용
  const surchargeDetails: CalculationResult['surchargeDetails'] = [];
  let totalCost = 
    (directMaterialCostPerMeter + directLaborCostPerMeter + directEquipmentCostPerMeter) * options.length;

  if (options.isRiser) {
    const riserRules = await db.select().from(SurchargeRules).where(
      eq(SurchargeRules.condition, 'riser')
    );
    
    if (riserRules.length > 0) {
      const riserRule = riserRules[0];
      // 입상관 할증은 직접노무비에만 적용
      const laborCost = directLaborCostPerMeter * options.length;
      const surchargeAmount = laborCost * (riserRule.value - 1);
      totalCost += surchargeAmount;
      surchargeDetails.push({ description: riserRule.description || '입상관 할증', amount: surchargeAmount });
    }
  }

  // 5. 최종 결과 반환
  return {
    totalCost,
    directMaterialCost: directMaterialCostPerMeter * options.length,
    directLaborCost: directLaborCostPerMeter * options.length,
    directEquipmentCost: directEquipmentCostPerMeter * options.length,
    surchargeDetails,
    lineItems,
  };
} 