'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { processMachineryData } from '@/utils/excel';
import { db } from '@/utils/db';
import { Input } from '@/components/ui/input';
import { sessionStore } from '@/utils/sessionStore';

interface MachineryTableProps {
  data: any[];
}

// 텍스트 정규화 함수 추가
function normalizeText(text: string): string {
  return (text || '').replace(/\s+/g, '').toLowerCase();
}

export default function MachineryTable({ data }: MachineryTableProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [groupedData, setGroupedData] = useState<{ [key: string]: any[] }>({});
  const [error, setError] = useState<string | null>(null);
  // 중기전역변수 설정 - 세션스토리지에서 로컬스토리지로 변경
  const [machineGlobalVar, setMachineGlobalVar] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedValue = localStorage.getItem('pe-liner-machine-global-var');
      return savedValue ? parseFloat(savedValue) : 0;
    }
    return 0;
  });
  
  // 중기전역변수 변경 핸들러
  const handleMachineGlobalVarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = parseFloat(value);
    
    if (!isNaN(numericValue)) {
      // 소수점 다섯째자리까지 표시
      const roundedValue = Math.round(numericValue * 100000) / 100000;
      setMachineGlobalVar(roundedValue);
      
      // 로컬스토리지에 저장 (세션스토리지에서 변경)
      localStorage.setItem('pe-liner-machine-global-var', roundedValue.toString());
      
      // 중기전역변수가 변경되면 데이터 재처리
      if (data) {
        const reprocessedData = processExcelMachineryData(data, roundedValue);
        setGroupedData(reprocessedData);
      }
    }
  };

  // 데이터 처리 및 가공
  useEffect(() => {
    try {
      // 콘솔에 원본 데이터를 출력하여 확인
      console.log('중기사용료 원본 데이터:', data);
      console.log('중기사용료 데이터 타입:', typeof data, Array.isArray(data));
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('유효한 중기사용료 데이터가 없습니다.');
        setError('유효한 중기사용료 데이터가 없습니다. 데이터 업로드 메뉴에서 먼저 엑셀 파일을 업로드해주세요.');
        setIsLoading(false);
        return;
      }

      // 샘플 데이터 확인
      console.log('중기사용료 데이터 샘플:', data.slice(0, 3));
      
      // DB 데이터 로드 확인
      const machineBaseCount = db.getMachineBaseData().length;
      const materialCount = db.getMaterialData().length;
      const laborCount = db.getLaborData().length;
      
      console.log('DB 데이터 현황:', {
        machineBaseCount,
        materialCount,
        laborCount
      });
      
      if (machineBaseCount === 0 && materialCount === 0 && laborCount === 0) {
        setError('기초 데이터가 없습니다. 중기기초자료, 자재, 노임 데이터를 먼저 업로드해주세요.');
        setIsLoading(false);
        return;
      }
      
      // 직접 데이터 처리 - 여기서도 현재 machineGlobalVar 값을 전달
      const processedData = processExcelMachineryData(data, machineGlobalVar);
      console.log('직접 처리된 중기사용료 데이터:', processedData);
      
      setGroupedData(processedData);
      
      // 세션스토리지에 처리된 중기사용료 데이터 저장 (나중에 다른 컴포넌트에서 사용)
      try {
        sessionStore.saveMachineryTableData(processedData);
        console.log('중기사용료 데이터를 sessionStorage에 저장했습니다:', Object.keys(processedData).length);
      } catch (storageError) {
        console.error('sessionStorage 저장 중 오류:', storageError);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('중기사용료 데이터 처리 중 오류:', err);
      setError('데이터 처리 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  }, [data, machineGlobalVar]);

  // 그룹화된 데이터가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(groupedData).length > 0) {
      try {
        localStorage.setItem('pe-liner-machinery-table-data', JSON.stringify(groupedData));
        console.log('중기사용료 데이터를 localStorage에 저장했습니다:', Object.keys(groupedData).length);
      } catch (err) {
        console.error('중기사용료 데이터 localStorage 저장 중 오류:', err);
      }
    }
  }, [groupedData]);

  // 직접 Excel 데이터를 처리하는 함수 - machineGlobalVarValue 매개변수 추가
  function processExcelMachineryData(data: any[], machineGlobalVarValue: number = machineGlobalVar): { [key: string]: any[] } {
    // DB에 필요한 데이터 로드
    const machineBaseData = db.getMachineBaseData();
    const materialData = db.getMaterialData();
    const laborData = db.getLaborData();
    
    console.log('DB 데이터 로드:', {
      machineBase: machineBaseData.length,
      material: materialData.length,
      labor: laborData.length
    });
    
    // 중기전역변수 값 로깅
    console.log('현재 적용되는 중기전역변수 값:', machineGlobalVarValue);
    
    const groupedData: { [key: string]: any[] } = {};
    let currentMachineName = '';
    let currentItems: any[] = [];
    let dieselItemAmount = 0; // 경유 금액을 저장할 변수
    
    // 중기명으로 그룹화
    data.forEach(item => {
      // 항목 로깅
      console.log('항목 확인:', item);
      
      // 잡품/잡유 관련 항목 로깅 (진단용)
      const itemEmptyNormalized = normalizeText(item['__EMPTY'] || '');
      if (['잡품', '잡유'].includes(itemEmptyNormalized)) {
        console.log('잡품/잡유 항목 발견:', item);
      }
      
      // 새로운 중기명을 찾은 경우 - 공백을 제거하고 비교
      const machineUsageNormalized = normalizeText(item['중기사용료'] || '');
      if (machineUsageNormalized === '중기명' && item['__EMPTY']) {
        // 이전 그룹이 있으면 저장
        if (currentMachineName && currentItems.length > 0) {
          // 소계와 총계 재계산
          recalculateTotals(currentItems);
          groupedData[currentMachineName] = [...currentItems];
        }
        
        // 새 그룹 시작
        currentMachineName = item['__EMPTY'];
        currentItems = [];
        dieselItemAmount = 0; // 새 그룹에서 경유 금액 초기화
        console.log('새 중기명 발견:', currentMachineName);
      } 
      // 현재 그룹에 아이템 추가
      else if (currentMachineName) {
        // 구분, 항목 관련 문자열 정규화
        const machineUsageNormalized = normalizeText(item['중기사용료'] || '');
        const itemEmptyNormalized = normalizeText(item['__EMPTY'] || '');
        
        // 구분, 항목, 수량, 단위, 단가, 금액 정보가 있는 항목만 추가
        if (
          (['경비', '재료비', '노무비'].includes(machineUsageNormalized)) || 
          (['소계', '총계', '잡품', '잡유'].includes(itemEmptyNormalized))
        ) {
          // 항목 매핑
          const mappedItem: any = {
            구분: '',
            항목: '',
            규격: '',
            수량: '',
            단위: '',
            단가: '',
            금액: ''
          };
          
          // 구분 설정 - 공백 제거하고 비교
          if (machineUsageNormalized === '경비') {
            mappedItem.구분 = '경비';
          } else if (machineUsageNormalized === '재료비') {
            mappedItem.구분 = '재료비';
          } else if (machineUsageNormalized === '노무비') {
            mappedItem.구분 = '노무비';
          } else if (itemEmptyNormalized === '소계') {
            // 소계 항목 추가 (나중에 재계산)
            mappedItem.구분 = '소계';
            mappedItem.금액 = 0;
            currentItems.push(mappedItem);
            return;
          } else if (itemEmptyNormalized === '총계') {
            // 총계 항목 추가 (나중에 재계산)
            mappedItem.구분 = '총계';
            mappedItem.금액 = 0;
            currentItems.push(mappedItem);
            return;
          }
          
          // 항목 내용 설정
          if (item['__EMPTY']) {
            mappedItem.항목 = item['__EMPTY'];
            
            // 특수 항목 구분 설정 (잡품, 잡유 등이 구분이 없을 경우)
            const normalizedItem = normalizeText(mappedItem.항목);
            if ((normalizedItem === '잡품' || normalizedItem === '잡유') && !mappedItem.구분) {
              mappedItem.구분 = '재료비'; // 기본적으로 재료비로 설정
            }
          }
          
          // 규격 별도 설정
          if (item['__EMPTY_1']) {
            mappedItem.규격 = item['__EMPTY_1'];
          }
          
          // 수량
          mappedItem.수량 = parseFloat(item['__EMPTY_2']) || 0;
          
          // 단위
          mappedItem.단위 = item['__EMPTY_3'] || '';
          
          // 항목별 로깅 - 데이터 확인용
          console.log(`항목 처리: 구분(${mappedItem.구분}), 항목(${mappedItem.항목}), 수량(${mappedItem.수량}), 단위(${mappedItem.단위})`);
          
          // 항목 정규화 - 공백 제거하고 비교
          const normalizedItemName = normalizeText(mappedItem.항목);
          
          // 경유 항목 처리 - 정규화된 텍스트로 비교
          if (normalizedItemName === '경유') {
            // 경유 변수 초기화
            dieselItemAmount = 0;
            
            // 단가 설정 (DB에서 검색)
            const unitPrice = findUnitPriceFromDB(
              mappedItem.항목, 
              mappedItem.규격, 
              mappedItem.구분, 
              machineBaseData, 
              materialData, 
              laborData
            );
            
            mappedItem.단가 = unitPrice;
            
            // 금액 계산 (수량 * 단가)
            mappedItem.금액 = mappedItem.수량 * mappedItem.단가;
            
            // 경유 금액 저장
            dieselItemAmount = mappedItem.금액;
            console.log('경유 금액 저장:', dieselItemAmount);
          }
          // 잡품, 잡유 처리 (경유 금액의 일정 비율로 계산) - 정규화된 텍스트로 비교
          else if (normalizedItemName === '잡품' || normalizedItemName === '잡유') {
            // 무조건 경유 금액의 비율로 계산 (경유 다음에 오는 항목으로 처리)
            mappedItem.단가 = 0;
            mappedItem.금액 = dieselItemAmount * (mappedItem.수량 / 100);
            console.log(`${mappedItem.항목} 경유 금액 기준 계산: ${dieselItemAmount} * ${mappedItem.수량}/100 = ${mappedItem.금액}`);
          }
          // 노무비 처리 (중기전역변수 적용)
          else if (mappedItem.구분 === '노무비') {
            // 단가 설정 (DB에서 검색)
            const unitPrice = findUnitPriceFromDB(
              mappedItem.항목, 
              mappedItem.규격, 
              mappedItem.구분, 
              machineBaseData, 
              materialData, 
              laborData
            );
            
            // 노무비 단가는 중기전역변수 곱해서 계산 - 파라미터로 전달받은 값 사용
            mappedItem.단가 = unitPrice * machineGlobalVarValue;
            mappedItem.금액 = mappedItem.수량 * mappedItem.단가;
            console.log(`노무비 단가 계산: ${unitPrice} * ${machineGlobalVarValue} = ${mappedItem.단가}`);
          } 
          // 일반 항목 처리
          else {
            // 단가 설정 (DB에서 검색)
            const unitPrice = findUnitPriceFromDB(
              mappedItem.항목, 
              mappedItem.규격, 
              mappedItem.구분, 
              machineBaseData, 
              materialData, 
              laborData
            );
            
            mappedItem.단가 = unitPrice;
            
            // 금액 계산 (수량 * 단가)
            mappedItem.금액 = mappedItem.수량 * mappedItem.단가;
          }
          
          currentItems.push(mappedItem);
        }
      }
    });
    
    // 마지막 그룹 처리
    if (currentMachineName && currentItems.length > 0) {
      // 소계와 총계 재계산
      recalculateTotals(currentItems);
      groupedData[currentMachineName] = [...currentItems];
    }
    
    return groupedData;
  }

  // DB에서 항목+규격을 기준으로 단가 찾기
  function findUnitPriceFromDB(
    name: string, 
    spec: string, 
    category: string, 
    machineBaseData: any[], 
    materialData: any[], 
    laborData: any[]
  ): number {
    // 검색을 위해 문자열 정규화 (공백 제거, 소문자 변환)
    const normalizedName = name.replace(/\s+/g, '').toLowerCase();
    const normalizedSpec = spec.replace(/\s+/g, '').toLowerCase();
    
    console.log(`DB에서 검색: "${normalizedName}" + "${normalizedSpec}"`);
    
    // 1. 먼저 중기기초자료에서 검색
    const machineItem = machineBaseData.find(item => {
      const itemName = (item.name || '').replace(/\s+/g, '').toLowerCase();
      const itemSpec = (item.spec || '').replace(/\s+/g, '').toLowerCase();
      return itemName === normalizedName && (normalizedSpec === '' || itemSpec === normalizedSpec);
    });
    
    if (machineItem) {
      console.log(`중기기초자료 매칭됨: ${machineItem.name}, 금액: ${machineItem.hourlyRate}`);
      return machineItem.hourlyRate || 0;
    }
    
    // 2. 중기기초자료에서 찾지 못한 경우 자재 데이터에서 검색
    const materialItem = materialData.find(item => {
      const itemName = (item.name || '').replace(/\s+/g, '').toLowerCase();
      const itemSpec = (item.spec || '').replace(/\s+/g, '').toLowerCase();
      return itemName === normalizedName && (normalizedSpec === '' || itemSpec === normalizedSpec);
    });
    
    if (materialItem) {
      console.log(`자재 매칭됨: ${materialItem.name}, 단가: ${materialItem.price}`);
      return materialItem.price || 0;
    }
    
    // 3. 자재 데이터에서도 찾지 못한 경우 노임 데이터에서 검색
    const laborItem = laborData.find(item => {
      const itemName = (item.jobTitle || '').replace(/\s+/g, '').toLowerCase();
      const itemWork = (item.workType || '').replace(/\s+/g, '').toLowerCase();
      return itemName === normalizedName && (normalizedSpec === '' || itemWork === normalizedSpec);
    });
    
    if (laborItem) {
      console.log(`노임 매칭됨: ${laborItem.jobTitle}, 임금: ${laborItem.wage}`);
      return laborItem.wage || 0;
    }
    
    // 일치하는 항목이 없는 경우 0 반환
    console.log(`일치하는 항목 없음: ${name} (${spec})`);
    return 0;
  }

  // 소계와 총계 재계산
  function recalculateTotals(items: any[]): void {
    // 구분별 합계 계산
    const categoryTotals: { [key: string]: number } = {};
    let grandTotal = 0;
    
    // 일반 항목의 금액 합산 (구분별)
    items.forEach(item => {
      if (item.구분 !== '소계' && item.구분 !== '총계') {
        categoryTotals[item.구분] = (categoryTotals[item.구분] || 0) + (parseFloat(item.금액) || 0);
        grandTotal += (parseFloat(item.금액) || 0);
      }
    });
    
    // 소계 항목 업데이트
    items.forEach(item => {
      if (item.구분 === '소계') {
        // 이전 구분의 소계 금액 찾기
        const previousItem = items[items.indexOf(item) - 1];
        if (previousItem && previousItem.구분 && categoryTotals[previousItem.구분]) {
          item.금액 = categoryTotals[previousItem.구분];
        }
      } else if (item.구분 === '총계') {
        item.금액 = grandTotal;
      }
    });
  }
  
  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-gray-500">데이터 로딩 중...</p>
      </div>
    );
  }
  
  // 오류 표시
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold">중기사용료</h2>
        <div className="flex items-center space-x-2">
          <label htmlFor="machineGlobalVar" className="text-sm font-medium">
            중기전역변수값:
          </label>
          <Input
            id="machineGlobalVar"
            type="number"
            value={machineGlobalVar}
            onChange={handleMachineGlobalVarChange}
            className="w-24"
            step="0.00001"
            min="0"
            max="100"
          />
        </div>
      </div>
      
      {Object.entries(groupedData).length > 0 ? (
        Object.entries(groupedData).map(([machineName, items]) => (
          <Card key={machineName} className="overflow-hidden mb-6 w-full">
            <CardHeader className="bg-blue-50 py-3">
              <CardTitle className="text-lg">{machineName}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-2 text-left text-sm font-medium">No.</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">구분</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">항목</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">규격</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">수량</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">단위</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">단가</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderMachineryRows(items)}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-600">표시할 중기사용료 데이터가 없습니다. 수량정보 데이터관리 &gt; 데이터업로드 메뉴에서 중기사용료 시트가 포함된 엑셀 파일을 업로드해주세요.</p>
        </div>
      )}
    </div>
  );
}

function renderMachineryRows(items: any[]) {
  const rows: React.ReactNode[] = [];
  let rowNumber = 1;
  
  items.forEach(item => {
    // 소계 또는 총계 행
    if (item.구분 === '소계' || item.구분 === '총계') {
      rows.push(
        <tr key={`${item.구분}-${rowNumber}`} className={`border-b ${item.구분 === '총계' ? 'bg-blue-50' : 'bg-gray-50'}`}>
          <td className="px-4 py-2 text-sm">{rowNumber++}</td>
          <td className="px-4 py-2 text-sm" colSpan={6}>
            <span className="ml-4">{item.구분 === '소계' ? '소 계' : '총 계'}</span>
          </td>
          <td className="px-4 py-2 text-sm font-medium text-right">
            {formatCurrency(item.금액)}
          </td>
        </tr>
      );
    } 
    // 일반 항목 행
    else {
      rows.push(
        <tr key={`item-${rowNumber}`} className="border-b">
          <td className="px-4 py-2 text-sm">{rowNumber++}</td>
          <td className="px-4 py-2 text-sm">{item.구분}</td>
          <td className="px-4 py-2 text-sm">{item.항목}</td>
          <td className="px-4 py-2 text-sm">{item.규격}</td>
          <td className="px-4 py-2 text-sm">{formatNumber(item.수량)}</td>
          <td className="px-4 py-2 text-sm">{item.단위}</td>
          <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.단가)}</td>
          <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.금액)}</td>
        </tr>
      );
    }
  });
  
  return rows;
}

function formatNumber(value: any): string {
  if (value === undefined || value === null || value === '') return '';
  const numValue = Number(value);
  if (numValue === 0) return '';
  return numValue.toLocaleString('ko-KR');
}

function formatCurrency(value: any): string {
  if (value === undefined || value === null || value === '') return '';
  const numValue = Number(value);
  if (numValue === 0) return '';
  return numValue.toLocaleString('ko-KR');
} 