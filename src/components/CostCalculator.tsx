'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRequiredEquipment, getRiserSurchargeRate, EquipmentCombination } from '@/lib/standardCostUtils';

// 관종과 관경 목록 데이터
// 나중에는 이 데이터를 DB에서 불러오거나 별도 파일로 관리할 수 있습니다.
const pipeData = {
  steel: ['D300', 'D350', 'D400', 'D450', 'D500', 'D600', 'D700', 'D800', 'D900', 'D1000', 'D1100', 'D1200'],
  ductile: ['D150', 'D200', 'D250', 'D300', 'D350', 'D400', 'D450', 'D500', 'D600', 'D700', 'D800', 'D900', 'D1000', 'D1100', 'D1200'],
};

export function CostCalculator() {
  // 입력 상태 관리
  const [pipeType, setPipeType] = useState<'steel' | 'ductile'>('ductile');
  const [diameter, setDiameter] = useState<string>('D150');
  const [length, setLength] = useState<number>(100);
  const [isRiser, setIsRiser] = useState<boolean>(false);
  
  // 결과 상태 관리
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<EquipmentCombination | null>(null);

  const handlePipeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPipeType = e.target.value as 'steel' | 'ductile';
    setPipeType(newPipeType);
    // 관종 변경 시 해당 관종의 첫번째 관경으로 초기화
    setDiameter(pipeData[newPipeType][0]);
  };

  const handleSubmit = () => {
    setError(null);
    setResult(null);
    setDetails(null);

    try {
      // 'D150' -> 150 으로 숫자만 추출
      const numericDiameter = parseInt(diameter.replace('D', ''), 10);

      // 1. 표준품셈에 따른 장비 조합 가져오기
      const equipment = getRequiredEquipment(numericDiameter);
      setDetails(equipment);

      // 2. 입상관 할증률 가져오기
      const surchargeRate = getRiserSurchargeRate(isRiser);

      // --- 중요 ---
      // 3. 실제 비용 계산 (현재는 임시 값으로 시뮬레이션)
      // TODO: 이 부분은 향후 DB에서 가져온 실제 단가로 교체해야 합니다.
      const baseMaterialCostPerMeter = 50000; // 예시: 미터당 기본 자재비
      const baseLaborCostPerMeter = 30000;    // 예시: 미터당 기본 노무비
      const airCompressorCost = 500000;       // 예시: 공기압축기 1대당 비용
      const liningMachineCost = 1000000;      // 예시: 라이닝기 1set당 비용
      
      const totalBaseCost = (baseMaterialCostPerMeter + baseLaborCostPerMeter) * length;
      const totalEquipmentCost = (equipment.airCompressor * airCompressorCost) + (equipment.liningMachine * liningMachineCost);
      
      const totalCost = (totalBaseCost + totalEquipmentCost) * surchargeRate;
      
      // 4. 결과 표시
      setResult(`산출된 총 공사비: ${Math.round(totalCost).toLocaleString()} 원`);

    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>PE-Liner 공사비 산출</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-2 gap-4">
          {/* 관종 선택 */}
          <div className="space-y-2">
            <Label htmlFor="pipe-type">관종</Label>
            <select id="pipe-type" value={pipeType} onChange={handlePipeTypeChange} className="w-full p-2 border rounded">
              <option value="ductile">주철관</option>
              <option value="steel">강관</option>
            </select>
          </div>

          {/* 관경 선택 */}
          <div className="space-y-2">
            <Label htmlFor="diameter">관경</Label>
            <select id="diameter" value={diameter} onChange={e => setDiameter(e.target.value)} className="w-full p-2 border rounded">
              {pipeData[pipeType].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 공사 연장 */}
        <div className="space-y-2">
          <Label htmlFor="length">공사 연장 (m)</Label>
          <Input id="length" type="number" value={length} onChange={e => setLength(Number(e.target.value))} placeholder="예: 100" />
        </div>
        
        {/* 입상관 여부 */}
        <div className="flex items-center space-x-2">
            <input type="checkbox" id="is-riser" checked={isRiser} onChange={e => setIsRiser(e.target.checked)} />
            <Label htmlFor="is-riser">입상관 (할증 30% 적용)</Label>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
        <Button onClick={handleSubmit} className="w-full">계산하기</Button>
        {/* 결과 또는 에러 메시지 표시 */}
        {error && <p className="text-red-500">{`오류: ${error}`}</p>}
        {result && (
          <div className="p-4 bg-gray-100 rounded-md w-full">
            <p className="font-bold text-lg">{result}</p>
            {details && (
              <p className="text-sm text-gray-600 mt-2">
                적용 장비: 라이닝기 {details.liningMachine} set, 공기압축기 {details.airCompressor} 대
              </p>
            )}
            {isRiser && <p className="text-sm text-blue-600">입상관 할증 (30%) 적용됨</p>}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}