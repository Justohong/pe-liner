// 표준품셈 데이터 타입 정의
interface StandardInputItem {
  [key: string]: number | string;
  단위: string;
}

interface StandardSpecMap {
  [규격: string]: StandardInputItem;
}

interface StandardWorkMap {
  [공종중분류: string]: StandardSpecMap;
}

interface StandardCostData {
  [공종대분류: string]: StandardWorkMap;
}

export const standardCostData: StandardCostData = {
  관부설접합: {
    주철관_타이튼접합부설: {
      '100mm': { '배관공(수도)': 0.09, '보통인부': 0.18, '크레인_5ton_시간': 0.02, '단위': '본' },
      // 테스트 데이터로 수정: 배관공 0.07인, 보통인부 0.03인, 크레인 0.03hr
      '150mm': { '배관공(수도)': 0.07, '보통인부': 0.03, '크레인_5ton_시간': 0.03, '단위': '본' },
      '200mm': { '배관공(수도)': 0.15, '보통인부': 0.30, '크레인_5ton_시간': 0.04, '단위': '본' }, // 예시 값, 실제 표준품셈과 다를 수 있음
    },
    주철관_KP메커니컬접합부설: {
      '100mm': { '배관공(수도)': 0.04, '보통인부': 0.02, '단위': '본' },
      '150mm': { '배관공(수도)': 0.05, '보통인부': 0.03, '단위': '본' }, // 예시 값, 실제 표준품셈과 다를 수 있음
      '200mm': { '배관공(수도)': 0.06, '보통인부': 0.04, '단위': '본' }, // 예시 값, 실제 표준품셈과 다를 수 있음
    },
    주철관_관절단: {
      '100mm': { '배관공(수도)': 0.08, '단위': '개소' },
      '150mm': { '배관공(수도)': 0.10, '단위': '개소' }, // 예시 값, 실제 표준품셈과 다를 수 있음
      '200mm': { '배관공(수도)': 0.12, '단위': '개소' }, // 예시 값, 실제 표준품셈과 다를 수 있음
    }
  }
  // 다른 공종 데이터 추가 예정
};

export function getStandardInputs(공종대분류: string, 공종중분류: string, 규격: string): StandardInputItem | null {
  if (standardCostData[공종대분류] &&
      standardCostData[공종대분류][공종중분류] &&
      standardCostData[공종대분류][공종중분류][규격]) {
    return standardCostData[공종대분류][공종중분류][규격];
  }
  return null;
}
