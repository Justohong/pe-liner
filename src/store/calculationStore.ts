import { create } from 'zustand';

// 공종별 비용 타입
export interface CategoryCost {
  category: string;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  totalCost: number;
  // 호환성을 위한 별칭 속성 추가
  material?: number;
  labor?: number;
  equipment?: number;
}

export interface LineItem {
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'material' | 'labor' | 'equipment';
  workCategory?: string;
  specification?: string;
  name?: string;
}

// API 응답 결과에 대한 상세 타입을 정의합니다.
// 이 타입은 이전에 calculationEngine.ts 또는 calculator/page.tsx 에서 정의했던 것과 동일합니다.
export interface CalculationResult {
  totalCost: number;
  directMaterialCost: number;
  directLaborCost: number;
  directEquipmentCost: number;
  surchargeDetails: { description: string; amount: number }[];
  overheadDetails: { itemName: string; amount: number }[]; // 간접비 상세 내역
  totalOverheadCost: number; // 총 간접비
  costsByCategory: CategoryCost[]; // 공종별 비용
  lineItems: LineItem[];
  summary?: {
    directCost: {
      total: number;
      material: number;
      labor: number;
      equipment: number;
      byCategory: CategoryCost[];
    };
    overheadCost: {
      total: number;
      items: { itemName: string; amount: number }[];
    };
    totalCost: number;
  };
}

// 스토어의 상태(state)와 행동(actions)에 대한 타입을 정의합니다.
interface CalculationState {
  result: CalculationResult | null;
  setCalculationResult: (newResult: CalculationResult | null) => void;
  clearResult: () => void;
}

/**
 * 계산 결과 데이터를 저장하고 관리하는 Zustand 스토어
 */
export const useCalculationStore = create<CalculationState>((set) => ({
  // 초기 상태
  result: null,

  // 상태를 업데이트하는 액션 함수
  setCalculationResult: (newResult) => set({ result: newResult }),
  
  // 상태를 초기화하는 액션 함수
  clearResult: () => set({ result: null }),
})); 