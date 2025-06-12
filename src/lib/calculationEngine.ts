import { db } from '@/db';
import { PriceList, UnitPriceRules, SurchargeRules, OverheadRules } from '@/db/schema';
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

// 공종별 비용 타입
export interface CategoryCost {
  category: string;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  totalCost: number;
}

// 계산 결과 타입
export interface CalculationResult {
  totalCost: number;
  directMaterialCost: number; // 직접 재료비
  directLaborCost: number;    // 직접 노무비
  directEquipmentCost: number; // 직접 경비 (중기사용료)
  surchargeDetails: { description: string; amount: number }[];
  overheadDetails: { itemName: string; amount: number }[]; // 간접비 상세 내역
  totalOverheadCost: number; // 총 간접비
  costsByCategory: CategoryCost[]; // 공종별 비용
  lineItems: {
    itemName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    type: 'material' | 'labor' | 'equipment';
    workCategory: string; // 공종 정보 추가
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
  
  // 공종별 비용을 집계하기 위한 맵 생성
  const categoryMap = new Map<string, {
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    totalCost: number;
  }>();

  for (const rule of rules) {
    const priceInfo = priceMap.get(rule.itemCode);
    if (!priceInfo) {
      // 이 오류는 데이터 정합성이 맞으면 발생하지 않아야 함
      throw new Error(`단가 목록에 없는 품목 코드(${rule.itemCode})가 규칙에 포함되어 있습니다.`);
    }

    const costPerMeter = rule.quantity * priceInfo.unitPrice;
    
    // 공종 정보 가져오기
    const workCategory = rule.workCategory || '기타';
    
    // 공종별 비용 집계 맵 업데이트
    if (!categoryMap.has(workCategory)) {
      categoryMap.set(workCategory, {
        materialCost: 0,
        laborCost: 0,
        equipmentCost: 0,
        totalCost: 0
      });
    }
    
    const categoryData = categoryMap.get(workCategory)!;
    
    // 타입별로 비용 집계
    if (priceInfo.type === 'material') {
      directMaterialCostPerMeter += costPerMeter;
      categoryData.materialCost += costPerMeter * options.length;
      categoryData.totalCost += costPerMeter * options.length;
    } else if (priceInfo.type === 'labor') {
      directLaborCostPerMeter += costPerMeter;
      categoryData.laborCost += costPerMeter * options.length;
      categoryData.totalCost += costPerMeter * options.length;
    } else if (priceInfo.type === 'equipment') {
      directEquipmentCostPerMeter += costPerMeter;
      categoryData.equipmentCost += costPerMeter * options.length;
      categoryData.totalCost += costPerMeter * options.length;
    }
    
    // lineItems에 공종 정보 추가
    lineItems.push({
      itemName: priceInfo.itemName,
      unit: priceInfo.unit || '개',
      quantity: rule.quantity,
      unitPrice: priceInfo.unitPrice,
      totalPrice: costPerMeter,
      type: priceInfo.type as any,
      workCategory: workCategory
    });
  }

  // 총 직접 공사비 계산 (미터당 비용 * 총 길이)
  const directMaterialCost = directMaterialCostPerMeter * options.length;
  const directLaborCost = directLaborCostPerMeter * options.length;
  const directEquipmentCost = directEquipmentCostPerMeter * options.length;
  const totalDirectCost = directMaterialCost + directLaborCost + directEquipmentCost;

  // 4. 할증 규칙 적용
  const surchargeDetails: CalculationResult['surchargeDetails'] = [];
  let totalSurchargeCost = 0;

  if (options.isRiser) {
    const riserRules = await db.select().from(SurchargeRules).where(
      eq(SurchargeRules.condition, 'riser')
    );
    
    if (riserRules.length > 0) {
      const riserRule = riserRules[0];
      // 입상관 할증은 직접노무비에만 적용
      const laborCost = directLaborCost;
      const surchargeAmount = laborCost * (riserRule.value - 1);
      totalSurchargeCost += surchargeAmount;
      surchargeDetails.push({ description: riserRule.description || '입상관 할증', amount: surchargeAmount });
      
      // 할증 비용을 각 공종별로 노무비에 비례하여 분배
      for (const [category, data] of categoryMap.entries()) {
        if (data.laborCost > 0) {
          const categoryLaborRatio = data.laborCost / directLaborCost;
          const categorySurcharge = surchargeAmount * categoryLaborRatio;
          data.totalCost += categorySurcharge;
        }
      }
    }
  }

  // 5. 간접비 계산
  const overheadRules = await db.select().from(OverheadRules);
  const overheadDetails: CalculationResult['overheadDetails'] = [];
  let totalOverheadCost = 0;

  // 간접비 계산을 위한 기준 비용 맵
  const costBasis = {
    direct_material_cost: directMaterialCost,
    direct_labor_cost: directLaborCost,
    direct_equipment_cost: directEquipmentCost,
    total_direct_cost: totalDirectCost,
  };

  for (const rule of overheadRules) {
    const basisCost = costBasis[rule.basis as keyof typeof costBasis];
    if (basisCost !== undefined) {
      const overheadAmount = Math.round(basisCost * rule.rate);
      totalOverheadCost += overheadAmount;
      overheadDetails.push({ itemName: rule.itemName, amount: overheadAmount });
    } else {
      console.warn(`간접비 계산 기준 '${rule.basis}'가 유효하지 않습니다.`);
    }
  }

  // 6. 최종 공사비 계산 (직접비 + 할증 + 간접비)
  const totalCost = totalDirectCost + totalSurchargeCost + totalOverheadCost;
  
  // 7. 공종별 비용 배열로 변환
  const costsByCategory: CategoryCost[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    materialCost: data.materialCost,
    laborCost: data.laborCost,
    equipmentCost: data.equipmentCost,
    totalCost: data.totalCost
  }));

  // 8. 최종 결과 반환
  return {
    totalCost,
    directMaterialCost,
    directLaborCost,
    directEquipmentCost,
    surchargeDetails,
    overheadDetails,
    totalOverheadCost,
    costsByCategory,
    lineItems,
  };
} 