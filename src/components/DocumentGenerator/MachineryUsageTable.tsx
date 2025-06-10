'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sessionStore } from '@/utils/sessionStore';

interface MachineryItem {
  id: string;
  name: string;
  material: number;
  labor: number;
  expense: number;
  total: number;
}

interface MachineryUsageTableProps {
  // props가 있다면 여기에 정의
}

// 텍스트 정규화 유틸리티 함수
export function normalizeText(text: string): string {
  return (text || '').replace(/\s+/g, '').toLowerCase();
}

export default function MachineryUsageTable() {
  const [items, setItems] = useState<MachineryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      // 중기사용료 테이블 데이터 가져오기 (sessionStorage에서)
      const machineryTableData = sessionStore.getMachineryTableData();
      
      if (!machineryTableData) {
        setError('중기사용료 데이터가 없습니다. 먼저 수량정보 > 중기사용료 메뉴에서 데이터를 확인해주세요.');
        return;
      }
      
      // 중기사용료 데이터를 기본 항목으로 생성
      const generatedItems = createMachineryItemsFromGroupedData(machineryTableData);
      setItems(generatedItems);
      console.log('생성된 중기사용목록 항목 수:', generatedItems.length);
      
      if (generatedItems.length > 0) {
        // 메모리에 중기사용목록 저장 (PriceDocumentGenerator에서 사용)
        if (typeof window !== 'undefined') {
          (window as any).machineryItems = generatedItems;
        }
        
        // sessionStorage에 중기사용목록 저장
        try {
          sessionStore.saveMachineryUsage(generatedItems);
          console.log('중기사용목록 데이터를 sessionStorage에 저장했습니다.', generatedItems.length);
        } catch (error) {
          console.error('중기사용목록 데이터 저장 중 오류:', error);
        }
      }
    } catch (error) {
      console.error('중기사용목록 데이터 로드 중 오류:', error);
      setError('데이터 로드 중 오류가 발생했습니다.');
    }
  }, []);

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold">중기사용목록</h2>
      
      <Card className="w-full">
        <CardHeader className="bg-blue-50 py-3">
          <CardTitle className="text-lg">중기사용목록 데이터</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {items.length > 0 ? (
              <table className="w-full min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 border text-sm font-medium text-center">중기명</th>
                    <th className="px-3 py-2 border text-sm font-medium text-center">재료비</th>
                    <th className="px-3 py-2 border text-sm font-medium text-center">노무비</th>
                    <th className="px-3 py-2 border text-sm font-medium text-center">경비</th>
                    <th className="px-3 py-2 border text-sm font-medium text-center">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 border text-sm">{item.name}</td>
                      <td className="px-3 py-2 border text-sm text-right">{Math.round(item.material).toLocaleString()}</td>
                      <td className="px-3 py-2 border text-sm text-right">{Math.round(item.labor).toLocaleString()}</td>
                      <td className="px-3 py-2 border text-sm text-right">{Math.round(item.expense).toLocaleString()}</td>
                      <td className="px-3 py-2 border text-sm text-right">{Math.round(item.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center">
                <p className="text-gray-500">중기사용목록 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 중기사용료 데이터로부터 중기사용목록 생성 (MachineryTable에서 가공된 데이터 사용)
function createMachineryItemsFromGroupedData(groupedData: any): MachineryItem[] {
  if (!groupedData) {
    console.log('중기사용료 데이터가 없습니다.');
    return [];
  }
  
  const result: MachineryItem[] = [];
  
  // 각 중기 그룹에 대해 처리
  for (const machineName in groupedData) {
    const machineGroup = groupedData[machineName];
    if (!machineGroup || !Array.isArray(machineGroup)) continue;
    
    let materialAmount = 0;
    let laborAmount = 0;
    let expenseAmount = 0;
    
    // 해당 그룹의 항목들 순회하면서 금액 합산
    machineGroup.forEach(item => {
      // 총액이 아닌 항목만 처리 (소계/총계 제외)
      if (item.구분 !== '소계' && item.구분 !== '총계') {
        if (item.구분 === '재료비') {
          // 소숫점 제거하고 숫자만 파싱
          const amount = parseFloat(item.금액) || 0;
          materialAmount += amount;
        } else if (item.구분 === '노무비') {
          const amount = parseFloat(item.금액) || 0;
          laborAmount += amount;
        } else if (item.구분 === '경비') {
          const amount = parseFloat(item.금액) || 0;
          expenseAmount += amount;
        }
      }
    });
    
    // 중기사용목록 항목 생성
    const totalAmount = materialAmount + laborAmount + expenseAmount;
    if (totalAmount > 0) {
      const item: MachineryItem = {
        id: `machine_${result.length + 1}`,
        name: machineName,
        material: materialAmount,
        labor: laborAmount,
        expense: expenseAmount,
        total: totalAmount
      };
      
      result.push(item);
      console.log(`중기사용목록 항목 추가: ${machineName}, 재료비=${materialAmount}, 노무비=${laborAmount}, 경비=${expenseAmount}, 합계=${item.total}`);
    }
  }
  
  return result;
} 