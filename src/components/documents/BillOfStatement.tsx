'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalculationResult } from '@/store/calculationStore';

interface BillOfStatementProps {
    result: CalculationResult;
}

export default function BillOfStatement({ result }: BillOfStatementProps) {
    if (!result) return null;

    const { totalCost, directMaterialCost, directLaborCost, directEquipmentCost, overheadDetails, costsByCategory } = result;
    const totalDirectCost = directMaterialCost + directLaborCost + directEquipmentCost;
    const totalOverheadCost = overheadDetails?.reduce((sum, item) => sum + item.amount, 0) || 0;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>총괄 내역서</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {/* 공종별 집계 */}
                    <h3 className="font-bold">1. 공종별 집계</h3>
                    <Table>
                        <TableHeader><TableRow><TableHead>공종</TableHead><TableHead className="text-right">금액</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {costsByCategory.map((cost) => (
                                <TableRow key={cost.category}>
                                    <TableCell>{cost.category}</TableCell>
                                    <TableCell className="text-right">{cost.totalCost.toLocaleString()} 원</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* 원가 집계 */}
                    <h3 className="font-bold mt-6">2. 원가 집계</h3>
                    <div className="pl-4 space-y-2">
                      <div className="flex justify-between"><span>- 직접재료비</span><span>{directMaterialCost.toLocaleString()} 원</span></div>
                      <div className="flex justify-between"><span>- 직접노무비</span><span>{directLaborCost.toLocaleString()} 원</span></div>
                      <div className="flex justify-between"><span>- 직접경비(장비)</span><span>{directEquipmentCost.toLocaleString()} 원</span></div>
                      <div className="flex justify-between font-semibold border-t pt-2 mt-2"><p>직접공사비 합계</p><p>{totalDirectCost.toLocaleString()} 원</p></div>
                    </div>

                    <h3 className="font-bold mt-6">3. 간접비 (경비)</h3>
                    <div className="pl-4 space-y-2">
                       {overheadDetails?.map(item => (
                           <div key={item.itemName} className="flex justify-between"><span>- {item.itemName}</span><span>{item.amount.toLocaleString()} 원</span></div>
                       ))}
                       <div className="flex justify-between font-semibold border-t pt-2 mt-2"><p>간접비 합계</p><p>{totalOverheadCost.toLocaleString()} 원</p></div>
                    </div>

                    <hr className="my-4" />
                    <div className="flex justify-between items-center text-xl font-bold text-blue-600">
                        <p>총 공사비 (VAT 별도)</p>
                        <p>{totalCost.toLocaleString()} 원</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 