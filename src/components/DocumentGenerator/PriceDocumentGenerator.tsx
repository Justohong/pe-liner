'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Checkbox } from "@/components/ui/checkbox" // If using actual UI elements later
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // If using actual UI elements later
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, RefreshCw, Plus, Trash2 } from 'lucide-react';
import type { GroupData } from '@/components/quantityData/UnitPriceSheetTable';
import { db, MaterialData, LaborData, MachineryData } from '@/utils/db'; // Import data types
import * as XLSX from 'xlsx';
import { sessionStore } from '@/utils/sessionStore';
import { getDuctilePipeStandardLength, getKpMechanicalJointParts } from '@/lib/ductileIronHandbookUtils'; // Handbook utils
import { standardCostData } from '@/lib/standardCostData'; // For surcharge rates, indirect cost rates (conceptual)

// --- Helper function to find material details ---
const findMaterialByNameAndSpec = (
  materials: MaterialData[],
  name: string,
  specSize?: number | string // Can be number for diameter or string for general spec
): MaterialData | undefined => {
  return materials.find(m => {
    const nameMatch = m.name.includes(name) || (m.품명 && m.품명.includes(name));
    if (!specSize) return nameMatch;
    const specStr = String(specSize);
    const specMatch = (m.spec && m.spec.includes(specStr)) || (m.호칭지름 && m.호칭지름.includes(specStr));
    return nameMatch && specMatch;
  });
};


// 규격 정보 인터페이스 추가
interface SpecInfo {
  id: string;
  name: string;
  totalLength: number;
  workHoles: number;
  bendCount: number;
}

interface ProjectDetails {
  projectName: string;
  // 공통 작업 정보를 규격별 정보로 이동
  // totalLength: number;
  // workHoles: number;
  // bendCount: number;
}

interface DocumentItem {
  공종명: string;
  규격: string;
  수량: number;
  단위: string;
  합계단가: number;
  합계금액: number;
  재료비단가: number;
  재료비금액: number;
  노무비단가: number;
  노무비금액: number;
  경비단가: number;
  경비금액: number;
  비고?: string; // Remarks, will include surcharge info etc.
  품셈코드?: string; // To store standard cost code
  calculationDetails?: any[]; // For '산출근거' sheet
  isSpecMatched?: boolean; // 규격 매칭 여부 추가
}

// surchargeRates에 대한 타입 정의 추가
type TerrainType = '평지' | '산악지' | '시가지';
type WorkingHoursType = '주간' | '야간';

// Surcharge and Additional Cost States (Conceptual - normally from React state via UI)
const surchargeConditions = {
  terrain: '평지' as TerrainType, // 예: '평지', '산악지', '시가지'
  workingHours: '주간' as WorkingHoursType, // 예: '주간', '야간'
  riskTypes: [], // 예: ['활선작업', '고소작업']
  // ... 기타 할증 조건
};

const additionalCostOptions = {
  applyPESleeve: false, // PE 슬리브 피복 적용 여부
  protectiveConcreteType: '없음', // 보호 콘크리트 종류 (예: '없음', 'A형', 'B형')
  // ... 기타 추가 비용 옵션
};

// Surcharge Rates (Conceptual - could be moved to standardCostData.ts or a new module)
const surchargeRates = {
  terrain: {
    '산악지': { labor: 0.2, expense: 0.1 }, // 노무비 20%, 경비 10% 할증
    '시가지': { labor: 0.15, expense: 0.05 },
  } as Record<TerrainType, { labor: number; expense: number }>,
  workingHours: {
    '야간': { labor: 0.25 }, // 노무비 25% 할증
  } as Record<WorkingHoursType, { labor: number; expense?: number }>,
  // ... 기타 할증률
};

// Indirect Cost Rates (Conceptual)
const indirectCostRates = {
  generalManagement: 0.05, // 일반관리비 5%
  profit: 0.10, // 이윤 10%
};


// 규격 매칭을 위한 유틸리티 함수 추가
function extractSizeNumber(spec: string): number {
  // D700mm, t=9.0mm 같은 형식에서 숫자만 추출
  const matches = spec.match(/\d+(\.\d+)?/g);
  if (matches && matches.length > 0) {
    return parseFloat(matches[0]);
  }
  return 0;
}

// 규격 매칭 함수
function matchSpecWithItem(itemSpec: string, userSpec: string): boolean {
  const itemNum = extractSizeNumber(itemSpec);
  const userNum = extractSizeNumber(userSpec);
  
  // 숫자가 추출되었고 일치하는 경우
  if (itemNum > 0 && userNum > 0 && itemNum === userNum) {
    return true;
  }
  
  // 텍스트가 포함되는 경우 (숫자가 없는 경우 고려)
  if (itemNum === 0 || userNum === 0) {
    return itemSpec.includes(userSpec) || userSpec.includes(itemSpec);
  }
  
  return false;
}

export default function PriceDocumentGenerator() {
  // 프로젝트 정보 상태
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    projectName: '',
  });

  // 규격 정보 상태 추가
  const [specInfos, setSpecInfos] = useState<SpecInfo[]>([]);
  
  // 규격 추가 여부 상태 추가
  const [hasSpecs, setHasSpecs] = useState<boolean>(false);

  // 일위대가목록 데이터 상태
  const [groupData, setGroupData] = useState<GroupData[]>([]);
  
  // 내역서 데이터 상태
  const [documentItems, setDocumentItems] = useState<DocumentItem[]>([]);
  
  // 오류 메시지 상태
  const [error, setError] = useState<string>('');

  // DB 데이터 상태 (자재, 노임 단가 조회용)
  const [materialDB, setMaterialDB] = useState<MaterialData[]>([]);
  const [laborDB, setLaborDB] = useState<LaborData[]>([]);
  // const [machineryDB, setMachineryDB] = useState<MachineryData[]>([]); // 필요시 추가

  // 작업정보 기본 상태 (규격이 없을 때 사용)
  const [defaultWorkInfo, setDefaultWorkInfo] = useState({
    totalLength: 0,
    workHoles: 0,
    bendCount: 0
  });

  // 작업정보 변경 핸들러 (규격이 없을 때 사용)
  const handleDefaultWorkInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedWorkInfo = { ...defaultWorkInfo, [name]: Number(value) };
    setDefaultWorkInfo(updatedWorkInfo);
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    try {
      const storedGroups = sessionStore.getUnitPriceGroups();
      if (storedGroups) setGroupData(storedGroups);

      const storedProjectDetails = sessionStore.getProjectDetails();
      if (storedProjectDetails) setProjectDetails(storedProjectDetails);

      const storedSpecInfos = sessionStore.getSpecInfos();
      if (storedSpecInfos) {
        setSpecInfos(storedSpecInfos);
        setHasSpecs(storedSpecInfos.length > 0);
      }

      const storedDocumentItems = sessionStore.getDocumentItems();
      if (storedDocumentItems) setDocumentItems(storedDocumentItems);

      // DB 데이터 로드
      setMaterialDB(db.getMaterialData());
      setLaborDB(db.getLaborData());
      // setMachineryDB(db.getMachineryData()); // 필요시

    } catch (e) {
      console.error("Error loading data from session or DB:", e);
      setError("데이터 로드 중 오류 발생");
    }
  }, []); // groupData 제거 -> 무한 루프 방지

  // 프로젝트 정보 변경 핸들러
  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedDetails = { ...projectDetails, [name]: value };
    setProjectDetails(updatedDetails);
    
    // 세션스토리지에 저장
    sessionStore.saveProjectDetails(updatedDetails);
  };

  // 규격 정보 추가 함수
  const addSpecInfo = () => {
    const newSpecId = `spec-${Date.now()}`;
    const newSpec: SpecInfo = {
      id: newSpecId,
      name: `규격 ${specInfos.length + 1}`,
      totalLength: 0,
      workHoles: 0,
      bendCount: 0
    };
    
    const updatedSpecInfos = [...specInfos, newSpec];
    setSpecInfos(updatedSpecInfos);
    setHasSpecs(true);
    
    // 세션스토리지에 저장
    sessionStore.saveSpecInfos(updatedSpecInfos);
  };
  
  // 규격 정보 삭제 함수
  const deleteSpecInfo = (specId: string) => {
    const updatedSpecInfos = specInfos.filter(spec => spec.id !== specId);
    setSpecInfos(updatedSpecInfos);
    setHasSpecs(updatedSpecInfos.length > 0);
    
    // 세션스토리지에 저장
    sessionStore.saveSpecInfos(updatedSpecInfos);
  };
  
  // 규격 정보 변경 핸들러
  const handleSpecChange = (specId: string, field: string, value: string | number) => {
    const updatedSpecInfos = specInfos.map(spec => {
      if (spec.id === specId) {
        return { ...spec, [field]: field === 'name' ? value : Number(value) };
      }
      return spec;
    });
    
    setSpecInfos(updatedSpecInfos);
    
    // 세션스토리지에 저장
    sessionStore.saveSpecInfos(updatedSpecInfos);
  };

  // 규격 추가 토글 핸들러 추가
  const toggleSpecsMode = () => {
    const newHasSpecs = !hasSpecs;
    setHasSpecs(newHasSpecs);
    
    // 규격 추가 모드로 변경 시 자동으로 첫 번째 규격 추가
    if (newHasSpecs && specInfos.length === 0) {
      addSpecInfo();
    }
  };

  // 규격별 내역서 항목 생성 함수
  const generateItemsForSpec = (specInfo: SpecInfo): DocumentItem[] => {
    // 일위대가 그룹 데이터로부터 내역서 항목 생성
    return groupData.map(group => {
      // 공종명과 단위에 따라 적절한 수량 결정
      let quantity = 1; // 기본 수량
      const calculationDetails: any[] = []; // 산출근거 기록용
      let remarks = group.비고 || ''; // UnitPriceSheetTable에서 가져온 비고

      // 수량 결정 로직 (기존 로직 유지 및 개선)
      // isSpecMatched는 groupData 생성 시 UnitPriceSheetTable에서 넘어온다고 가정
      // 여기서는 specInfo가 현재 그룹과 매칭되는지 다시 확인하거나, groupData에 isSpecMatched가 있어야 함.
      // 아래는 specInfo (사용자 입력) 기준으로 수량을 다시 계산하는 예시
      
      const workInfo = hasSpecs ? specInfo : defaultWorkInfo;
      const isPipeMaterial = group.공종명.includes('관') && (group.공종명.includes('덕타일') || group.공종명.includes('주철관'));

      if (group.단위 === 'm') {
        quantity = workInfo.totalLength;
      } else if (group.단위 === '개소') {
        if (group.공종명.includes('곡관') || group.공종명.includes('굴곡') || group.공종명.includes('굽힘')) {
          quantity = workInfo.bendCount;
        } else {
          quantity = workInfo.workHoles;
        }
      } else if (group.단위 === '본' && isPipeMaterial && workInfo.totalLength > 0) {
        // 관 자재이고, 총 길이(m)가 주어졌으며, 단가가 '본'당 단가인 경우 -> 총 본 수 계산
        const pipeMaterial = findMaterialByNameAndSpec(materialDB, group.공종명, extractSizeNumber(group.규격));
        const standardLength = pipeMaterial ? getDuctilePipeStandardLength(pipeMaterial.관종분류 || '2종관', extractSizeNumber(group.규격)) : null;
        if (standardLength && standardLength > 0) {
          quantity = Math.ceil(workInfo.totalLength / standardLength); // 총 길이를 본당 표준 길이로 나눠 본 수 계산 (올림)
          calculationDetails.push({
            type: '수량환산(본)',
            description: `총 연장 ${workInfo.totalLength}m / 표준길이 ${standardLength}m/본 = ${quantity}본`,
          });
        } else {
          quantity = 0; // 표준 길이를 모르면 수량 계산 불가
          remarks += " (표준길이 정보없어 본 수량 계산불가)";
        }
      }
      
      // 단가 및 금액 초기화 (groupData에서 가져옴)
      let unitMaterialCost = group.재료비금액; // UnitPriceSheetTable에서 계산된 단위당 금액
      let unitLaborCost = group.노무비금액;
      let unitExpenseCost = group.경비금액;

      // --- 부속품 수량 재계산 (필요시) ---
      // 예: KP 메커니컬 조인트의 경우, 총 접합개소에 따라 부속품 총수량 및 비용 재계산
      // UnitPriceSheetTable에서 이미 단위 작업당 부속품 비용이 포함되었다면, 여기서는 수량만 곱하면 됨.
      // 만약 더 상세한 산출근거가 필요하다면 여기서 재계산.
      // 현재는 UnitPriceSheetTable 결과를 신뢰하고 넘어감.

      // --- 할증 적용 ---
      let laborSurchargeRate = 0;
      let expenseSurchargeRate = 0;
      let surchargeRemark = "";

      if (surchargeConditions.terrain && surchargeRates.terrain[surchargeConditions.terrain]) {
        laborSurchargeRate += surchargeRates.terrain[surchargeConditions.terrain].labor || 0;
        expenseSurchargeRate += surchargeRates.terrain[surchargeConditions.terrain].expense || 0;
        surchargeRemark += `지형(${surchargeConditions.terrain}):노무${(surchargeRates.terrain[surchargeConditions.terrain].labor || 0)*100}%,경비${(surchargeRates.terrain[surchargeConditions.terrain].expense || 0)*100}%; `;
      }
      if (surchargeConditions.workingHours && surchargeRates.workingHours[surchargeConditions.workingHours]) {
        laborSurchargeRate += surchargeRates.workingHours[surchargeConditions.workingHours].labor || 0;
        surchargeRemark += `작업시간(${surchargeConditions.workingHours}):노무${(surchargeRates.workingHours[surchargeConditions.workingHours].labor || 0)*100}%; `;
      }
      // 기타 위험작업 등 할증 추가 가능

      const originalUnitLaborCost = unitLaborCost;
      const originalUnitExpenseCost = unitExpenseCost;

      if (laborSurchargeRate > 0) {
        unitLaborCost *= (1 + laborSurchargeRate);
        calculationDetails.push({ type: '노무비할증', rate: laborSurchargeRate, amount: unitLaborCost - originalUnitLaborCost });
      }
      if (expenseSurchargeRate > 0) {
        unitExpenseCost *= (1 + expenseSurchargeRate);
        calculationDetails.push({ type: '경비할증', rate: expenseSurchargeRate, amount: unitExpenseCost - originalUnitExpenseCost });
      }
      if (surchargeRemark) remarks = surchargeRemark + remarks;

      // --- 추가 비용 항목 적용 (예: PE 슬리브) ---
      if (additionalCostOptions.applyPESleeve && isPipeMaterial) {
        const sleeveMaterial = findMaterialByNameAndSpec(materialDB, 'PE슬리브', extractSizeNumber(group.규격));
        if (sleeveMaterial && sleeveMaterial.price) {
          // PE 슬리브 비용은 m당 단가로 가정, group.단위가 '본'이면 표준길이 곱해야 함.
          let sleeveCostPerUnit = 0;
          if (group.단위 === 'm') {
            sleeveCostPerUnit = sleeveMaterial.price;
          } else if (group.단위 === '본') {
            const pipeMaterial = findMaterialByNameAndSpec(materialDB, group.공종명, extractSizeNumber(group.규격));
            const standardLength = pipeMaterial ? getDuctilePipeStandardLength(pipeMaterial.관종분류 || '2종관', extractSizeNumber(group.규격)) : null;
            if (standardLength) sleeveCostPerUnit = sleeveMaterial.price * standardLength;
          }
          unitMaterialCost += sleeveCostPerUnit;
          remarks += ` PE슬리브 적용 (+${sleeveCostPerUnit.toFixed(0)}원/단위);`;
          calculationDetails.push({ type: '추가재료(PE슬리브)', amount: sleeveCostPerUnit });
        }
      }

      // 수량에 따른 최종 금액 계산
      const totalMaterialPrice = unitMaterialCost * quantity;
      const totalLaborPrice = unitLaborCost * quantity;
      const totalExpensePrice = unitExpenseCost * quantity;
      const totalItemPrice = totalMaterialPrice + totalLaborPrice + totalExpensePrice;
      
      return {
        공종명: group.공종명,
        규격: group.규격,
        수량: quantity,
        단위: group.단위,
        합계단가: unitMaterialCost + unitLaborCost + unitExpenseCost, // 할증 및 추가비용 포함된 단가
        합계금액: totalItemPrice,
        재료비단가: unitMaterialCost,
        재료비금액: totalMaterialPrice,
        노무비단가: unitLaborCost,
        노무비금액: totalLaborPrice,
        경비단가: unitExpenseCost,
        경비금액: totalExpensePrice,
        비고: remarks.trim(),
        품셈코드: group.품셈코드 || '', // UnitPriceSheetTable에서 전달된 품셈코드
        calculationDetails,
        isSpecMatched: specInfo ? matchSpecWithItem(group.규격, specInfo.name) : true,
      };
    });
  };

  // 내역서 생성 함수
  const generateDocument = () => {
    if (!projectDetails.projectName) {
      setError('시행공사명을 입력해주세요.');
      return;
    }
    if (!groupData || groupData.length === 0) {
      setError('일위대가 데이터가 없습니다. 먼저 일위대가_호표 데이터를 확인해주세요.');
      return;
    }
    if (hasSpecs && specInfos.length === 0) {
      setError('규격 정보가 없습니다. 규격을 추가하거나 규격 추가 옵션을 해제해주세요.');
      return;
    }

    let allDocumentItems: DocumentItem[] = [];
    let runningTotalMaterial = 0;
    let runningTotalLabor = 0;
    let runningTotalExpense = 0;

    const processGroup = (group: GroupData, currentSpecInfo?: SpecInfo) => {
      // generateItemsForSpec 대신 직접 로직 통합 및 확장
      let quantity = 1;
      const calculationDetails: any[] = [];
      let remarks = group.품셈코드 ? `품셈:${group.품셈코드}; ` : ''; // groupData에 품셈코드가 있다고 가정

      const workInfo = currentSpecInfo || defaultWorkInfo;
      const isPipeMaterial = group.공종명.includes('관') && (group.공종명.includes('덕타일') || group.공종명.includes('주철관'));
      // pipeSize 변수 추가 및 초기화
      const pipeSize = extractSizeNumber(group.규격);

      if (group.단위 === 'm') {
        quantity = workInfo.totalLength;
      } else if (group.단위 === '개소') {
        if (group.공종명.includes('곡관') || group.공종명.includes('굴곡') || group.공종명.includes('굽힘')) {
          quantity = workInfo.bendCount;
        } else {
          quantity = workInfo.workHoles;
        }
      } else if (group.단위 === '본' && isPipeMaterial && workInfo.totalLength > 0) {
        const pipeSize = extractSizeNumber(group.규격)
        const pipeMaterial = findMaterialByNameAndSpec(materialDB, group.공종명, pipeSize);
        const standardLength = pipeMaterial ? getDuctilePipeStandardLength(pipeMaterial.관종분류 || '2종관', pipeSize) : null;
        if (standardLength && standardLength > 0) {
          quantity = Math.ceil(workInfo.totalLength / standardLength);
          calculationDetails.push({ type: '수량환산(본)', description: `총 연장 ${workInfo.totalLength}m / 표준길이 ${standardLength}m/본 = ${quantity}본`});
        } else {
          quantity = 0; remarks += "표준길이 정보부족; ";
        }
      }

      let itemMaterialCost = group.재료비금액; // UnitPriceSheetTable에서 계산된 단위 금액
      let itemLaborCost = group.노무비금액;
      let itemExpenseCost = group.경비금액;

      // 할증 적용
      let laborSurchargeRate = 0; let expenseSurchargeRate = 0; let surchargeRemarkParts: string[] = [];
      if (surchargeConditions.terrain && surchargeRates.terrain[surchargeConditions.terrain]) {
        const { labor = 0, expense = 0 } = surchargeRates.terrain[surchargeConditions.terrain];
        laborSurchargeRate += labor; expenseSurchargeRate += expense;
        surchargeRemarkParts.push(`지형(${surchargeConditions.terrain}):노${labor*100}%,경${expense*100}%`);
      }
      // ... 다른 할증 조건들 ...
      if (surchargeRemarkParts.length > 0) remarks += surchargeRemarkParts.join('; ') + '; ';

      const originalItemLaborCost = itemLaborCost;
      const originalItemExpenseCost = itemExpenseCost;
      if (laborSurchargeRate > 0) itemLaborCost *= (1 + laborSurchargeRate);
      if (expenseSurchargeRate > 0) itemExpenseCost *= (1 + expenseSurchargeRate);
      if (itemLaborCost !== originalItemLaborCost) calculationDetails.push({ type: '노무비할증', from: originalItemLaborCost, to: itemLaborCost, rate: laborSurchargeRate });
      if (itemExpenseCost !== originalItemExpenseCost) calculationDetails.push({ type: '경비할증', from: originalItemExpenseCost, to: itemExpenseCost, rate: expenseSurchargeRate });

      // 추가 비용 (PE 슬리브 등)
      if (additionalCostOptions.applyPESleeve && isPipeMaterial) {
        const pipeSize = extractSizeNumber(group.규격);
        const sleeveMaterial = findMaterialByNameAndSpec(materialDB, 'PE슬리브', pipeSize);
        if (sleeveMaterial && sleeveMaterial.price) {
          let sleeveCostPerBaseUnit = 0; // group.단위 에 대한 슬리브 비용
          if (group.단위 === 'm') sleeveCostPerBaseUnit = sleeveMaterial.price;
          else if (group.단위 === '본') {
            const pipeMaterialInfo = findMaterialByNameAndSpec(materialDB, group.공종명, pipeSize);
            const stdLen = pipeMaterialInfo ? getDuctilePipeStandardLength(pipeMaterialInfo.관종분류 || "2종관", pipeSize) : null;
            if (stdLen) sleeveCostPerBaseUnit = sleeveMaterial.price * stdLen;
          }
          if (sleeveCostPerBaseUnit > 0) {
            itemMaterialCost += sleeveCostPerBaseUnit;
            remarks += `PE슬리브(+${sleeveCostPerBaseUnit.toFixed(0)}); `;
            calculationDetails.push({ type: '추가재료(PE슬리브)', amount_per_unit: sleeveCostPerBaseUnit });
          }
        }
      }

      // KP 메커니컬 조인트 부속품 비용 추가 (볼트너트세트)
      // group.단위가 '본' 또는 '개소' (접합부 당) 라고 가정
      if (pipeSize > 0 && (group.공종명.includes('KP메커니컬') || group.공종명.includes('KP식')) && (group.단위 === '본' || group.단위 === '개소')) {
        const jointPartsInfo = getKpMechanicalJointParts(pipeSize);
        if (jointPartsInfo) {
          // '볼트너트세트' 자재를 찾고, 규격(호칭지름)도 일치하는지 확인
          const boltNutSetMaterial = findMaterialByNameAndSpec(materialDB, '볼트너트세트', pipeSize);
          if (boltNutSetMaterial && boltNutSetMaterial.price) {
            // jointPartsInfo.bolts가 해당 구경에 필요한 볼트(세트)의 수량이라고 가정
            const numberOfSetsPerJoint = jointPartsInfo.bolts;
            const boltNutSetCostPerJoint = boltNutSetMaterial.price * numberOfSetsPerJoint;

            itemMaterialCost += boltNutSetCostPerJoint; // 단위 작업당 자재비에 추가
            remarks += ` KP볼트너트세트(${numberOfSetsPerJoint}조, +${boltNutSetCostPerJoint.toFixed(0)}); `;
            calculationDetails.push({
              type: '추가재료(KP볼트너트)',
              description: `${numberOfSetsPerJoint}조 * ${boltNutSetMaterial.price}원/조`,
              amount_per_unit: boltNutSetCostPerJoint
            });
          } else {
            remarks += ` KP볼트너트세트 정보없음; `;
          }
          // 고무링도 같은 방식으로 추가 가능
          const rubberRingMaterial = findMaterialByNameAndSpec(materialDB, '고무링', pipeSize);
          if (rubberRingMaterial && rubberRingMaterial.price) {
            const rubberRingCostPerJoint = rubberRingMaterial.price * jointPartsInfo.rubberRing; // 보통 1개
            itemMaterialCost += rubberRingCostPerJoint;
            remarks += ` 고무링(${jointPartsInfo.rubberRing}개, +${rubberRingCostPerJoint.toFixed(0)}); `;
            calculationDetails.push({
              type: '추가재료(고무링)',
              description: `${jointPartsInfo.rubberRing}개 * ${rubberRingMaterial.price}원/개`,
              amount_per_unit: rubberRingCostPerJoint
            });
          } else {
            remarks += ` 고무링 정보없음; `;
          }
        }
      }

      const finalMaterialAmount = itemMaterialCost * quantity;
      const finalLaborAmount = itemLaborCost * quantity;
      const finalExpenseAmount = itemExpenseCost * quantity;
      const finalTotalAmount = finalMaterialAmount + finalLaborAmount + finalExpenseAmount;

      runningTotalMaterial += finalMaterialAmount;
      runningTotalLabor += finalLaborAmount;
      runningTotalExpense += finalExpenseAmount;

      allDocumentItems.push({
        공종명: group.공종명, 규격: group.규격, 수량: quantity, 단위: group.단위,
        재료비단가: itemMaterialCost, 재료비금액: finalMaterialAmount,
        노무비단가: itemLaborCost, 노무비금액: finalLaborAmount,
        경비단가: itemExpenseCost, 경비금액: finalExpenseAmount,
        합계단가: itemMaterialCost + itemLaborCost + itemExpenseCost, 합계금액: finalTotalAmount,
        비고: remarks.trim(), 품셈코드: group.품셈코드, calculationDetails,
        isSpecMatched: currentSpecInfo ? matchSpecWithItem(group.규격, currentSpecInfo.name) : true,
      });
    };

    if (!hasSpecs) {
      groupData.forEach(group => processGroup(group));
    } else {
      groupData.forEach(group => {
        const matchingSpec = specInfos.find(spec => matchSpecWithItem(group.규격, spec.name));
        if (matchingSpec) {
          processGroup(group, matchingSpec);
        } else { // 규격 불일치 시 수량 0으로 처리하고 기본 항목 추가
          allDocumentItems.push({
            공종명: group.공종명, 규격: group.규격, 수량: 0, 단위: group.단위,
            재료비단가: group.재료비금액, 재료비금액: 0, 노무비단가: group.노무비금액, 노무비금액: 0,
            경비단가: group.경비금액, 경비금액: 0, 합계단가: group.합계금액, 합계금액: 0,
            비고: '규격 불일치', 품셈코드: group.품셈코드, calculationDetails: [], isSpecMatched: false,
          });
        }
      });
    }

    // 간접비 계산 (표준 방식 적용)
    const directCostTotal = runningTotalMaterial + runningTotalLabor + runningTotalExpense;
    const generalManagementAmount = directCostTotal * indirectCostRates.generalManagement;
    const profitBase = directCostTotal + generalManagementAmount;
    const profitAmount = profitBase * indirectCostRates.profit;
    const finalTotalAmountWithIndirects = profitBase + profitAmount;

    // 간접비를 노무비와 경비에 분배하거나, 총액에만 반영하거나 선택 가능.
    // 여기서는 총액에 반영하고, projectRow의 노무비/경비는 직접비만 표시.
    // 또는, 간접노무비/간접경비 항목을 projectRow.calculationDetails에 명시.

    const projectRow: DocumentItem = {
      공종명: projectDetails.projectName, 규격: '', 수량: 1, 단위: '식',
      재료비금액: runningTotalMaterial,
      노무비금액: runningTotalLabor, // 직접 노무비만 표시
      경비금액: runningTotalExpense,   // 직접 경비만 표시
      합계금액: finalTotalAmountWithIndirects, // 간접비 포함 총액
      재료비단가: 0, 노무비단가: 0, 경비단가: 0, 합계단가: 0,
      비고: `일반관리비(${indirectCostRates.generalManagement*100}%), 이윤(${indirectCostRates.profit*100}%) 포함 총액`,
      calculationDetails: [
        {type: "총 직접재료비", amount: runningTotalMaterial},
        {type: "총 직접노무비", amount: runningTotalLabor},
        {type: "총 직접경비", amount: runningTotalExpense},
        {type: "소계 (직접공사비)", amount: directCostTotal },
        {type: "일반관리비", amount: generalManagementAmount, rate: indirectCostRates.generalManagement, base: directCostTotal},
        {type: "이윤", amount: profitAmount, rate: indirectCostRates.profit, base: profitBase},
        {type: "총 공사금액 (간접비 포함)", amount: finalTotalAmountWithIndirects}
      ]
    };

    const newItems = [projectRow, ...allDocumentItems.filter(item => item.수량 > 0 || !item.isSpecMatched)];
    setDocumentItems(newItems);
    setError('');
    sessionStore.saveDocumentItems(newItems);
  };

  // 숫자 포맷팅 함수
  const formatNumber = (value: number) => {
    if (value === 0) return '';
    // 소수점을 반올림하여 정수로 변환 후 포맷팅
    return Math.round(value).toLocaleString('ko-KR');
  };

  // 엑셀용 숫자 포맷팅 함수 추가
  const formatNumberForExcel = (value: number) => {
    if (value === 0) return 0;
    // 엑셀 내보내기를 위한 값도 반올림 처리
    return Math.round(value);
  };

  // 엑셀 다운로드 함수
  const downloadExcel = () => {
    if (documentItems.length === 0) {
      setError('먼저 내역서를 생성해주세요.');
      return;
    }

    try {
      // 워크북 생성
      const wb = XLSX.utils.book_new();
      
      // 1. 내역서 시트 생성
      const estimateSheetData = documentItems.map((item, idx) => {
        if (idx === 0) { // 프로젝트명 행
          return {
            'NO': '', '공종명': item.공종명, '규격': '', '수량': '', '단위': '',
            '합계단가': '', '합계금액': formatNumberForExcel(item.합계금액),
            '재료비단가': '', '재료비금액': formatNumberForExcel(item.재료비금액),
            '노무비단가': '', '노무비금액': formatNumberForExcel(item.노무비금액),
            '경비단가': '', '경비금액': formatNumberForExcel(item.경비금액),
            '비고': item.비고 || ''
          };
        }
        return { // 일반 항목
          'NO': (idx).toString(), '공종명': item.공종명, '규격': item.규격,
          '수량': item.수량, '단위': item.단위,
          '합계단가': formatNumberForExcel(item.합계단가), '합계금액': formatNumberForExcel(item.합계금액),
          '재료비단가': formatNumberForExcel(item.재료비단가), '재료비금액': formatNumberForExcel(item.재료비금액),
          '노무비단가': formatNumberForExcel(item.노무비단가), '노무비금액': formatNumberForExcel(item.노무비금액),
          '경비단가': formatNumberForExcel(item.경비단가), '경비금액': formatNumberForExcel(item.경비금액),
          '비고': item.비고 || '' // 품셈코드, 할증 등 여기에 포함
        };
      });
      
      const estimateWS = XLSX.utils.json_to_sheet(estimateSheetData);
      applyCurrencyFormat(estimateWS);
      const estimateColWidths = [
        { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, // NO, 공종명, 규격, 수량, 단위
        { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, // 합계 (단가, 금액), 재료비 (단가, 금액)
        { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, // 노무비 (단가, 금액), 경비 (단가, 금액)
        { wch: 30 } // 비고
      ];
      estimateWS['!cols'] = estimateColWidths;
      applyBordersToSheet(estimateWS, estimateSheetData.length + 1);
      XLSX.utils.book_append_sheet(wb, estimateWS, '내역서');

      // 2. 산출근거 시트 생성
      const calculationBasisSheetData: any[] = [];
      documentItems.forEach((item, idx) => {
        if (idx === 0) { // 프로젝트 총계에 대한 산출근거
          calculationBasisSheetData.push({ 항목: item.공종명, 구분: "총계 요약", 내용: `총 재료비: ${formatNumberForExcel(item.재료비금액)}, 총 노무비: ${formatNumberForExcel(item.노무비금액)}, 총 경비: ${formatNumberForExcel(item.경비금액)}`});
          item.calculationDetails?.forEach(detail => {
            calculationBasisSheetData.push({ 항목: "", 구분: detail.type, 내용: `금액: ${formatNumberForExcel(detail.amount)}, 기준액: ${formatNumberForExcel(detail.base)}, 요율:${detail.rate ? (detail.rate*100).toFixed(1)+'%' : '-'}` });
          });
          calculationBasisSheetData.push({}); // Blank row
          return;
        }
        calculationBasisSheetData.push({ 항목: `${idx}. ${item.공종명} (${item.규격})`, 구분: "수량", 내용: `${item.수량} ${item.단위}` });
        if(item.품셈코드) calculationBasisSheetData.push({ 항목: "", 구분: "적용품셈", 내용: item.품셈코드 });

        item.calculationDetails?.forEach(detail => {
          let content = `유형: ${detail.type}`;
          if(detail.description) content += `, 설명: ${detail.description}`;
          if(detail.amount_per_unit) content += `, 단위당 금액: ${formatNumberForExcel(detail.amount_per_unit)}`;
          if(detail.rate) content += `, 요율: ${(detail.rate*100).toFixed(1)}% (변경전: ${formatNumberForExcel(detail.from)}, 변경후: ${formatNumberForExcel(detail.to)})`;
          calculationBasisSheetData.push({ 항목: "", 구분: "세부 산출", 내용: content });
        });
         calculationBasisSheetData.push({ 항목: "", 구분: "최종 비고", 내용: item.비고 });
         calculationBasisSheetData.push({}); // Blank row
      });
      const calcBasisWS = XLSX.utils.json_to_sheet(calculationBasisSheetData);
      calcBasisWS['!cols'] = [{wch: 40}, {wch: 20}, {wch: 80}];
      XLSX.utils.book_append_sheet(wb, calcBasisWS, '산출근거');

      // 3. 일위대가목록 시트 생성 (기존 로직 유지 또는 개선)
      const unitPriceListData = groupData.map(g => ({
        '공종명': g.공종명, '규격': g.규격, '단위': g.단위,
        '재료비': formatNumberForExcel(g.재료비금액), // groupData의 금액은 단가임
        '노무비': formatNumberForExcel(g.노무비금액),
        '경비': formatNumberForExcel(g.경비금액),
        '합계': formatNumberForExcel(g.합계금액),
        '품셈코드': g.품셈코드 || ''
      }));
      const unitPriceListWS = XLSX.utils.json_to_sheet(unitPriceListData);
      applyCurrencyFormat(unitPriceListWS);
      const unitPriceListColWidths = [ { wch: 30 }, { wch: 20 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, {wch: 20}];
      unitPriceListWS['!cols'] = unitPriceListColWidths;
      applyBordersToSheet(unitPriceListWS, unitPriceListData.length + 1);
      XLSX.utils.book_append_sheet(wb, unitPriceListWS, '일위대가목록(단가)');
      
      // 4. localStorage에서 일위대가_호표 데이터 가져와 시트 생성
      console.log('일위대가_호표 데이터 가져오기 시도');
      const unitPriceSheetData = sessionStore.getDataUnitpriceSheet();
      
      if (unitPriceSheetData) {
        try {
          console.log('일위대가_호표 데이터:', typeof unitPriceSheetData === 'string' ? unitPriceSheetData.substring(0, 100) + '...' : '객체 데이터');
          
          const parsedData = Array.isArray(unitPriceSheetData) ? unitPriceSheetData : JSON.parse(unitPriceSheetData);
          
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log('일위대가_호표 데이터 변환:', parsedData.length, '항목');
            
            // 데이터 형식 확인 및 변환 작업
            const formattedData = parsedData.map(item => {
              // 필요한 키만 추출하여 반환
              return {
                '공종명': item['공종명'] || '',
                '규격': item['규격'] || '',
                '수량': item['수량'] || '',
                '단위': item['단위'] || '',
                '합계단가': item['합계단가'] || 0,
                '합계금액': item['합계금액'] || 0,
                '재료비단가': item['재료비단가'] || 0,
                '재료비금액': item['재료비금액'] || 0,
                '노무비단가': item['노무비단가'] || 0,
                '노무비금액': item['노무비금액'] || 0,
                '경비단가': item['경비단가'] || 0,
                '경비금액': item['경비금액'] || 0,
                '비고': item['비고'] || ''
              };
            });
            
            // JSON 데이터를 워크시트로 변환
            const unitPriceSheetWS = XLSX.utils.json_to_sheet(formattedData);
            
            // 숫자 셀에 통화 형식 스타일 적용
            applyCurrencyFormat(unitPriceSheetWS);
            
            // 열 너비 설정
            const unitPriceSheetColWidths = [
              { wch: 25 }, // 공종명
              { wch: 15 }, // 규격
              { wch: 8 }, // 수량
              { wch: 8 }, // 단위
              { wch: 12 }, // 합계단가
              { wch: 12 }, // 합계금액
              { wch: 12 }, // 재료비단가
              { wch: 12 }, // 재료비금액
              { wch: 12 }, // 노무비단가
              { wch: 12 }, // 노무비금액
              { wch: 12 }, // 경비단가
              { wch: 12 }, // 경비금액
              { wch: 15 } // 비고
            ];
            unitPriceSheetWS['!cols'] = unitPriceSheetColWidths;
            
            // 테두리 정보 설정
            applyBordersToSheet(unitPriceSheetWS, formattedData.length + 1);
            
            // 워크시트를 워크북에 추가
            XLSX.utils.book_append_sheet(wb, unitPriceSheetWS, '일위대가_호표');
          } else {
            console.log('일위대가_호표 데이터가 배열이 아니거나 비어있습니다.');
          }
        } catch (e) {
          console.error('일위대가_호표 데이터 파싱 오류:', e);
        }
      } else {
        console.log('sessionStorage에서 일위대가_호표 데이터를 찾을 수 없습니다.');
      }
      
      // 4. localStorage에서 중기사용목록 데이터 가져와 시트 생성
      console.log('중기사용목록 데이터 가져오기 시도');
      const machineryUsageData = sessionStore.getMachineryUsage();
      
      if (machineryUsageData) {
        try {
          console.log('중기사용목록 데이터:', typeof machineryUsageData === 'string' ? machineryUsageData.substring(0, 100) + '...' : '객체 데이터');
          
          // 중기사용목록 데이터 변환
          const machineryUsageItems = Array.isArray(machineryUsageData) ? machineryUsageData : JSON.parse(machineryUsageData);
          
          if (Array.isArray(machineryUsageItems) && machineryUsageItems.length > 0) {
            // 중기사용목록 데이터 표 형식으로 변환
            const machineryUsageTableData = machineryUsageItems.map((item: any) => ({
              '중기명': item.name || '',
              '재료비': formatNumberForExcel(item.material) || 0,
              '노무비': formatNumberForExcel(item.labor) || 0,
              '경비': formatNumberForExcel(item.expense) || 0,
              '합계': formatNumberForExcel(item.total) || 0
            }));
            
            // 중기사용목록 시트 생성
            const machineryUsageWS = XLSX.utils.json_to_sheet(machineryUsageTableData);
            
            // 숫자 셀에 통화 형식 스타일 적용
            applyCurrencyFormat(machineryUsageWS);
            
            // 열 너비 설정
            const machineryUsageColWidths = [
              { wch: 30 }, // 중기명
              { wch: 15 }, // 재료비
              { wch: 15 }, // 노무비
              { wch: 15 }, // 경비
              { wch: 15 }  // 합계
            ];
            machineryUsageWS['!cols'] = machineryUsageColWidths;
            
            // 테두리 정보 설정
            applyBordersToSheet(machineryUsageWS, machineryUsageTableData.length + 1);
            
            // 중기사용목록 시트 추가
            XLSX.utils.book_append_sheet(wb, machineryUsageWS, '중기사용목록');
            
            console.log('중기사용목록 시트 추가 완료:', machineryUsageTableData.length);
          }
        } catch (e) {
          console.error('중기사용목록 데이터 처리 중 오류:', e);
        }
      } else {
        console.log('sessionStorage에서 중기사용목록 데이터를 찾을 수 없습니다.');
      }
      
      // 5. 중기사용료 시트 생성 (그룹화된 테이블)
      try {
        // 중기사용료 데이터 가져오기
        const machineryData = processMachineryDataForExcel();
        
        if (machineryData && Object.keys(machineryData).length > 0) {
          // 중기 데이터를 표 형식으로 변환
          const machineryTableData: Array<Record<string, any>> = [];
          
          // 각 중기에 대한 표 구성
          for (const machineName in machineryData) {
            // 중기명 헤더 행 추가
            machineryTableData.push({
              '중기명': machineName,
              'No.': '',
              '구분': '',
              '항목': '',
              '규격': '',
              '수량': '',
              '단위': '',
              '단가': '',
              '금액': ''
            });
            
            // 헤더 행 추가
            machineryTableData.push({
              '중기명': '',
              'No.': 'No.',
              '구분': '구분',
              '항목': '항목',
              '규격': '규격',
              '수량': '수량',
              '단위': '단위',
              '단가': '단가',
              '금액': '금액'
            });
            
            // 중기 상세 항목 추가
            let itemNo = 1;
            machineryData[machineName].forEach((item: { 구분: string; 항목: string; 규격: string; 수량: string | number; 단위: string; 단가: string | number; 금액: number }) => {
              machineryTableData.push({
                '중기명': '',
                'No.': item.구분 === '소계' || item.구분 === '총계' ? '' : itemNo++,
                '구분': item.구분 || '',
                '항목': item.항목 || '',
                '규격': item.규격 || '',
                '수량': item.수량 || '',
                '단위': item.단위 || '',
                '단가': item.단가 || '',
                '금액': item.금액 || 0
              });
            });
            
            // 중기 간 구분을 위한 빈 행 추가
            machineryTableData.push({
              '중기명': '',
              'No.': '',
              '구분': '',
              '항목': '',
              '규격': '',
              '수량': '',
              '단위': '',
              '단가': '',
              '금액': ''
            });
          }
          
          // 중기사용료 시트 생성
          const machineryWS = XLSX.utils.json_to_sheet(machineryTableData);
          
          // 숫자 셀에 통화 형식 스타일 적용
          applyCurrencyFormat(machineryWS);
          
          // 열 너비 설정
          const machineryColWidths = [
            { wch: 25 }, // 중기명
            { wch: 5 }, // No.
            { wch: 10 }, // 구분
            { wch: 20 }, // 항목
            { wch: 20 }, // 규격
            { wch: 8 }, // 수량
            { wch: 8 }, // 단위
            { wch: 12 }, // 단가
            { wch: 12 } // 금액
          ];
          machineryWS['!cols'] = machineryColWidths;
          
          // 중기사용료 시트 추가
          XLSX.utils.book_append_sheet(wb, machineryWS, '중기사용료');
          
          console.log('중기사용료 시트 추가 완료:', machineryTableData.length);
        }
      } catch (err) {
        console.error('중기사용료 시트 생성 중 오류:', err);
      }
      
      // 6. DB에서 중기기초자료 데이터 가져와 시트 생성
      const machineBaseData = db.getMachineBaseData();
      if (machineBaseData.length > 0) {
        // 헤더 행 제외하고 데이터만 추출
        const filteredData = machineBaseData
          .filter((item, index) => index > 0) // 첫 번째 줄 제외
          .map(item => {
            const data: Record<string, any> = {};
            if (item.originalData) {
              // originalData 있을 경우 필요한 필드만 추출
              data['명    칭'] = item.originalData['중기기초자료'] || '';
              data['규    격'] = item.originalData['__EMPTY'] || '';
              data['단 위'] = item.originalData['__EMPTY_1'] || '';
              data['재 료 비'] = item.originalData['__EMPTY_2'] || 0;
              data['노 무 비'] = item.originalData['__EMPTY_3'] || 0;
              data['경    비'] = item.originalData['__EMPTY_4'] || 0;
              data['합계'] = item.originalData['__EMPTY_5'] || 0;
              data['비 고'] = item.originalData['__EMPTY_6'] || '';
            } else {
              // 원본 데이터 사용
              return item;
            }
            return data;
          });
        
        // 정제된 데이터로 워크시트 생성
        const machineBaseWS = XLSX.utils.json_to_sheet(filteredData);
        
        // 숫자 셀에 통화 형식 스타일 적용
        applyCurrencyFormat(machineBaseWS);
        
        // 테두리 정보 설정 (중기기초자료)
        applyBordersToSheet(machineBaseWS, filteredData.length + 1);
        
        XLSX.utils.book_append_sheet(wb, machineBaseWS, '중기기초자료');
      }
      
      // 7. DB에서 자재 데이터 가져와 시트 생성
      const materialData = db.getMaterialData();
      if (materialData.length > 0) {
        // 헤더 행 제외하고 데이터만 추출
        const filteredData = materialData
          .filter((item, index) => index > 0) // 첫 번째 줄 제외
          .map(item => {
            // 자재 데이터를 한글 필드명으로 변환
            const data: Record<string, any> = {};
            
            if (item.originalData) {
              // 원본 데이터에서 필드 추출 및 한글 필드명으로 변환
              data['품명'] = item.originalData['자재'] || '';
              data['규격'] = item.originalData['__EMPTY'] || '';
              data['단위'] = item.originalData['__EMPTY_1'] || '';
              data['단가'] = item.originalData['__EMPTY_2'] || 0;
              data['비고'] = item.originalData['__EMPTY_3'] || '';
            } else {
              // 필드명이 없는 경우 기본 정보 사용
              data['품명'] = item.name || '';
              data['규격'] = item.spec || '';
              data['단위'] = item.unit || '';
              data['단가'] = item.price || 0;
              data['비고'] = '';
            }
            
            return data;
          });
        
        // 정제된 데이터로 워크시트 생성
        const materialWS = XLSX.utils.json_to_sheet(filteredData);
        
        // 숫자 셀에 통화 형식 스타일 적용
        applyCurrencyFormat(materialWS);
        
        // 열 너비 설정
        const materialColWidths = [
          { wch: 30 }, // 품명
          { wch: 20 }, // 규격
          { wch: 8 },  // 단위
          { wch: 12 }, // 단가
          { wch: 15 }  // 비고
        ];
        materialWS['!cols'] = materialColWidths;
        
        // 테두리 정보 설정 (자재데이터)
        applyBordersToSheet(materialWS, filteredData.length + 1);
        
        XLSX.utils.book_append_sheet(wb, materialWS, '자재데이터');
      }
      
      // 8. DB에서 노임 데이터 가져와 시트 생성
      const laborData = db.getLaborData();
      if (laborData.length > 0) {
        // 헤더 행 제외하고 데이터만 추출
        const filteredData = laborData
          .filter((item, index) => index > 0) // 첫 번째 줄 제외
          .map(item => {
            // 노임 데이터를 한글 필드명으로 변환
            const data: Record<string, any> = {};
            
            if (item.originalData) {
              // 원본 데이터에서 필드 추출 및 한글 필드명으로 변환
              data['직종'] = item.originalData['노임'] || '';
              data['작업유형'] = item.originalData['__EMPTY'] || '';
              data['단위'] = item.originalData['__EMPTY_1'] || '';
              data['임금'] = item.originalData['__EMPTY_2'] || 0;
              data['비고'] = item.originalData['__EMPTY_3'] || '';
            } else {
              // 필드명이 없는 경우 기본 정보 사용
              data['직종'] = item.jobTitle || '';
              data['작업유형'] = item.workType || '';
              data['단위'] = '인';
              data['임금'] = item.wage || 0;
              data['비고'] = '';
            }
            
            return data;
          });
        
        // 정제된 데이터로 워크시트 생성
        const laborWS = XLSX.utils.json_to_sheet(filteredData);
        
        // 숫자 셀에 통화 형식 스타일 적용
        applyCurrencyFormat(laborWS);
        
        // 열 너비 설정
        const laborColWidths = [
          { wch: 25 }, // 직종
          { wch: 20 }, // 작업유형
          { wch: 8 },  // 단위
          { wch: 12 }, // 임금
          { wch: 15 }  // 비고
        ];
        laborWS['!cols'] = laborColWidths;
        
        // 테두리 정보 설정 (노임데이터)
        applyBordersToSheet(laborWS, filteredData.length + 1);
        
        XLSX.utils.book_append_sheet(wb, laborWS, '노임데이터');
      }
      
      // 엑셀 파일 다운로드
      const fileName = `PE라이너_${projectDetails.projectName}_내역서_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('엑셀 다운로드 중 오류:', err);
      setError('엑셀 파일 생성 중 오류가 발생했습니다.');
    }
  };

  // 엑셀 시트에 테두리 적용 함수
  function applyBordersToSheet(ws: XLSX.WorkSheet, rowCount: number) {
    if (!ws['!ref']) return;
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    const colCount = range.e.c + 1;
    
    // 셀 스타일 설정
    if (!ws['!cols']) ws['!cols'] = Array(colCount).fill({ wch: 12 });
    
    // 데이터 영역에 대한 스타일 설정 (테두리 등)
    for (let r = 0; r < rowCount; r++) {
      if (!ws['!rows']) ws['!rows'] = [];
      if (!ws['!rows'][r]) ws['!rows'][r] = {};
      
      // 첫 번째 행은 헤더로 배경색 설정
      if (r === 0) {
        ws['!rows'][r].hpt = 25; // 헤더 행 높이
      }
    }
  }

  // 워크시트의 숫자 셀에 통화 형식 적용 함수
  function applyCurrencyFormat(ws: XLSX.WorkSheet) {
    if (!ws['!ref']) return;
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // 각 셀 순회
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellAddress];
        
        if (cell && typeof cell.v === 'number' && cell.v !== 0) {
          // 숫자 셀에 통화 형식 스타일 적용
          if (!cell.z) {
            cell.z = '#,##0'; // 천 단위 구분 형식 지정
          }
        }
      }
    }
  }

  // 중기사용료 데이터 처리 함수 
  function processMachineryDataForExcel() {
    try {
      // 세션 스토리지에서 중기사용료 데이터 가져오기
      const sessionData = sessionStore.getMachineryTableData();
      if (sessionData && Object.keys(sessionData).length > 0) {
        console.log('세션스토리지에서 중기사용료 데이터 로드 성공:', Object.keys(sessionData).length);
        return sessionData;
      }
      
      // 세션 스토리지에서 데이터가 없는 경우 DB에서 가져오기
      const dbData = db.getMachineryData();
      if (!dbData || dbData.length === 0) {
        console.log('DB에서 중기사용료 데이터를 찾을 수 없습니다.');
        return null;
      }
      
      // 중기명으로 그룹화된 데이터
      const groupedData: { [key: string]: any[] } = {};
      let currentMachine = '';
      
      // DB 데이터 순회하면서 중기별 데이터 구성
      dbData.forEach(item => {
        // 새 중기 시작
        if (item.name && 
            item.originalData && 
            item.originalData['중기사용료'] === '중 기 명') {
          if (item.name.trim() !== '') {
            currentMachine = item.name;
            if (!groupedData[currentMachine]) {
              groupedData[currentMachine] = [];
            }
          }
        } 
        // 중기 항목 추가
        else if (currentMachine) {
          // 특정 구분 항목인 경우
          if (item.originalData && (
            item.originalData['중기사용료'] === '재 료 비' || 
            item.originalData['중기사용료'] === '노 무 비' || 
            item.originalData['중기사용료'] === '경    비' ||
            item.originalData['__EMPTY'] === '소   계' || 
            item.originalData['__EMPTY'] === '총   계' ||
            item.originalData['__EMPTY'] === '잡    품' ||
            item.originalData['__EMPTY'] === '경    유' ||
            item.originalData['__EMPTY'] === '화물차운전사'
          )) {
            // 구분 결정
            let 구분 = '';
            let 항목 = '';
            
            if (item.originalData['중기사용료'] === '재 료 비') {
              구분 = '재료비';
              항목 = '재료비';
            }
            else if (item.originalData['중기사용료'] === '노 무 비') {
              구분 = '노무비';
              항목 = '노무비';
            }
            else if (item.originalData['중기사용료'] === '경    비') {
              구분 = '경비';
              항목 = '경비';
            }
            else if (item.originalData['__EMPTY'] === '소   계') {
              구분 = '소계';
            }
            else if (item.originalData['__EMPTY'] === '총   계') {
              구분 = '총계';
            }
            else {
              구분 = '경비';
              항목 = item.originalData['__EMPTY'] || item.name || '';
            }
            
            // 항목 추가
            const newItem = {
              구분: 구분,
              항목: 항목,
              규격: item.originalData['__EMPTY_1'] || '',
              수량: item.originalData['__EMPTY_2'] || '',
              단위: item.originalData['__EMPTY_3'] || '',
              단가: item.originalData['__EMPTY_4'] || '',
              금액: item.originalData['__EMPTY_5'] || item.price || 0
            };
            
            groupedData[currentMachine].push(newItem);
          }
        }
      });
      
      console.log('DB에서 중기사용료 데이터 가공 완료:', Object.keys(groupedData).length);
      return groupedData;
    } catch (error) {
      console.error('중기사용료 데이터 처리 중 오류:', error);
      return null;
    }
  }

  // 세션 데이터 초기화 함수
  const resetSessionData = () => {
    // 세션 데이터 초기화
    sessionStore.clearSessionData();
    
    // 상태 초기화
    setGroupData([]);
    setDocumentItems([]);
    setProjectDetails({
      projectName: '',
    });
    
    // 성공 메시지 표시
    setError('');
    alert('모든 임시 데이터가 초기화되었습니다.');
  };

  return (
    <div className="w-full space-y-6">
      <h2 className="text-xl font-semibold">내역서 만들기</h2>
      
      <Card className="shadow-md">
      <CardHeader className="bg-blue-50 py-3">
          <CardTitle className="text-lg">내역서 생성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          {/* 규격 추가 버튼 */}
          <div className="flex items-center space-x-4 mb-4">
            <Button 
              type="button" 
              onClick={toggleSpecsMode}
              className={`bg-white text-black shadow-md border-2 ${hasSpecs ? 'border-blue-600' : 'border-gray-500'}`}
            >
              규격 추가
            </Button>
            {hasSpecs && (
              <Button 
                type="button" 
                onClick={addSpecInfo}
                style={{ backgroundColor: '#16a34a' }}
                className="text-white hover:bg-green-500 shadow-md border-2 border-green-700"
              >
                <Plus size={16} /> 규격정보 추가
              </Button>
            )}
          </div>

          {/* 프로젝트명 입력 */}
          <div className="mt-4">
            <Label htmlFor="projectName" className="text-base font-medium">시행공사명</Label>
            <Input 
              id="projectName" 
              name="projectName" 
              value={projectDetails.projectName} 
              onChange={handleProjectChange} 
              placeholder="공사명을 입력하세요" 
              className="h-10 text-base"
              autoComplete="off"
            />
          </div>

          {/* 규격이 없는 경우 기본 작업정보 입력 */}
          {!hasSpecs && (
            <div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="h-full">
                  <Label htmlFor="totalLength" className="text-base font-medium block mb-0.5">작업 총길이 (m)</Label>
                  <Input 
                    id="totalLength" 
                    name="totalLength" 
                    type="number" 
                    value={defaultWorkInfo.totalLength || ''} 
                    onChange={handleDefaultWorkInfoChange} 
                    placeholder="입력하세요" 
                    className="h-10 text-base w-full"
                    autoComplete="off"
                  />
                </div>
                <div className="h-full">
                  <Label htmlFor="workHoles" className="text-base font-medium block mb-0.5">작업 구멍수 (개소)</Label>
                  <Input 
                    id="workHoles" 
                    name="workHoles" 
                    type="number" 
                    value={defaultWorkInfo.workHoles || ''} 
                    onChange={handleDefaultWorkInfoChange} 
                    placeholder="입력하세요" 
                    className="h-10 text-base w-full"
                    autoComplete="off"
                  />
                </div>
                <div className="h-full">
                  <Label htmlFor="bendCount" className="text-base font-medium block mb-0.5">곡관 작업수 (개소)</Label>
                  <Input 
                    id="bendCount" 
                    name="bendCount" 
                    type="number" 
                    value={defaultWorkInfo.bendCount || ''} 
                    onChange={handleDefaultWorkInfoChange} 
                    placeholder="입력하세요" 
                    className="h-10 text-base w-full"
                    autoComplete="on"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 규격 정보 입력 (규격이 추가된 경우) */}
          {hasSpecs && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-4">
                {specInfos.map((spec) => (
                  <div key={spec.id} className="border border-gray-200 rounded-lg p-4 w-[calc(50%-0.5rem)] bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex-1">
                        <Label htmlFor={`specName-${spec.id}`} className="text-sm font-medium block mb-0.5">규격정보</Label>
                        <Input 
                          id={`specName-${spec.id}`}
                          value={spec.name} 
                          onChange={(e) => handleSpecChange(spec.id, 'name', e.target.value)} 
                          placeholder="규격정보 입력 (예: D700mm)" 
                          className="h-9 text-sm"
                        />
                      </div>
                      <Button 
                        type="button" 
                        onClick={() => deleteSpecInfo(spec.id)}
                        className="bg-red-500 hover:bg-red-600 text-white h-9 ml-2 px-2 shadow-sm border border-gray-300"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <Label htmlFor={`totalLength-${spec.id}`} className="text-xs font-medium block mb-0.5">작업 총길이 (m)</Label>
                        <Input 
                          id={`totalLength-${spec.id}`}
                          type="number" 
                          value={spec.totalLength || ''} 
                          onChange={(e) => handleSpecChange(spec.id, 'totalLength', e.target.value)} 
                          placeholder="입력하세요" 
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`workHoles-${spec.id}`} className="text-xs font-medium block mb-0.5">작업 구멍수 (개소)</Label>
                        <Input 
                          id={`workHoles-${spec.id}`}
                          type="number" 
                          value={spec.workHoles || ''} 
                          onChange={(e) => handleSpecChange(spec.id, 'workHoles', e.target.value)} 
                          placeholder="입력하세요" 
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`bendCount-${spec.id}`} className="text-xs font-medium block mb-0.5">곡관 작업수 (개소)</Label>
                        <Input 
                          id={`bendCount-${spec.id}`}
                          type="number" 
                          value={spec.bendCount || ''} 
                          onChange={(e) => handleSpecChange(spec.id, 'bendCount', e.target.value)} 
                          placeholder="입력하세요" 
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button 
              onClick={generateDocument}
              style={{ backgroundColor: '#2563eb' }}
              className="text-white flex items-center gap-2 py-2 h-11 text-base px-6 hover:bg-blue-600 shadow-md border-2 border-blue-700 font-bold"
            >
              <RefreshCw size={18} />
              <span>내역서 생성</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {documentItems.length > 0 && (
        <Card className="shadow-md border-blue-100">
          <CardHeader className="bg-blue-100 py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">내역서</CardTitle>
            <Button 
              onClick={downloadExcel}
              style={{ backgroundColor: '#16a34a' }}
              className="text-white flex gap-2 items-center px-4 py-2 h-12 rounded-md shadow-md border-2 border-green-700 hover:bg-green-500"
            >
              <FileSpreadsheet size={16} />
              <span>엑셀로 다운로드</span>
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>No</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>공 종 명</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>규 격</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>수량</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>단위</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" colSpan={2}>합 계</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" colSpan={2}>재 료 비</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" colSpan={2}>노 무 비</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" colSpan={2}>경 비</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>비 고</th>
                </tr>
                <tr>
                  <th className="px-3 py-2 border text-sm font-medium text-center">단 가</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">금 액</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">단 가</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">금 액</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">단 가</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">금 액</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">단 가</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">금 액</th>
                </tr>
              </thead>
              <tbody>
                {/* 프로젝트명 행 (첫 번째 행) */}
                {documentItems.length > 0 && (
                  <tr className="bg-blue-100 font-bold text-blue-900">
                    <td className="px-3 py-2 border text-sm text-center"></td>
                    <td className="px-3 py-2 border text-sm font-semibold text-left text-lg">{documentItems[0].공종명}</td>
                    <td className="px-3 py-2 border text-sm text-left">{documentItems[0].규격}</td>
                    <td className="px-3 py-2 border text-sm text-center">{documentItems[0].수량}</td>
                    <td className="px-3 py-2 border text-sm text-center">{documentItems[0].단위}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].합계단가)}</td>
                    <td className="px-3 py-2 border text-sm text-right font-medium">{formatNumber(documentItems[0].합계금액)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].재료비단가)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].재료비금액)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].노무비단가)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].노무비금액)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].경비단가)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].경비금액)}</td>
                    <td className="px-3 py-2 border text-sm text-center">{documentItems[0].비고 || ''}</td>
                  </tr>
                )}
                
                {/* 나머지 항목 (1부터 시작하는 번호 부여) */}
                {documentItems.slice(1).map((item, idx) => {
                  // 규격 매칭 여부에 따라 스타일 적용
                  const rowStyle = item.isSpecMatched === false ? 'bg-red-50' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50');
                  
                  return (
                    <tr key={idx} className={rowStyle}>
                      <td className="px-3 py-2 border text-sm text-center">{idx + 1}</td>
                      <td className="px-3 py-2 border text-sm font-semibold text-left">{item.공종명}</td>
                      <td className="px-3 py-2 border text-sm text-left">{item.규격}</td>
                      <td className="px-3 py-2 border text-sm text-center">{item.수량}</td>
                      <td className="px-3 py-2 border text-sm text-center">{item.단위}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.합계단가)}</td>
                      <td className="px-3 py-2 border text-sm text-right font-medium">{formatNumber(item.합계금액)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.재료비단가)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.재료비금액)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.노무비단가)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.노무비금액)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.경비단가)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.경비금액)}</td>
                      <td className="px-3 py-2 border text-sm text-center">{item.비고 || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 