'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { normalizeText } from '@/components/DocumentGenerator/MachineryUsageTable'; // 정규화 함수 임포트
import { db } from '@/utils/db';
import { sessionStore } from '@/utils/sessionStore';

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
  const [노임데이터, set노임데이터] = useState<any[]>([]);
  const [자재데이터, set자재데이터] = useState<any[]>([]);
  const [중기사용목록, set중기사용목록] = useState<any[]>([]);
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
        const 노임데이터JSON = localStorage.getItem('pe-liner-labor-data');
        if (노임데이터JSON) {
          const 노임 = JSON.parse(노임데이터JSON);
          set노임데이터(노임);
        }
        
        // 자재 데이터 로드
        const 자재데이터JSON = localStorage.getItem('pe-liner-material-data');
        if (자재데이터JSON) {
          const 자재 = JSON.parse(자재데이터JSON);
          set자재데이터(자재);
        }
        
        // 중기사용목록 데이터 로드 시도 (localStorage에서)
        const 중기데이터JSON = localStorage.getItem('pe-liner-machinery-data');
        if (중기데이터JSON) {
          const 중기 = JSON.parse(중기데이터JSON);
          set중기사용목록(중기);
        }
        
        // 메모리에 저장된 중기사용목록 데이터 확인 (window 객체 활용)
        if (typeof window !== 'undefined' && (window as any).machineryItems) {
          const 메모리중기데이터 = (window as any).machineryItems;
          console.log('메모리에서 중기사용목록 데이터 로드:', 메모리중기데이터.length);
          set메모리중기사용목록(메모리중기데이터);
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
      const 공종명 = row[keys[0]] || '';
      const 규격 = row[keys[1]] || '';
      const 수량 = parseFloat(row[keys[2]]) || 0;
      const 단위 = row[keys[3]] || '';
      
      // No로 시작하는 그룹 확인
      if (공종명.startsWith('No.')) {
        currentGroup = 공종명.trim();
        currentGroupSpec = 규격.trim();
        currentGroupUnit = 단위.trim();
        그룹별노무비[currentGroup] = 0; // 해당 그룹의 노무비 초기화
        
        // 새 그룹에 대한 합계 초기화
        currentGroupTotals[currentGroup] = {
          공종명: currentGroup,
          합계금액: 0,
          재료비금액: 0,
          노무비금액: 0,
          경비금액: 0,
          rows: []
        };
      }
      
      // 계산 결과 담을 객체
      const calculatedRow = {
        공종명,
        규격,
        수량,
        단위,
        합계단가: 0,
        합계금액: 0,
        재료비단가: 0,
        재료비금액: 0,
        노무비단가: 0,
        노무비금액: 0,
        경비단가: 0,
        경비금액: 0,
      };
      
      // 공구손료는 경비 구분항목으로 분류
      if (공종명.trim().includes('공구손료')) {
        const 인건비비율 = getPercentFromSpec(규격);
        if (인건비비율 > 0 && currentGroup && 그룹별노무비[currentGroup]) {
          calculatedRow.경비단가 = 그룹별노무비[currentGroup] * 인건비비율;
          calculatedRow.경비금액 = calculatedRow.경비단가 * 수량;
        }
      } 
      // 잡재료비는 재료비 구분항목으로 분류
      else if (공종명.trim().includes('잡재료비')) {
        const 인건비비율 = getPercentFromSpec(규격);
        if (인건비비율 > 0 && currentGroup && 그룹별노무비[currentGroup]) {
          calculatedRow.재료비단가 = 그룹별노무비[currentGroup] * 인건비비율;
          calculatedRow.재료비금액 = calculatedRow.재료비단가 * 수량;
        }
      }
      // 일반 항목 처리
      else {
        // 노임 찾기
        const 노무비계산 = 노임데이터.find(item => 
          item.jobTitle && (
            item.jobTitle.includes(공종명.trim()) || 
            공종명.trim().includes(item.jobTitle)
          )
        );
        
        if (노무비계산) {
          calculatedRow.노무비단가 = 노무비계산.wage || 0;
          calculatedRow.노무비금액 = calculatedRow.노무비단가 * 수량;
          
          // 현재 그룹의 노무비 합계 누적
          if (currentGroup) {
            그룹별노무비[currentGroup] += calculatedRow.노무비금액;
          }
        }
        
        // 자재 찾기 - 공종명과 규격을 모두 고려
        let 자재비계산 = null;
        
        // 1. 공종명과 규격이 모두 일치하는 자재 찾기 (정확한 매칭)
        if (규격.trim() !== '') {
          자재비계산 = 자재데이터.find(item => 
            item.name && item.spec && (
              (item.name.includes(공종명.trim()) || 공종명.trim().includes(item.name)) &&
              (item.spec.includes(규격.trim()) || 규격.trim().includes(item.spec))
            )
          );
          
          if (자재비계산) {
            console.log(`자재 정확히 매칭됨 (공종+규격): ${자재비계산.name}, 규격: ${자재비계산.spec}, 단가: ${자재비계산.price}`);
          }
        }
        
        // 2. 정확한 매칭이 없으면 공종명만으로 검색
        if (!자재비계산) {
          자재비계산 = 자재데이터.find(item => 
            item.name && (
              item.name.includes(공종명.trim()) || 
              공종명.trim().includes(item.name)
            )
          );
          
          if (자재비계산) {
            console.log(`자재 일부 매칭됨 (공종명만): ${자재비계산.name}, 단가: ${자재비계산.price}`);
          }
        }
        
        if (자재비계산) {
          calculatedRow.재료비단가 = 자재비계산.price || 0;
          calculatedRow.재료비금액 = calculatedRow.재료비단가 * 수량;
        }

        // 인건비 비율 계산 (규격이 '인건비의 X%' 형태인 경우)
        if (규격.includes('인건비의') && 규격.includes('%')) {
          try {
            const 비율 = getPercentFromSpec(규격);
            
            // 현재 그룹의 노무비 합계에 비율 적용
            if (비율 > 0 && currentGroup && 그룹별노무비[currentGroup]) {
              calculatedRow.노무비단가 = 그룹별노무비[currentGroup] * 비율;
              calculatedRow.노무비금액 = calculatedRow.노무비단가 * 수량;
            }
          } catch (e) {
            console.error('인건비 비율 처리 오류:', e);
          }
        }
        
        // 중기사용목록에서 데이터 찾기 (다른 DB에서 찾지 못한 경우)
        if (calculatedRow.재료비단가 === 0 && calculatedRow.노무비단가 === 0 && 수량 > 0) {
          // 공종명 + 규격 조합으로 검색
          const 중기명 = `${공종명} ${규격}`.trim();
          
          // 중기명 정규화
          const 정규화된중기명 = normalizeText(중기명);
          console.log('찾는 중기명:', 정규화된중기명);
          
          // 1. 먼저 sessionStore에서 중기사용료 데이터를 가져와서 계산
          const machineryTableData = sessionStore.getMachineryTableData();
          if (machineryTableData) {
            // 중기사용료 그룹에서 일치하는 이름 찾기
            const matchingGroup = Object.entries(machineryTableData).find(([groupName, items]) => {
              const normalizedGroupName = normalizeText(groupName);
              return normalizedGroupName === 정규화된중기명 || 
                     normalizedGroupName.includes(정규화된중기명) || 
                     정규화된중기명.includes(normalizedGroupName);
            });

            if (matchingGroup) {
              const [groupName, items] = matchingGroup;
              console.log('중기사용료 그룹 매칭됨:', groupName);
              
              // 해당 그룹의 총계 항목 찾기
              const totalItem = (items as any[]).find((item: any) => item.구분 === '총계');
              if (totalItem) {
                // 재료비, 노무비, 경비 계산
                const materialItems = (items as any[]).filter((item: any) => item.구분 === '재료비');
                const laborItems = (items as any[]).filter((item: any) => item.구분 === '노무비');
                const expenseItems = (items as any[]).filter((item: any) => item.구분 === '경비');
                
                // 각 항목의 금액 합산
                const materialTotal = materialItems.reduce((sum: number, item: any) => sum + (parseFloat(item.금액) || 0), 0);
                const laborTotal = laborItems.reduce((sum: number, item: any) => sum + (parseFloat(item.금액) || 0), 0);
                const expenseTotal = expenseItems.reduce((sum: number, item: any) => sum + (parseFloat(item.금액) || 0), 0);
                
                // 단가 계산 (총 금액을 수량으로 나눔)
                calculatedRow.재료비단가 = materialTotal;
                calculatedRow.노무비단가 = laborTotal;
                calculatedRow.경비단가 = expenseTotal;
                
                // 금액 계산 (단가 * 수량)
                calculatedRow.재료비금액 = calculatedRow.재료비단가 * 수량;
                calculatedRow.노무비금액 = calculatedRow.노무비단가 * 수량;
                calculatedRow.경비금액 = calculatedRow.경비단가 * 수량;
                
                console.log('중기사용료 계산 결과:', {
                  재료비: calculatedRow.재료비금액,
                  노무비: calculatedRow.노무비금액,
                  경비: calculatedRow.경비금액
                });
              }
            }
          }
          
          // 2. sessionStore에서 찾지 못한 경우 기존 메모리중기사용목록 검색 로직 사용
          if (calculatedRow.재료비단가 === 0 && calculatedRow.노무비단가 === 0) {
            // 메모리에 저장된 중기사용목록 데이터에서 먼저 찾기 (정규화된 이름으로 비교)
            let 중기항목 = 메모리중기사용목록.find(item => {
              if (!item.name) return false;
              const itemName = normalizeText(item.name);
              return itemName === 정규화된중기명 || 
                     itemName.includes(정규화된중기명) || 
                     정규화된중기명.includes(itemName);
            });
            
            // 정확히 매칭되지 않는 경우 대체 검색 시도 (톤, ton 같은 단위 변환 등)
            if (!중기항목) {
              // 대체 키워드 (예: '10 ton' -> '10톤')
              const 대체중기명 = 정규화된중기명
                .replace(/\b(\d+)\s*ton\b/gi, '$1톤')
                .replace(/\b(\d+)\s*톤\b/g, '$1 ton');
                
              console.log('대체 중기명으로 검색:', 대체중기명);
              
              중기항목 = 메모리중기사용목록.find(item => {
                if (!item.name) return false;
                const itemName = normalizeText(item.name);
                return itemName.includes(대체중기명) || 대체중기명.includes(itemName);
              });
            }
            
            // 메모리에서 찾지 못한 경우 localStorage의 데이터에서 찾기
            if (!중기항목 && 중기사용목록.length > 0) {
              중기항목 = 중기사용목록.find(item => {
                if (!item.name) return false;
                const itemName = normalizeText(item.name);
                return itemName === 정규화된중기명 || 
                       itemName.includes(정규화된중기명) || 
                       정규화된중기명.includes(itemName);
              });
            }
            
            if (중기항목) {
              console.log('중기사용목록에서 매칭된 항목:', 중기항목);
              // 메모리 중기사용목록에서 찾은 경우
              if (중기항목.material !== undefined && 중기항목.labor !== undefined && 중기항목.expense !== undefined) {
                calculatedRow.재료비단가 = 중기항목.material || 0;
                calculatedRow.노무비단가 = 중기항목.labor || 0; 
                calculatedRow.경비단가 = 중기항목.expense || 0;
              } 
              // localStorage 중기사용목록에서 찾은 경우
              else if (중기항목.price) {
                calculatedRow.재료비단가 = 중기항목.price * 0.4 || 0; // 가정: 전체 가격의 40%를 재료비로
                calculatedRow.노무비단가 = 중기항목.price * 0.35 || 0; // 가정: 전체 가격의 35%를 노무비로
                calculatedRow.경비단가 = 중기항목.price * 0.25 || 0;  // 가정: 전체 가격의 25%를 경비로
              }
              
              calculatedRow.재료비금액 = calculatedRow.재료비단가 * 수량;
              calculatedRow.노무비금액 = calculatedRow.노무비단가 * 수량;
              calculatedRow.경비금액 = calculatedRow.경비단가 * 수량;
            } else {
              console.log('중기사용목록에서 매칭 항목을 찾지 못했습니다:', 정규화된중기명);
            }
          }
        }
      }
      
      // 합계 계산
      calculatedRow.합계단가 = calculatedRow.재료비단가 + calculatedRow.노무비단가 + calculatedRow.경비단가;
      calculatedRow.합계금액 = calculatedRow.재료비금액 + calculatedRow.노무비금액 + calculatedRow.경비금액;
      
      // 현재 그룹의 합계 누적 (No로 시작하는 행은 제외)
      if (currentGroup && !공종명.startsWith('No.')) {
        if (currentGroupTotals[currentGroup]) {
          currentGroupTotals[currentGroup].합계금액 += calculatedRow.합계금액;
          currentGroupTotals[currentGroup].재료비금액 += calculatedRow.재료비금액;
          currentGroupTotals[currentGroup].노무비금액 += calculatedRow.노무비금액;
          currentGroupTotals[currentGroup].경비금액 += calculatedRow.경비금액;
          currentGroupTotals[currentGroup].rows.push(index);
        }
      }
      
      // 행 식별자로 맵에 저장 (인덱스 기반)
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

// 헤더를 제외한 데이터 행 렌더링 (일위대가_호표 특화)
function renderCustomizedTable(
  rowData: any[], 
  calculatedData: Map<string, any>,
  그룹별합계: {[key: string]: GroupTotal}
) {
  if (!rowData || rowData.length === 0) return null;
  
  // 첫 번째 행은 헤더라서 스킵하고, 데이터 행만 렌더링
  // rowData.slice(2)로 변경: 첫 번째와 두 번째 행이 헤더에 해당하므로 두 행을 제외
  const dataRows = rowData.slice(2);
  
  return dataRows.map((row, rowIndex) => {
    // 각 열의 데이터 맵핑
    // 원본 데이터 키를 가져오기
    const keys = Object.keys(row);
    
    // 엑셀에서 가져온 공종명, 규격, 수량, 단위 데이터
    let 공종명 = row[keys[0]] || '';  
    let 규격 = row[keys[1]] || '';   
    let 수량 = row[keys[2]] || '';   
    let 단위 = row[keys[3]] || '';   
    
    // 계산된 데이터에서 현재 행에 해당하는 데이터 찾기
    const calculatedRow = calculatedData.get(`row_${rowIndex}`);
    
    // No로 시작하는 그룹헤더 행 확인
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