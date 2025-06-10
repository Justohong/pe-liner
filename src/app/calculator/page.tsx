'use client';

import { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// API 응답 결과에 대한 상세 타입을 정의합니다.
interface CalculationResult {
  totalCost: number;
  directMaterialCost: number;
  directLaborCost: number;
  directEquipmentCost: number;
  surchargeDetails: { description: string; amount: number }[];
  lineItems: {
    itemName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    type: 'material' | 'labor' | 'equipment';
  }[];
}

export default function CalculatorPage() {
  // 입력 상태
  const [pipeType, setPipeType] = useState<'steel' | 'ductile'>('ductile');
  const [diameter, setDiameter] = useState<number>(150);
  const [length, setLength] = useState<number>(100);
  const [isRiser, setIsRiser] = useState<boolean>(false);

  // 결과 상태
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 디바운스 콜백 함수 생성
  const debouncedApiCall = useDebouncedCallback(async (options) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '계산 중 오류가 발생했습니다.');
      }
      const calculationResult = await response.json();
      setResult(calculationResult);
    } catch (e: any) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, 500); // 사용자가 입력을 멈추고 500ms 후에 API 호출

  // 입력값 변경 감지 및 API 호출
  useEffect(() => {
    if (diameter > 0 && length > 0) {
      const options = { pipeType, diameter, length, isRiser };
      debouncedApiCall(options);
    }
  }, [pipeType, diameter, length, isRiser, debouncedApiCall]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">PE-Liner 공사비 자동 산출</CardTitle>
          <CardDescription>입력값을 변경하면 자동으로 계산됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {/* --- 입력 폼 --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="pipe-type">관종</Label>
              <select id="pipe-type" value={pipeType} onChange={e => setPipeType(e.target.value as any)} className="w-full p-2 border rounded">
                <option value="ductile">주철관</option>
                <option value="steel">강관</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diameter">관경 (mm)</Label>
              <Input id="diameter" type="number" value={diameter} onChange={e => setDiameter(Number(e.target.value))} placeholder="예: 150" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="length">공사 연장 (m)</Label>
              <Input id="length" type="number" value={length} onChange={e => setLength(Number(e.target.value))} placeholder="예: 100" />
            </div>
            <div className="flex items-center h-10 space-x-2">
              <input type="checkbox" id="is-riser" checked={isRiser} onChange={e => setIsRiser(e.target.checked)} className="h-4 w-4" />
              <Label htmlFor="is-riser">입상관 (노무비 할증)</Label>
            </div>
          </div>
          
          {/* --- 결과 표시 --- */}
          <div className="mt-4">
            {loading && <div className="text-center p-4">계산 중...</div>}
            {error && <div className="text-center p-4 text-red-500">오류: {error}</div>}
            {result && !loading && (
              <div className="space-y-6">
                {/* 1. 요약 카드 */}
                <Card className="bg-gray-50">
                  <CardHeader><CardTitle>계산 결과 요약</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div><p className="text-sm text-gray-500">총 공사비</p><p className="font-bold text-xl">{result.totalCost.toLocaleString()} 원</p></div>
                    <div><p className="text-sm text-gray-500">재료비</p><p>{result.directMaterialCost.toLocaleString()} 원</p></div>
                    <div><p className="text-sm text-gray-500">노무비</p><p>{result.directLaborCost.toLocaleString()} 원</p></div>
                    <div><p className="text-sm text-gray-500">장비비</p><p>{result.directEquipmentCost.toLocaleString()} 원</p></div>
                  </CardContent>
                </Card>

                {/* 2. 상세 내역 테이블 */}
                <div>
                  <h3 className="font-bold mb-2">상세 산출 내역</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>구분</TableHead>
                        <TableHead>품명</TableHead>
                        <TableHead className="text-right">수량</TableHead>
                        <TableHead className="text-right">단가</TableHead>
                        <TableHead className="text-right">금액 (1m 기준)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.lineItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.type === 'material' ? '재료비' : item.type === 'labor' ? '노무비' : '장비비'}</TableCell>
                          <TableCell>{item.itemName}</TableCell>
                          <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.unitPrice.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{item.totalPrice.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 3. 할증 내역 */}
                {result.surchargeDetails.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-2">할증 내역</h3>
                    {result.surchargeDetails.map((detail, index) => (
                      <div key={index} className="flex justify-between p-2 bg-blue-50 rounded">
                        <p>{detail.description}</p>
                        <p>+ {detail.amount.toLocaleString()} 원</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 