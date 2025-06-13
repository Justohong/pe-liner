'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineItem } from '@/store/calculationStore';

interface EquipmentUsageListDocumentProps {
    items: LineItem[];
}

export default function EquipmentUsageListDocument({ items }: EquipmentUsageListDocumentProps) {
    // 장비 항목만 필터링
    const equipmentItems = items.filter(item => item.type === 'equipment');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>중기 사용 목록</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>품명</TableHead>
                                <TableHead>규격</TableHead>
                                <TableHead className="text-right">단위</TableHead>
                                <TableHead className="text-right">수량</TableHead>
                                <TableHead className="text-right">단가</TableHead>
                                <TableHead className="text-right">금액</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {equipmentItems.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.name || item.itemName}</TableCell>
                                    <TableCell>{item.specification || ''}</TableCell>
                                    <TableCell className="text-right">{item.unit}</TableCell>
                                    <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{item.unitPrice.toLocaleString()} 원</TableCell>
                                    <TableCell className="text-right">{(item.quantity * item.unitPrice).toLocaleString()} 원</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
} 