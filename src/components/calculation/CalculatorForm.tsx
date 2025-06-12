'use client';

import { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCalculationStore } from '@/store/calculationStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BillOfStatement from '@/components/documents/BillOfStatement';

// API 호출 옵션 타입 정의
interface CalculationOptions {
  pipeType: 'steel' | 'ductile';
  diameter: number;
  length: number;
  isRiser: boolean;
}

export function CalculatorForm() {
  // Zustand 스토어에서 상태와 액션 가져오기
  const { result, setCalculationResult } = useCalculationStore();

  // 입력 상태
  const [pipeType, setPipeType] = useState<'steel' | 'ductile'>('ductile');
  const [diameter, setDiameter] = useState<number>(150);
  const [length, setLength] = useState<number>(100);
  const [isRiser, setIsRiser] = useState<boolean>(false);

  // UI 상태
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 디바운스 콜백 함수 생성
  const debouncedApiCall = useDebouncedCallback(async (options: CalculationOptions) => {
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
      
      // 계산 결과를 Zustand 스토어에 저장
      setCalculationResult(calculationResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '계산 중 오류가 발생했습니다.');
      setCalculationResult(null);
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
    <div className="grid gap-6">
      <p className="text-sm text-gray-500">입력값을 변경하면 자동으로 계산됩니다. 계산 완료 후 좌측 메뉴에서 상세 내역을 확인하세요.</p>
      
      {/* --- 입력 폼 --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="pipe-type">관종</Label>
          <select 
            id="pipe-type" 
            value={pipeType} 
            onChange={e => setPipeType(e.target.value as 'steel' | 'ductile')} 
            className="w-full p-2 border rounded"
          >
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
      
      {/* --- 로딩 또는 에러 메시지 --- */}
      <div>
        {loading && <div className="text-center p-4">계산 중...</div>}
        {error && <div className="text-center p-4 text-red-500">오류: {error}</div>}
      </div>

      {/* --- 결과 표시 --- */}
      {result && !loading && (
        <div className="space-y-6">
          {/* 1. 요약 카드 */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle>계산 결과 요약</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div><p className="text-sm text-gray-500">총 공사비</p><p className="font-bold text-xl">{result.totalCost.toLocaleString()} 원</p></div>
              <div><p className="text-sm text-gray-500">재료비</p><p>{result.directMaterialCost.toLocaleString()} 원</p></div>
              <div><p className="text-sm text-gray-500">노무비</p><p>{result.directLaborCost.toLocaleString()} 원</p></div>
              <div><p className="text-sm text-gray-500">장비비</p><p>{result.directEquipmentCost.toLocaleString()} 원</p></div>
            </CardContent>
          </Card>

          {/* 탭 컴포넌트 추가 */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">상세 내역</TabsTrigger>
              <TabsTrigger value="statement">내역서</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-6">
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

              {/* 4. 간접비(경비) 내역 */}
              {result.overheadDetails && result.overheadDetails.length > 0 && (
                <div>
                  <h3 className="font-bold mb-2">간접비(경비) 내역</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>항목</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.overheadDetails.map((detail, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{detail.itemName}</TableCell>
                          <TableCell className="text-right">{detail.amount.toLocaleString()} 원</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 font-medium">
                        <TableCell>총 간접비</TableCell>
                        <TableCell className="text-right">{result.totalOverheadCost.toLocaleString()} 원</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            <TabsContent value="statement">
              <BillOfStatement result={result} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
} 