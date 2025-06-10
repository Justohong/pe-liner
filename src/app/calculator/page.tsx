'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CalculationResult } from '@/lib/calculationEngine';

export default function CalculatorPage() {
  // 입력 상태 관리
  const [pipeType, setPipeType] = useState<'steel' | 'ductile'>('ductile');
  const [diameter, setDiameter] = useState<number>(150);
  const [length, setLength] = useState<number>(100);
  const [isRiser, setIsRiser] = useState<boolean>(false);
  
  // 결과 상태 관리
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // 계산 요청 처리
  const handleCalculate = async () => {
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipeType,
          diameter,
          length,
          isRiser,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '계산 중 오류가 발생했습니다.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || '계산 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 숫자 포맷팅 함수
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(value));
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">PE-Liner 공사비 계산기</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* 입력 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>공사 조건 입력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 관종 선택 */}
              <div className="space-y-2">
                <Label htmlFor="pipe-type">관종</Label>
                <Select
                  value={pipeType}
                  onValueChange={(value: 'steel' | 'ductile') => setPipeType(value)}
                >
                  <SelectTrigger id="pipe-type">
                    <SelectValue placeholder="관종 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ductile">주철관</SelectItem>
                    <SelectItem value="steel">강관</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 관경 입력 */}
              <div className="space-y-2">
                <Label htmlFor="diameter">관경 (mm)</Label>
                <Input
                  id="diameter"
                  type="number"
                  min="50"
                  max="2000"
                  value={diameter}
                  onChange={(e) => setDiameter(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* 길이 입력 */}
            <div className="space-y-2">
              <Label htmlFor="length">공사 길이 (m)</Label>
              <Input
                id="length"
                type="number"
                min="1"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* 입상관 여부 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-riser"
                checked={isRiser}
                onCheckedChange={(checked) => setIsRiser(checked === true)}
              />
              <Label htmlFor="is-riser">입상관 (노무비 30% 할증)</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleCalculate} 
              disabled={loading}
              className="w-full"
            >
              {loading ? '계산 중...' : '계산하기'}
            </Button>
          </CardFooter>
        </Card>

        {/* 결과 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>계산 결과</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-md">
                {error}
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-md">
                  <p className="text-lg font-semibold">총 공사비</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatNumber(result.totalCost)}원
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 p-2 rounded-md">
                    <p className="text-sm">직접 재료비</p>
                    <p className="font-semibold">{formatNumber(result.directMaterialCost)}원</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-md">
                    <p className="text-sm">직접 노무비</p>
                    <p className="font-semibold">{formatNumber(result.directLaborCost)}원</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-md">
                    <p className="text-sm">직접 경비</p>
                    <p className="font-semibold">{formatNumber(result.directEquipmentCost)}원</p>
                  </div>
                </div>

                {result.surchargeDetails.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">할증 내역</p>
                    <ul className="space-y-1">
                      {result.surchargeDetails.map((detail, index) => (
                        <li key={index} className="flex justify-between text-sm">
                          <span>{detail.description}</span>
                          <span>{formatNumber(detail.amount)}원</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div>
                  <p className="font-semibold mb-2">세부 내역</p>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-2">품명</th>
                          <th className="text-center p-2">단위</th>
                          <th className="text-center p-2">수량</th>
                          <th className="text-right p-2">단가</th>
                          <th className="text-right p-2">금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.lineItems.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{item.itemName}</td>
                            <td className="text-center p-2">{item.unit}</td>
                            <td className="text-center p-2">{item.quantity}</td>
                            <td className="text-right p-2">{formatNumber(item.unitPrice)}</td>
                            <td className="text-right p-2">{formatNumber(item.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-gray-500 text-center">
                <p>계산 버튼을 클릭하여 결과를 확인하세요.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 