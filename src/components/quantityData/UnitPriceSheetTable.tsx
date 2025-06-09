'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { normalizeText } from '@/components/DocumentGenerator/MachineryUsageTable'; // 정규화 함수 임포트
import { db } from '@/utils/db'; // db는 직접 사용하지 않지만, 타입 정의를 위해 유지 가능
import { sessionStore } from '@/utils/sessionStore';
import { getStandardInputs, standardCostData } from '@/lib/standardCostData';
import { getDuctilePipeWeight, getKpMechanicalJointParts } from '@/lib/ductileIronHandbookUtils';
import type { LaborData, MaterialData, MachineryData } from '@/utils/db'; // 실제 데이터 타입 임포트

interface UnitPriceSheetTableProps {
  data: any;
  onGroupsUpdated?: (groups: any[]) => void; // 그룹 데이터 업데이트 콜백 추가
}

interface CalculatedData {
  [key: string]: { 
    단가: number;
    금액: number;
  }
}

// 각 그룹별 합계를 위한 인터페이스
interface GroupTotal {
  공종명: string;         // 공종명 추가 (No.1 PE라이너 인입공 등)
  합계금액: number;
  재료비금액: number;
  노무비금액: number;
  경비금액: number;
  rows: number[]; // 그룹에 속한 행 인덱스 배열
}

// 그룹 정보 인터페이스 (공유용)
export interface GroupData {
  공종명: string;
  규격: string;
  단위: string;
  합계금액: number;
  재료비금액: number;
  노무비금액: number;
  경비금액: number;
}

export default function UnitPriceSheetTable({ data, onGroupsUpdated }: UnitPriceSheetTableProps) {
  // DB 데이터 상태 추가
  const [노임데이터, set노임데이터] = useState<LaborData[]>([]);
  const [자재데이터, set자재데이터] = useState<MaterialData[]>([]);
  const [중기사용목록, set중기사용목록] = useState<MachineryData[]>([]);
  const [계산된데이터, set계산된데이터] = useState<Map<string, any>>(new Map());
  const [그룹별노무비합계, set그룹별노무비합계] = useState<{[key: string]: number}>({});
  // 그룹별 합계 데이터 추가
  const [그룹별합계, set그룹별합계] = useState<{[key: string]: GroupTotal}>({});
  // 모든 그룹 데이터 (일위대가목록과 공유)
  const [그룹데이터, set그룹데이터] = useState<GroupData[]>([]);

  // 메모리 중기사용목록 데이터 (MachineryUsageTable에서 생성된 데이터)
  const [메모리중기사용목록, set메모리중기사용목록] = useState<any[]>([]);

  // 컴포넌트 마운트 시 DB 데이터 로드
  useEffect(() => {
    // 로컬스토리지에서 데이터 로드
    const loadDbData = () => {
      try {
        // 노임 데이터 로드
        const dbInstance = db; // LocalStorageDatabase.getInstance();
        set노임데이터(dbInstance.getLaborData());
        set자재데이터(dbInstance.getMaterialData());
        set중기사용목록(dbInstance.getMachineryData()); // db.ts의 중기 데이터 사용
        
        // 메모리에 저장된 중기사용목록 데이터 확인 (window 객체 활용) - 이 부분은 기존 로직 유지 또는 통합 검토
        if (typeof window !== 'undefined' && (window as any).machineryItems) {
          const 메모리중기데이터: MachineryData[] = (window as any).machineryItems;
          console.log('메모리에서 중기사용목록 데이터 로드:', 메모리중기데이터.length);
          // 필요시 기존 중기사용목록과 병합 또는 대체
          // set메모리중기사용목록(메모리중기데이터); // 이 상태는 MachineryData[] 타입이어야 함
        }
      } catch (error) {
        console.error('DB 데이터 로드 중 오류:', error);
      }
    };
    
    loadDbData();
    
    // 1초마다 메모리 중기사용목록 확인 (MachineryUsageTable이 나중에 로드될 경우를 대비)
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).machineryItems && 메모리중기사용목록.length === 0) {
        set메모리중기사용목록((window as any).machineryItems);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [메모리중기사용목록.length]);

  // 주어진 데이터 처리 및 계산
  useEffect(() => {
    if (data && (노임데이터.length > 0 || 자재데이터.length > 0 || 메모리중기사용목록.length > 0)) {
      processDataAndCalculate();
    }
  }, [data, 노임데이터, 자재데이터, 중기사용목록, 메모리중기사용목록]);

  // 데이터 처리 및 계산 함수
  const processDataAndCalculate = () => {
    if (!data || !data.data || !data.sheetNames || !data.sheetNames.includes('일위대가_호표')) {
      return;
    }

    // 일위대가_호표 시트 데이터 추출
    const sheetData = data.data['일위대가_호표'] || {};
    const rowData = sheetData.rowData || [];
    
    if (rowData.length < 3) return; // 헤더 제외하고 데이터가 없으면 처리 안함
    
    // 데이터 행 (헤더 제외)
    const dataRows = rowData.slice(2);
    
    // 그룹별 처리를 위한 변수
    let currentGroup = '';
    let currentGroupSpec = ''; // 현재 그룹의 규격
    let currentGroupUnit = ''; // 현재 그룹의 단위
    let 그룹별노무비 = {} as {[key: string]: number};
    
    // 그룹별 합계 계산을 위한 변수
    let currentGroupTotals: {[key: string]: GroupTotal} = {};
    
    // 새로운 계산 결과 맵
    const newCalculatedData = new Map<string, any>();
    
    // 각 행 처리
    dataRows.forEach((row: any, index: number) => {
      const keys = Object.keys(row);
      
      // 각 셀 데이터 추출
      const original공종명 = row[keys[0]] || '';
      const original규격 = row[keys[1]] || '';
      const 수량 = parseFloat(String(row[keys[2]]).replace(/,/g, '')) || 0; // 수량 숫자형 변환
      const original단위 = row[keys[3]] || '';
      
      // No로 시작하는 그룹 확인
      if (original공종명.startsWith('No.')) {
        currentGroup = original공종명.trim();
        currentGroupSpec = original규격.trim(); // 그룹의 대표 규격
        currentGroupUnit = original단위.trim(); // 그룹의 대표 단위
        그룹별노무비[currentGroup] = 0; // 해당 그룹의 노무비 초기화
        
        currentGroupTotals[currentGroup] = {
          공종명: currentGroup,
          합계금액: 0,
          재료비금액: 0,
          노무비금액: 0,
          경비금액: 0,
          rows: []
        };
      }
      
      const calculatedRow = {
        공종명: original공종명,
        규격: original규격,
        수량: 수량,
        단위: original단위,
        합계단가: 0,
        합계금액: 0,
        재료비단가: 0,
        재료비금액: 0,
        노무비단가: 0,
        노무비금액: 0,
        경비단가: 0,
        경비금액: 0,
        품셈코드: '', // 적용된 표준품셈 코드 또는 계산 근거
        calculationBasis: '기존 로직', // 계산 방식 추적
      };

      // 표준품셈 적용 시도
      // TODO: currentGroup (예: "No.1 덕타일주철관 부설")과 original공종명 (예: "타이튼관")을 조합하여
      // standardCostData의 공종대분류, 공종중분류를 결정하는 로직 필요.
      // 예시: const { 대분류, 중분류 } = mapToStandardCostKeys(currentGroup, original공종명);
      let mappedMajorWork = '';
      let mappedMinorWork = '';

      // 임시 매핑 로직: currentGroup에서 대분류, original공종명에서 중분류 추론
      if (currentGroup.includes('관') || currentGroup.includes('부설')) {
        mappedMajorWork = '관부설접합'; // standardCostData의 키와 일치해야 함
        if (original공종명.includes('타이튼')) mappedMinorWork = '주철관_타이튼접합부설';
        else if (original공종명.includes('메커니컬') || original공종명.includes('KP')) mappedMinorWork = '주철관_KP메커니컬접합부설';
        else if (original공종명.includes('절단') || original공종명.includes('관단')) mappedMinorWork = '주철관_관절단';
        // 기타 original공종명에 따른 mappedMinorWork 추가
      }
      // 다른 currentGroup에 대한 대분류 매핑 추가

      const standardInputs = mappedMajorWork && mappedMinorWork ? getStandardInputs(mappedMajorWork, mappedMinorWork, original규격.trim()) : null;

      if (standardInputs) {
        calculatedRow.calculationBasis = `표준품셈: ${mappedMajorWork}/${mappedMinorWork}/${original규격.trim()}`;
        calculatedRow.품셈코드 = `${mappedMajorWork}_${mappedMinorWork}_${original규격.trim()}`;
        let stdInputUnit = standardInputs['단위'] as string || ''; // 표준품셈 단위 (본, m, 개소 등)
        let laborCostPerStdUnit = 0;
        let machineryCostPerStdUnit = 0;
        let materialCostPerStdUnit = 0;

        for (const [key, value] of Object.entries(standardInputs)) {
          if (key === '단위') continue;
          const amount = value as number;

          const laborItem = 노임데이터.find(l => l.jobTitle === key || l.표준품셈직종 === key);
          if (laborItem && laborItem.wage) {
            laborCostPerStdUnit += laborItem.wage * amount;
          }

          const machineryItem = 중기사용목록.find(m =>
            m.name === key ||
            (m.표준품셈장비명 && m.표준품셈장비명 === key) ||
            (m.name && key.toLowerCase().includes(m.name.toLowerCase())) || // 대소문자 무시하고 부분 일치
            (m.spec && key.toLowerCase().includes(m.spec.toLowerCase()))
          );
          if (machineryItem) {
            const hourlyRate = machineryItem.시간당표준단가 || machineryItem.price;
            if (hourlyRate) {
              machineryCostPerStdUnit += hourlyRate * amount;
            }
          }
        }

        // 재료비 계산 (주요 자재: 관, 부속품)
        const diameterMatch = original규격.match(/\d+/);
        const diameter = diameterMatch ? parseInt(diameterMatch[0], 10) : 0;

        // 관 자재 처리 (예: 덕타일주철관)
        // original공종명 또는 currentGroup(No.1 덕타일주철관 부설 등)을 통해 관 자재인지 판단
        // 여기서는 original공종명이 "덕타일주철관" 등을 포함하는 경우로 가정
        if (diameter > 0 && (original공종명.includes('덕타일주철관') || original공종명.includes('주철관'))) {
          const pipeMaterialInfo = 자재데이터.find(m =>
            (m.name.includes(original공종명) || m.품명.includes(original공종명)) &&
            m.spec.includes(String(diameter)) &&
            m.호칭지름 === String(diameter) // 정확한 호칭지름 일치
            // && m.관종분류 === '2종관' // 필요한 경우 관종분류까지 조건에 추가
          );

          if (pipeMaterialInfo && pipeMaterialInfo.price) {
            const pipeWeightPerM = getDuctilePipeWeight(pipeMaterialInfo.관종분류 || '2종관', diameter); // DB의 관종분류 사용

            if (stdInputUnit === '본') {
              const lengthPerPiece = pipeMaterialInfo.표준길이_m_per_본 || 0;
              if (lengthPerPiece > 0) {
                if (pipeMaterialInfo.unit === 'kg' && pipeWeightPerM) {
                  materialCostPerStdUnit += pipeWeightPerM * lengthPerPiece * pipeMaterialInfo.price;
                } else if (pipeMaterialInfo.unit === 'm') {
                  materialCostPerStdUnit += pipeMaterialInfo.price * lengthPerPiece;
                } else if (pipeMaterialInfo.unit === '본') {
                  materialCostPerStdUnit += pipeMaterialInfo.price;
                }
              }
            } else if (stdInputUnit === 'm') { // 표준품셈 단위가 'm'인 경우
                if (pipeMaterialInfo.unit === 'kg' && pipeWeightPerM) {
                    materialCostPerStdUnit += pipeWeightPerM * pipeMaterialInfo.price;
                } else if (pipeMaterialInfo.unit === 'm') {
                    materialCostPerStdUnit += pipeMaterialInfo.price;
                } else if (pipeMaterialInfo.unit === '본' && pipeMaterialInfo.표준길이_m_per_본 && pipeMaterialInfo.표준길이_m_per_본 > 0) {
                    materialCostPerStdUnit += pipeMaterialInfo.price / pipeMaterialInfo.표준길이_m_per_본; // m당 단가로 환산
                }
            }
          }
        }

        // KP 메커니컬 조인트 부속품 (standardInputs 단위가 '개소' 또는 '조'이고, 공종명이 KP메커니컬 관련일 때)
        if (diameter > 0 && (mappedMinorWork === '주철관_KP메커니컬접합부설' || original공종명.includes('KP메커니컬')) && (stdInputUnit === '개소' || stdInputUnit === '조')) {
          const jointParts = getKpMechanicalJointParts(diameter);
          if (jointParts) {
            const partsToFind = [
              { namePart: '볼트', specDiameter: String(diameter), count: jointParts.bolts },
              { namePart: '너트', specDiameter: String(diameter), count: jointParts.nuts },
              { namePart: '고무링', specDiameter: String(diameter), count: jointParts.rubberRing }
            ];
            partsToFind.forEach(part => {
              const partMaterialInfo = 자재데이터.find(m =>
                m.품명.includes(part.namePart) &&
                m.호칭지름 === part.specDiameter // 호칭지름으로 부속품 규격 매칭
              );
              if (partMaterialInfo && partMaterialInfo.price) {
                materialCostPerStdUnit += partMaterialInfo.price * part.count;
              }
            });
          }
        }

        calculatedRow.재료비단가 = materialCostPerStdUnit; // 표준 단위당 재료비
        calculatedRow.노무비단가 = laborCostPerStdUnit;   // 표준 단위당 노무비
        calculatedRow.경비단가 = machineryCostPerStdUnit; // 표준 단위당 경비

        // 단위 변환 및 최종 금액 계산
        let conversionFactor = 1;
        const mainMaterialForUnitConversion = 자재데이터.find(m =>
            (m.name.includes(original공종명) || 품명포함(m.품명, original공종명)) &&
            m.spec.includes(original규격) &&
            m.표준길이_m_per_본 && m.표준길이_m_per_본 > 0
        );

        if (stdInputUnit === '본' && original단위 === 'm' && mainMaterialForUnitConversion && mainMaterialForUnitConversion.표준길이_m_per_본) {
            conversionFactor = 1 / mainMaterialForUnitConversion.표준길이_m_per_본; // m당 단가로 변환하기 위해 표준 길이로 나눔
        } else if (stdInputUnit === 'm' && original단위 === '본' && mainMaterialForUnitConversion && mainMaterialForUnitConversion.표준길이_m_per_본) {
            conversionFactor = mainMaterialForUnitConversion.표준길이_m_per_본; // 본당 단가로 변환하기 위해 표준 길이로 곱함
        }
        // 기타 단위 변환 로직 추가 가능 (예: kg <-> m, kg <-> 본)

        calculatedRow.재료비단가 *= conversionFactor;
        calculatedRow.노무비단가 *= conversionFactor;
        calculatedRow.경비단가 *= conversionFactor;

        calculatedRow.재료비금액 = calculatedRow.재료비단가 * 수량;
        calculatedRow.노무비금액 = calculatedRow.노무비단가 * 수량;
        calculatedRow.경비금액 = calculatedRow.경비단가 * 수량;

        if (currentGroup) {
          그룹별노무비[currentGroup] += calculatedRow.노무비금액;
        }

      } else { // 표준품셈을 찾지 못한 경우 기존 로직 사용
        calculatedRow.calculationBasis = '기존 로직';
        // 기존 노임 찾기
        // 기존 노임 찾기 (standardInputs 적용 안된 경우)
        const laborMatchExisting = 노임데이터.find(item =>
          item.jobTitle && (
            item.jobTitle.includes(original공종명.trim()) ||
            original공종명.trim().includes(item.jobTitle)
          )
        );
        if (laborMatchExisting) {
          calculatedRow.노무비단가 = laborMatchExisting.wage || 0;
        }
        
        // 기존 자재 찾기 (standardInputs 적용 안된 경우)
        let materialMatchExisting = null;
        if (original규격.trim() !== '') {
          materialMatchExisting = 자재데이터.find(item =>
            item.name && item.spec && (
              (item.name.includes(original공종명.trim()) || original공종명.trim().includes(item.name)) &&
              (item.spec.includes(original규격.trim()) || original규격.trim().includes(item.spec))
            )
          );
        }
        if (!materialMatchExisting) {
          materialMatchExisting = 자재데이터.find(item =>
            item.name && (
              item.name.includes(original공종명.trim()) ||
              original공종명.trim().includes(item.name)
            )
          );
        }
        if (materialMatchExisting) {
          calculatedRow.재료비단가 = materialMatchExisting.price || 0;
        }

        // 기존 중기사용목록 찾기 (standardInputs 적용 안됐고, 위에서 재료비,노무비 못찾은 경우)
        if (calculatedRow.재료비단가 === 0 && calculatedRow.노무비단가 === 0) {
            const 중기명 = `${original공종명} ${original규격}`.trim();
            const 정규화된중기명 = normalizeText(중기명);
            const machineryTableData = sessionStore.getMachineryTableData(); // MachineryUsageTable 결과
            let foundInMachineryTable = false;

            if (machineryTableData) { // MachineryUsageTable 결과 우선 사용
                const matchingGroup = Object.entries(machineryTableData).find(([groupName, items]) => {
                    const normalizedGroupName = normalizeText(groupName);
                    return normalizedGroupName === 정규화된중기명 || normalizedGroupName.includes(정규화된중기명) || 정규화된중기명.includes(normalizedGroupName);
                });
                if (matchingGroup) {
                    const [, items] = matchingGroup;
                    // MachineryUsageTable은 이미 계산된 재료비, 노무비, 경비 총액을 가지고 있음.
                    // 이를 단가로 사용하려면 해당 항목의 수량이 1일 때의 값이어야 함.
                    // 여기서는 해당 항목의 구성 비용으로 보고 단가에 직접 할당.
                    calculatedRow.재료비단가 = (items as any[]).filter(i => i.구분 === '재료비').reduce((s, i) => s + (parseFloat(i.금액) || 0), 0);
                    calculatedRow.노무비단가 = (items as any[]).filter(i => i.구분 === '노무비').reduce((s, i) => s + (parseFloat(i.금액) || 0), 0);
                    calculatedRow.경비단가 = (items as any[]).filter(i => i.구분 === '경비').reduce((s, i) => s + (parseFloat(i.금액) || 0), 0);
                    foundInMachineryTable = true;
                    calculatedRow.calculationBasis = '기존 로직: 중기사용료(MachineryUsageTable)';
                }
            }

            if (!foundInMachineryTable) { // sessionStore에 없으면 DB의 중기 데이터 검색
                const machineryDbItem = 중기사용목록.find(item => {
                    if (!item.name) return false;
                    const itemName = normalizeText(item.name);
                    const itemSpec = item.spec ? normalizeText(item.spec) : '';
                    const searchSpec = normalizeText(original규격);
                    return (itemName === 정규화된중기명 || itemName.includes(정규화된중기명) || 정규화된중기명.includes(itemName)) ||
                           (itemName.includes(normalizeText(original공종명)) && itemSpec.includes(searchSpec));
                });
                if (machineryDbItem) {
                     // db.ts의 MachineryData price는 시간당 단가 또는 일위대가성 총액일 수 있음.
                     // 여기서는 경비단가로 우선 처리. 기존 로직은 안분했었음.
                    calculatedRow.경비단가 = machineryDbItem.price || 0;
                    calculatedRow.calculationBasis = '기존 로직: 중기DB';
                }
            }
        }

        calculatedRow.재료비금액 = calculatedRow.재료비단가 * 수량;
        calculatedRow.노무비금액 = calculatedRow.노무비단가 * 수량;
        calculatedRow.경비금액 = calculatedRow.경비단가 * 수량;

        if (currentGroup && calculatedRow.노무비금액 > 0 && !original공종명.startsWith('No.')) {
             그룹별노무비[currentGroup] += calculatedRow.노무비금액;
        }
      }

      // 공구손료 및 잡재료비 계산 (항상 수행, 표준품셈과 별개로 항목명이 일치할 때)
      // 공구손료 및 잡재료비 계산 (항상 수행, 표준품셈과 별개로 항목명이 일치할 때)
      // 이 로직은 standardInputs을 사용한 계산 결과에 덮어쓰거나 추가될 수 있으므로 주의.
      // 혹은, standardInputs을 사용했다면 이 부분은 건너뛰도록 조정할 수도 있음.
      if (original공종명.trim().includes('공구손료')) {
        const basisBefore = calculatedRow.calculationBasis;
        calculatedRow.calculationBasis = `${basisBefore}; 직접 계산: 공구손료`;
        const percentFromSpec = getPercentFromSpec(original규격);
        if (percentFromSpec > 0 && currentGroup && 그룹별노무비[currentGroup]) {
          // 그룹별노무비[currentGroup]은 해당 그룹 내 이전 항목들에서 누적된 노무비 금액의 합.
          // 공구손료 단가는 이 누적된 노무비 합계에 대한 비율.
          calculatedRow.경비단가 = (그룹별노무비[currentGroup] || 0) * percentFromSpec;
          // calculatedRow.경비금액 = calculatedRow.경비단가 * 수량; // 금액은 아래에서 일괄 계산
        } else if (!standardInputs) { // 표준품셈 미적용 시, 기본 공구손료율 (예: 노무비의 3%)
           // calculatedRow.경비단가 = (calculatedRow.노무비단가) * 0.03; // 개별 항목 노무비의 3%
        }
         calculatedRow.경비금액 = calculatedRow.경비단가 * 수량;


      } else if (original공종명.trim().includes('잡재료비')) {
        const basisBefore = calculatedRow.calculationBasis;
        calculatedRow.calculationBasis = `${basisBefore}; 직접 계산: 잡재료비`;
        const percentFromSpec = getPercentFromSpec(original규격);
        if (percentFromSpec > 0 && currentGroup && 그룹별노무비[currentGroup]) {
          calculatedRow.재료비단가 = (그룹별노무비[currentGroup] || 0) * percentFromSpec;
          // calculatedRow.재료비금액 = calculatedRow.재료비단가 * 수량;
        } else if (!standardInputs) { // 표준품셈 미적용 시, 기본 잡재료비율 (예: 노무비의 1% 또는 재료비의 1%)
            // calculatedRow.재료비단가 = (calculatedRow.노무비단가) * 0.01;
        }
        calculatedRow.재료비금액 = calculatedRow.재료비단가 * 수량;
      }
      
      // 최종 합계 계산
      calculatedRow.합계단가 = calculatedRow.재료비단가 + calculatedRow.노무비단가 + calculatedRow.경비단가;
      calculatedRow.합계금액 = calculatedRow.재료비금액 + calculatedRow.노무비금액 + calculatedRow.경비금액;
      
      // 그룹별 총계 누적
      if (currentGroup && !original공종명.startsWith('No.')) {
        if (currentGroupTotals[currentGroup]) {
          currentGroupTotals[currentGroup].합계금액 += calculatedRow.합계금액;
          currentGroupTotals[currentGroup].재료비금액 += calculatedRow.재료비금액;
          // 그룹별노무비[currentGroup]는 이미 위에서 누적되었으므로 여기서는 그룹 총계의 노무비만 누적
          currentGroupTotals[currentGroup].노무비금액 += calculatedRow.노무비금액;
          currentGroupTotals[currentGroup].경비금액 += calculatedRow.경비금액;
          currentGroupTotals[currentGroup].rows.push(index);
        }
      }
      
      newCalculatedData.set(`row_${index}`, calculatedRow);
    });
    
    // 계산된 데이터 업데이트
    set계산된데이터(newCalculatedData);
    set그룹별노무비합계(그룹별노무비);
    set그룹별합계(currentGroupTotals);

    // 그룹 데이터 생성 및 업데이트 (일위대가목록으로 전달)
    const groupsArray = Object.entries(currentGroupTotals).map(([key, data]) => ({
      공종명: data.공종명,
      규격: dataRows.find((row: any) => row[Object.keys(row)[0]] === key)?.[Object.keys(dataRows[0])[1]] || '',
      단위: dataRows.find((row: any) => row[Object.keys(row)[0]] === key)?.[Object.keys(dataRows[0])[3]] || '',
      합계금액: data.합계금액,
      재료비금액: data.재료비금액,
      노무비금액: data.노무비금액,
      경비금액: data.경비금액
    }));

    set그룹데이터(groupsArray);
    
    // 콜백이 제공된 경우 그룹 데이터 전달
    if (onGroupsUpdated) {
      onGroupsUpdated(groupsArray);
      
      // 세션스토리지에 그룹 데이터 저장 (다른 컴포넌트에서 사용하기 위해)
      try {
        sessionStore.saveUnitPriceGroups(groupsArray);
        console.log('일위대가_호표 그룹 데이터 저장:', groupsArray.length);
      } catch (error) {
        console.error('그룹 데이터 저장 중 오류:', error);
      }
      
      // 일위대가_호표 전체 데이터를 저장 (PriceDocumentGenerator에서 사용)
      if (dataRows.length > 0) {
        // 필요한 데이터만 추출하여 저장
        const processedData = dataRows.map((row: any, index: number) => {
          const calculatedRow = newCalculatedData.get(`row_${index}`);
          if (calculatedRow) {
            return calculatedRow;
          }
          return null;
        }).filter(Boolean);
        
        // ***중요: 그룹 헤더 행에 계산된 합계 금액 반영***
        // 그룹 헤더 행의 합계 금액을 업데이트
        const updatedProcessedData = processedData.map((item: any) => {
          if (item && item.공종명 && item.공종명.startsWith('No.')) {
            // 그룹 헤더 행인 경우 해당 그룹의 계산된 합계 적용
            const groupKey = item.공종명.trim();
            if (currentGroupTotals[groupKey]) {
              // 그룹 헤더 행에 그룹 합계 값 적용
              return {
                ...item,
                합계금액: currentGroupTotals[groupKey].합계금액,
                재료비금액: currentGroupTotals[groupKey].재료비금액,
                노무비금액: currentGroupTotals[groupKey].노무비금액,
                경비금액: currentGroupTotals[groupKey].경비금액
              };
            }
          }
          return item;
        });
        
        if (updatedProcessedData.length > 0) {
          sessionStore.saveUnitPriceSheetData(updatedProcessedData);
          // 기존 키에도 저장 (PriceDocumentGenerator와의 호환성 유지)
          sessionStore.saveDataUnitpriceSheet(updatedProcessedData);
          console.log('일위대가_호표 데이터 저장 완료:', updatedProcessedData.length);
        }
      }
    }
  };

  // 규격에서 비율 추출 (인건비의 X% 형태)
  const getPercentFromSpec = (spec: string): number => {
    try {
      const 비율Text = spec.match(/인건비의\s*(\d+)%/);
      if (비율Text && 비율Text[1]) {
        return parseFloat(비율Text[1]) / 100;
      }
    } catch (e) {
      console.error('비율 추출 오류:', e);
    }
    return 0;
  };

  // 데이터 체크
  if (!data || !data.data || !data.sheetNames || !data.sheetNames.includes('일위대가_호표')) {
    return (
      <div className="p-4 bg-amber-50 text-amber-800 rounded border border-amber-200">
        <p>일위대가_호표 시트를 찾을 수 없습니다. 해당 시트가 포함된 엑셀 파일을 업로드해주세요.</p>
      </div>
    );
  }

  // 일위대가_호표 시트 데이터 추출
  const sheetData = data.data['일위대가_호표'] || {};
  const rowData = sheetData.rowData || [];
  const cellData = sheetData.cellData || {};

  // 필터링된 데이터 생성 - 비고 이후의 셀은 제외
  const filteredRowData = rowData.filter((row: any) => {
    // 비어있는 행 제외 로직
    return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">일위대가_호표</h2>
      
      <Card>
        <CardHeader className="bg-blue-50 py-3">
          <CardTitle className="text-lg">일위대가_호표 데이터</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {filteredRowData.length > 0 ? (
            <table className="w-full min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
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
                {renderCustomizedTable(filteredRowData, 계산된데이터, 그룹별합계)}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-gray-500">
              <p>데이터가 없거나 형식이 올바르지 않습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 품명에 특정 문자열이 포함되어 있는지 확인하는 헬퍼 함수
function 품명포함(품명: string | undefined, searchString: string): boolean {
  if (!품명) return false;
  return 품명.includes(searchString);
}

// 헤더를 제외한 데이터 행 렌더링 (일위대가_호표 특화)
function renderCustomizedTable(
  rowData: any[], 
  calculatedDataMap: Map<string, any>, // 이름 변경: calculatedData -> calculatedDataMap
  그룹별합계: {[key: string]: GroupTotal}
) {
  if (!rowData || rowData.length === 0) return null;
  
  const dataRows = rowData.slice(2); // 첫 두 행 헤더 제외
  
  return dataRows.map((row, rowIndex) => {
    const keys = Object.keys(row);
    
    const 공종명 = row[keys[0]] || '';
    const 규격 = row[keys[1]] || '';
    const 수량 = row[keys[2]] || ''; // 표시용은 원본 문자열 유지 가능
    const 단위 = row[keys[3]] || '';
    
    const calculatedRow = calculatedDataMap.get(`row_${rowIndex}`); // Map에서 조회
    
    const isGroupHeader = 공종명.startsWith('No.');
    
    // 디자인 개선: 그룹 헤더 스타일 강화
    const groupHeaderStyle = isGroupHeader ? 
      'bg-blue-100 font-bold text-blue-900 shadow-sm border-b-2 border-blue-300' : '';
    
    // 짝수/홀수 행 스타일 적용 (그룹 헤더가 아닌 경우만)
    const rowStyle = !isGroupHeader ? 
      (rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50') : '';
    
    // 그룹헤더인 경우 해당 그룹의 합계 값 가져오기
    let 합계단가: number | string = '';
    let 합계금액: number | string = '';
    let 재료비단가: number | string = '';
    let 재료비금액: number | string = '';
    let 노무비단가: number | string = '';
    let 노무비금액: number | string = '';
    let 경비단가: number | string = '';
    let 경비금액: number | string = '';
    
    if (isGroupHeader) {
      // 그룹 합계 가져오기
      const 그룹키 = 공종명.trim();
      if (그룹별합계[그룹키]) {
        합계금액 = 그룹별합계[그룹키].합계금액;
        재료비금액 = 그룹별합계[그룹키].재료비금액;
        노무비금액 = 그룹별합계[그룹키].노무비금액;
        경비금액 = 그룹별합계[그룹키].경비금액;
      }
    } else {
      // 일반 행의 경우 계산된 값 사용
      합계단가 = calculatedRow ? calculatedRow.합계단가 : '';
      합계금액 = calculatedRow ? calculatedRow.합계금액 : '';
      재료비단가 = calculatedRow ? calculatedRow.재료비단가 : '';
      재료비금액 = calculatedRow ? calculatedRow.재료비금액 : '';
      노무비단가 = calculatedRow ? calculatedRow.노무비단가 : '';
      노무비금액 = calculatedRow ? calculatedRow.노무비금액 : '';
      경비단가 = calculatedRow ? calculatedRow.경비단가 : '';
      경비금액 = calculatedRow ? calculatedRow.경비금액 : '';
    }
    
    // 비고
    let 비고 = row[keys[12]] || '';
    
    // 숫자 포맷팅 함수
    const formatNumber = (value: any) => {
      if (typeof value === 'number') {
        return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      }
      return value;
    };
    
    return (
      <tr key={rowIndex} className={`${rowStyle} ${groupHeaderStyle} hover:bg-gray-100 transition-colors`}>
        <td className={`px-3 py-2 border text-sm font-semibold text-left ${isGroupHeader ? 'text-blue-900' : ''}`}>{공종명}</td>
        <td className={`px-3 py-2 border text-sm text-left ${isGroupHeader ? 'text-blue-900' : ''}`}>{규격}</td>
        <td className={`px-3 py-2 border text-sm text-center ${isGroupHeader ? 'text-blue-900' : ''}`}>{수량}</td>
        <td className={`px-3 py-2 border text-sm text-center ${isGroupHeader ? 'text-blue-900' : ''}`}>{단위}</td>
        <td className="px-3 py-2 border text-sm text-right">{formatNumber(합계단가)}</td>
        <td className={`px-3 py-2 border text-sm text-right ${isGroupHeader ? 'font-bold' : ''}`}>{formatNumber(합계금액)}</td>
        <td className="px-3 py-2 border text-sm text-right">{formatNumber(재료비단가)}</td>
        <td className={`px-3 py-2 border text-sm text-right ${isGroupHeader ? 'font-bold' : ''}`}>{formatNumber(재료비금액)}</td>
        <td className="px-3 py-2 border text-sm text-right">{formatNumber(노무비단가)}</td>
        <td className={`px-3 py-2 border text-sm text-right ${isGroupHeader ? 'font-bold' : ''}`}>{formatNumber(노무비금액)}</td>
        <td className="px-3 py-2 border text-sm text-right">{formatNumber(경비단가)}</td>
        <td className={`px-3 py-2 border text-sm text-right ${isGroupHeader ? 'font-bold' : ''}`}>{formatNumber(경비금액)}</td>
        <td className="px-3 py-2 border text-sm text-center">{비고}</td>
      </tr>
    );
  });
} 