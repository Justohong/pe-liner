'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CalculationResult, CategoryCost } from '@/store/calculationStore';

interface BillOfStatementProps {
  result: CalculationResult;
}

export default function BillOfStatement({ result }: BillOfStatementProps) {
  const { 
    totalCost, 
    directMaterialCost, 
    directLaborCost, 
    directEquipmentCost,
    totalOverheadCost, 
    overheadDetails,
    surchargeDetails,
    costsByCategory
  } = result;

  const totalDirectCost = directMaterialCost + directLaborCost + directEquipmentCost;
  const totalSurchargeCost = surchargeDetails.reduce((sum: number, detail: { description: string; amount: number }) => sum + detail.amount, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl text-center">내 역 서</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* 공종별 비용 표시 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">공종별 비용</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">공종</th>
                <th className="border p-2 text-right">재료비</th>
                <th className="border p-2 text-right">노무비</th>
                <th className="border p-2 text-right">장비비</th>
                <th className="border p-2 text-right">합계</th>
              </tr>
            </thead>
            <tbody>
              {costsByCategory.map((category: CategoryCost, index: number) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border p-2 font-medium">{category.category}</td>
                  <td className="border p-2 text-right">{category.materialCost.toLocaleString()} 원</td>
                  <td className="border p-2 text-right">{category.laborCost.toLocaleString()} 원</td>
                  <td className="border p-2 text-right">{category.equipmentCost.toLocaleString()} 원</td>
                  <td className="border p-2 text-right font-semibold">{category.totalCost.toLocaleString()} 원</td>
                </tr>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td className="border p-2">합계</td>
                <td className="border p-2 text-right">{directMaterialCost.toLocaleString()} 원</td>
                <td className="border p-2 text-right">{directLaborCost.toLocaleString()} 원</td>
                <td className="border p-2 text-right">{directEquipmentCost.toLocaleString()} 원</td>
                <td className="border p-2 text-right">{totalDirectCost.toLocaleString()} 원</td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr className="my-4" />

        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-semibold">1. 총 직접 공사비</span>
          <span className="font-semibold">{totalDirectCost.toLocaleString()} 원</span>
        </div>
        <div className="pl-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500"> ◦ 직접재료비</span>
            <span>{directMaterialCost.toLocaleString()} 원</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500"> ◦ 직접노무비</span>
            <span>{directLaborCost.toLocaleString()} 원</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500"> ◦ 직접공사경비(장비)</span>
            <span>{directEquipmentCost.toLocaleString()} 원</span>
          </div>
        </div>

        {surchargeDetails.length > 0 && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-semibold">2. 할증 비용</span>
              <span className="font-semibold">{totalSurchargeCost.toLocaleString()} 원</span>
            </div>
            <div className="pl-4 space-y-2">
              {surchargeDetails.map((detail: { description: string; amount: number }, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-500"> ◦ {detail.description}</span>
                  <span>{detail.amount.toLocaleString()} 원</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-semibold">{surchargeDetails.length > 0 ? '3' : '2'}. 간접 공사비 (경비)</span>
          <span className="font-semibold">{totalOverheadCost.toLocaleString()} 원</span>
        </div>
        
        {overheadDetails && overheadDetails.length > 0 && (
          <div className="pl-4 space-y-2">
            {overheadDetails.map((detail: { itemName: string; amount: number }, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-500"> ◦ {detail.itemName}</span>
                <span>{detail.amount.toLocaleString()} 원</span>
              </div>
            ))}
          </div>
        )}

        <hr className="my-4" />

        <div className="flex justify-between items-center text-xl font-bold">
          <span>총 공사비 (VAT 별도)</span>
          <span>{totalCost.toLocaleString()} 원</span>
        </div>
      </CardContent>
    </Card>
  );
} 