'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MachineBaseTableProps {
  data: any[];
}

export default function MachineBaseTable({ data }: MachineBaseTableProps) {
  // 원본 데이터 출력
  console.log('중기기초자료 원본 데이터:', data);

  // 데이터가 originalData 필드를 갖고 있는지 확인하고 변환
  const processedData = data.map(item => {
    if (item.originalData) {
      return item.originalData;
    }
    return item;
  });
  
  console.log('변환된 중기기초자료 데이터:', processedData);
  
  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold">중기기초자료</h2>
      
      {processedData.length > 0 ? (
        <Card className="w-full">
          <CardHeader className="bg-blue-50 py-3">
            <CardTitle className="text-lg">중기기초자료</CardTitle>
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
                    <th className="px-4 py-2 text-right text-sm font-medium">재료비</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">노무비</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">경비</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {renderMachineBaseRows(processedData)}
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

function renderMachineBaseRows(data: any[]) {
  // 헤더 행은 제외 (일반적으로 첫 번째 행)
  const filteredData = data.filter(item => 
    item['중기기초자료'] !== '명    칭' && 
    item['중기기초자료'] !== undefined
  );
  
  return filteredData.map((item, index) => {
    // 원본 엑셀 데이터의 필드에 맞게 추출
    const name = item['중기기초자료'] || '';
    const spec = item['__EMPTY'] || '';
    const unit = item['__EMPTY_1'] || '';
    const materialCost = item['__EMPTY_2'] || 0;
    const laborCost = item['__EMPTY_3'] || 0;
    const expenseCost = item['__EMPTY_4'] || 0;
    const totalCost = item['__EMPTY_5'] || 0;
    
    return (
      <tr key={index} className="border-b">
        <td className="px-4 py-2 text-sm text-center">{index + 1}</td>
        <td className="px-4 py-2 text-sm">{name}</td>
        <td className="px-4 py-2 text-sm">{spec}</td>
        <td className="px-4 py-2 text-sm">{unit}</td>
        <td className="px-4 py-2 text-sm text-right">{formatNumber(materialCost)}</td>
        <td className="px-4 py-2 text-sm text-right">{formatNumber(laborCost)}</td>
        <td className="px-4 py-2 text-sm text-right">{formatNumber(expenseCost)}</td>
        <td className="px-4 py-2 text-sm text-right font-medium">{formatNumber(totalCost)}</td>
      </tr>
    );
  });
}

function formatNumber(value: any): string {
  if (value === undefined || value === null || value === '') return '';
  return Number(value).toLocaleString('ko-KR');
} 