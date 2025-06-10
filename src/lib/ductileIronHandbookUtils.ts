// 덕타일 주철관 핸드북 데이터 기반 유틸리티 함수

// 파이프 무게 데이터 타입 정의
type PipeWeightData = {
  [diameter: number]: number;
};

type PipeWeightMap = {
  [pipeClass: string]: PipeWeightData;
};

/**
 * 상수도 2종관의 호칭지름(mm)에 따른 m당 무게(kg)를 반환합니다.
 * (참고: 덕타일 주철관 핸드북 Ⅳ. 덕타일 주철관 - 표. 상수도 2종관)
 * 실제 핸드북 데이터를 기반으로 확장해야 합니다.
 */
const ductilePipeWeightsData: PipeWeightMap = {
  '2종관': { // 예시 데이터, 실제 핸드북 값으로 채워야 함
    75: 12.8,
    100: 16.4,
    150: 25.3,
    200: 35.4,
    250: 46.7,
    300: 59.1,
    350: 72.6,
    400: 87.2,
    450: 102.9,
    500: 119.7,
    600: 156.0,
    700: 202.0, // 700mm 부터는 1종관 또는 다른 규격일 수 있으므로 확인 필요
    800: 240.0,
    900: 282.0,
  },
  // 다른 관종 데이터 추가 가능 (예: '1종관', '3종관')
};

export function getDuctilePipeWeight(pipeClass: string, diameterMM: number): number | null {
  if (ductilePipeWeightsData[pipeClass] && ductilePipeWeightsData[pipeClass][diameterMM]) {
    return ductilePipeWeightsData[pipeClass][diameterMM];
  }
  return null;
}

/**
 * KP 메커니컬 조인트의 호칭지름(mm)에 따른 필요 부속품 수량을 반환합니다.
 * (참고: 덕타일 주철관 핸드북 Ⅲ. 주철관의 조인트 방법과 부속품 - 표. KP 메커니컬 조인트용 볼트·너트)
 * 실제 핸드북 데이터를 기반으로 확장해야 합니다.
 * 고무링은 일반적으로 1개로 가정합니다.
 */
const kpMechanicalJointPartsData: {
  [diameter: number]: { bolts: number, nuts: number, rubberRing: number }
} = {
  // 예시 데이터, 실제 핸드북 값으로 채워야 함
  75: { bolts: 4, nuts: 4, rubberRing: 1 },
  100: { bolts: 4, nuts: 4, rubberRing: 1 },
  150: { bolts: 6, nuts: 6, rubberRing: 1 },
  200: { bolts: 6, nuts: 6, rubberRing: 1 },
  250: { bolts: 8, nuts: 8, rubberRing: 1 },
  300: { bolts: 8, nuts: 8, rubberRing: 1 },
  350: { bolts: 10, nuts: 10, rubberRing: 1 },
  400: { bolts: 12, nuts: 12, rubberRing: 1 },
  450: { bolts: 12, nuts: 12, rubberRing: 1 },
  500: { bolts: 14, nuts: 14, rubberRing: 1 },
  600: { bolts: 16, nuts: 16, rubberRing: 1 },
  700: { bolts: 18, nuts: 18, rubberRing: 1 },
  800: { bolts: 20, nuts: 20, rubberRing: 1 },
  900: { bolts: 22, nuts: 22, rubberRing: 1 },
};

export function getKpMechanicalJointParts(diameterMM: number): { bolts: number, nuts: number, rubberRing: number } | null {
  if (kpMechanicalJointPartsData[diameterMM]) {
    return kpMechanicalJointPartsData[diameterMM];
  }
  return null;
}

// 파이프 표준길이 데이터 타입 정의
type PipeStandardLengthData = {
  [diameter: number]: number;
};

type PipeStandardLengthMap = {
  [pipeClass: string]: PipeStandardLengthData;
};

/**
 * 덕타일 주철관의 관종 및 호칭지름(mm)에 따른 표준길이(m/본)를 반환합니다.
 * (참고: 덕타일 주철관 핸드북)
 * 실제 핸드북 데이터를 기반으로 확장해야 합니다.
 */
const ductilePipeStandardLengthData: PipeStandardLengthMap = {
  // 예시 데이터, KSD 4311 기준 (일반적으로 4, 5, 6m)
  '1종관': {
    75: 6.0, 100: 6.0, 150: 6.0, 200: 6.0, 250: 6.0, 300: 6.0, 350: 6.0,
    400: 6.0, 450: 6.0, 500: 6.0, 600: 6.0, 700: 6.0, 800: 6.0, 900: 6.0,
  },
  '2종관': { // 상수도용 덕타일 주철관(2종)은 일반적으로 6m
    75: 6.0, 100: 6.0, 150: 6.0, 200: 6.0, 250: 6.0, 300: 6.0, 350: 6.0,
    400: 6.0, 450: 6.0, 500: 6.0, 600: 6.0, 700: 6.0, 800: 6.0, 900: 6.0,
  },
  '3종관': {
    75: 6.0, 100: 6.0, 150: 6.0, 200: 6.0, 250: 6.0, 300: 6.0, 350: 6.0,
    400: 6.0, 450: 6.0, 500: 6.0, 600: 6.0, 700: 6.0, 800: 6.0, 900: 6.0,
  }
  // 기타 관종 및 규격에 따른 표준 길이 추가
};

export function getDuctilePipeStandardLength(pipeClass: string, diameterMM: number): number | null {
  if (ductilePipeStandardLengthData[pipeClass] && ductilePipeStandardLengthData[pipeClass][diameterMM]) {
    return ductilePipeStandardLengthData[pipeClass][diameterMM];
  }
  // 특정 관종에 대한 기본값 (예: 모든 규격 6m)
  if (pipeClass && !ductilePipeStandardLengthData[pipeClass]) {
     console.warn(`Standard length for pipe class ${pipeClass} not found, defaulting to 6m if diameter exists for other classes.`);
     // 다른 관종에서 해당 구경의 길이를 찾아 반환하거나, 공통 기본값 사용
     for (const classKey in ductilePipeStandardLengthData) {
        if (ductilePipeStandardLengthData[classKey][diameterMM]) {
            return ductilePipeStandardLengthData[classKey][diameterMM];
        }
     }
     return 6.0; // 최후의 기본값
  }
  return null;
}


// 향후 추가될 수 있는 함수들:
// export function getTytonJointParts(diameterMM: number): { ... } | null { ... }
