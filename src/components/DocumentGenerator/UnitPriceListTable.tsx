'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sessionStore } from '@/utils/sessionStore';
import type { GroupData } from '@/components/quantityData/UnitPriceSheetTable';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface UnitPriceListTableProps {
  groups?: GroupData[]; // 일위대가_호표에서 전달받은 그룹 데이터
}

export default function UnitPriceListTable({ groups }: UnitPriceListTableProps) {
  const [groupData, setGroupData] = useState<GroupData[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 컴포넌트 마운트 시 그룹 데이터 로드
  useEffect(() => {
    if (!groups || groups.length === 0) {
      // props로 전달된 데이터가 없는 경우, sessionStorage에서 로드 시도
      try {
        const storedGroups = sessionStore.getUnitPriceGroups();
        if (storedGroups) {
          console.log('sessionStorage에서 일위대가 그룹 데이터 로드:', storedGroups.length);
          setGroupData(storedGroups);
        } else {
          setError('일위대가 데이터가 없습니다. 수량정보 > 일위대가 메뉴에서 먼저 데이터를 확인해주세요.');
        }
      } catch (error) {
        console.error('그룹 데이터 로드 오류:', error);
        setError('데이터 로드 중 오류가 발생했습니다.');
      }
    } else {
      // props로 전달된 데이터가 있는 경우 사용
      setGroupData(groups);
    }
  }, [groups]);

  // 세션 데이터 초기화 함수
  const resetGroupData = () => {
    // 일위대가 그룹 데이터 초기화
    sessionStore.clearSessionData();
    setGroupData([]);
    alert('일위대가 그룹 데이터가 초기화되었습니다.');
  };

  // 데이터가 없으면 메시지 표시
  if (groupData.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">일위대가목록</h2>
        <div className="p-4 bg-amber-50 text-amber-800 rounded border border-amber-200">
          <p>일위대가_호표 데이터가 없습니다. 먼저 PE라이너 데이터 업로드 메뉴에서 엑셀 파일을 업로드한 후, 일위대가_호표 메뉴를 열어주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">일위대가목록</h2>
      
      <Card>
        <CardHeader className="bg-blue-50 py-3">
          <CardTitle className="text-lg">일위대가목록 데이터</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 border text-sm font-medium text-center">No</th>
                <th className="px-3 py-2 border text-sm font-medium text-center">공종</th>
                <th className="px-3 py-2 border text-sm font-medium text-center">규격</th>
                <th className="px-3 py-2 border text-sm font-medium text-center">단위</th>
                <th className="px-3 py-2 border text-sm font-medium text-center">재료비</th>
                <th className="px-3 py-2 border text-sm font-medium text-center">노무비</th>
                <th className="px-3 py-2 border text-sm font-medium text-center">경비</th>
                <th className="px-3 py-2 border text-sm font-medium text-center">합계</th>
              </tr>
            </thead>
            <tbody>
              {renderGroupRows(groupData)}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// 그룹 데이터 행 렌더링
function renderGroupRows(groups: GroupData[]) {
  if (!groups || groups.length === 0) return null;

  return groups.map((group, index) => {
    // 행의 스타일
    const rowStyle = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
    
    // 숫자 포맷팅 함수
    const formatNumber = (value: number) => {
      if (value === 0) return '';
      return Math.round(value).toLocaleString('ko-KR');
    };

    return (
      <tr key={index} className={`${rowStyle} hover:bg-gray-100 transition-colors`}>
        <td className="px-3 py-2 border text-sm text-center">{index + 1}</td>
        <td className="px-3 py-2 border text-sm font-semibold text-left">{group.공종명}</td>
        <td className="px-3 py-2 border text-sm text-left">{group.규격}</td>
        <td className="px-3 py-2 border text-sm text-center">{group.단위}</td>
        <td className="px-3 py-2 border text-sm text-right">{formatNumber(group.재료비금액)}</td>
        <td className="px-3 py-2 border text-sm text-right">{formatNumber(group.노무비금액)}</td>
        <td className="px-3 py-2 border text-sm text-right">{formatNumber(group.경비금액)}</td>
        <td className="px-3 py-2 border text-sm text-right font-medium">{formatNumber(group.합계금액)}</td>
      </tr>
    );
  });
} 