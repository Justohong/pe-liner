import { create } from 'zustand';

// API 응답 결과에 대한 상세 타입을 정의합니다.
// 이 타입은 이전에 calculationEngine.ts 또는 calculator/page.tsx 에서 정의했던 것과 동일합니다.
interface CalculationResult {
  totalCost: number;
  directMaterialCost: number;
  directLaborCost: number;
  directEquipmentCost: number;
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