/**
 * @file PE-Liner의 핵심 계산 로직 유틸리티
 * @description 2025 건설공사 표준품셈에 기반한 계산 함수들을 포함합니다.
 */

/**
 * 장비 조합에 대한 타입 정의
 */
export interface EquipmentCombination {
    liningMachine: number;
    airCompressor: number;
  }
  
  /**
   * 표준품셈 4-3-2 항목에 명시된 관 구경별 장비 조합
   * * @important
   * 현재 표준품셈에는 300mm 이하의 규격만 명시되어 있습니다.
   * D350 ~ D1200에 해당하는 장비 조합은 추후 이 테이블에 직접 추가해야 합니다.
   */
  const equipmentCombinationTable: Record<string, EquipmentCombination> = {
    // ø15∼50
    '50': { liningMachine: 1, airCompressor: 1 },
    // ø65∼100
    '100': { liningMachine: 1, airCompressor: 2 },
    // ø125∼200
    '200': { liningMachine: 1, airCompressor: 5 },
    // ø250∼300
    '300': { liningMachine: 1, airCompressor: 6 },
    // TODO: D350 ~ D1200 규격에 대한 장비 조합 데이터를 여기에 추가해야 합니다.
    // 예시: '1200': { liningMachine: 2, airCompressor: 10 },
  };
  
  /**
   * 관 구경(diameter)에 따라 표준품셈에 맞는 장비 조합을 반환합니다.
   * @param diameter - 관 구경 (단위: mm)
   * @returns {EquipmentCombination} 해당 구경에 필요한 장비 조합
   * @throws {Error} 지원하지 않는 구경이거나 데이터 테이블에 정의되지 않은 경우
   */
  export function getRequiredEquipment(diameter: number): EquipmentCombination {
    if (diameter <= 0) {
      throw new Error('관 구경은 0보다 커야 합니다.');
    }
  
    const supportedSizes = Object.keys(equipmentCombinationTable).map(Number).sort((a, b) => a - b);
    
    for (const size of supportedSizes) {
      if (diameter <= size) {
        return equipmentCombinationTable[size.toString()];
      }
    }
  
    // 테이블에 정의된 가장 큰 사이즈보다 클 경우
    throw new Error(`${diameter}mm는 지원하지 않는 구경입니다. equipmentCombinationTable에 데이터를 추가해야 합니다.`);
  }
  
  /**
   * 입상관(Riser pipe) 여부에 따른 비용 할증률을 반환합니다.
   * @param isRiser - 입상관 여부 (boolean)
   * @returns 할증률 (예: 30% 할증 시 1.3)
   */
  export function getRiserSurchargeRate(isRiser: boolean): number {
    // 표준품셈 4-3-2-④: 입상관의 경우는 본 품에 30%를 가산한다.
    return isRiser ? 1.3 : 1.0;
  }