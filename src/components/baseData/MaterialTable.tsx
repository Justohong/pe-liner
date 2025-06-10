'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MaterialTableProps {
  data: any[];
}

export default function MaterialTable({ data }: MaterialTableProps) {
  // 원본 데이터 출력
  console.log('자재 데이터 원본:', data);

  // 데이터가 originalData 필드를 갖고 있는지 확인하고 변환
  const processedData = data.map(item => {
    if (item.originalData) {
      return item.originalData;
    }
    return item;
  });
  
  console.log('변환된 자재 데이터:', processedData);
  
  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold">자재</h2>
      
      {processedData.length > 0 ? (
        <Card className="w-full">
          <CardHeader className="bg-blue-50 py-3">
            <CardTitle className="text-lg">자재</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-2 text-center text-sm font-medium">No</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">명칭</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">규격</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">단위</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">단가</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {renderMaterialRows(processedData)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="p-4 bg-red-50 border border-red-200 rounded w-full">
          <p className="text-red-600">데이터가 없거나 형식이 올바르지 않습니다.</p>
        </div>
      )}
    </div>
  );
}

function renderMaterialRows(data: any[]) {
  // 헤더 행은 제외 (일반적으로 첫 번째 행)
  const filteredData = data.filter(item => 
    item['자재'] !== '명    칭' && 
    item['자재'] !== undefined
  );
  
  return filteredData.map((item, index) => {
    // 원본 엑셀 데이터의 필드에 맞게 추출
    const name = item['자재'] || '';
    const spec = item['__EMPTY'] || '';
    const unit = item['__EMPTY_1'] || '';
    const price = item['__EMPTY_2'] || 0;
    const note = item['__EMPTY_3'] || '';
    
    return (
      <tr key={index} className="border-b">
        <td className="px-4 py-2 text-sm text-center">{index + 1}</td>
        <td className="px-4 py-2 text-sm">{name}</td>
        <td className="px-4 py-2 text-sm">{spec}</td>
        <td className="px-4 py-2 text-sm">{unit}</td>
        <td className="px-4 py-2 text-sm text-right">{formatNumber(price)}</td>
        <td className="px-4 py-2 text-sm">{note}</td>
      </tr>
    );
  });
}

function formatNumber(value: any): string {
  if (value === undefined || value === null || value === '') return '';
  return Number(value).toLocaleString('ko-KR');
} 