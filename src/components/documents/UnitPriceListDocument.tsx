'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineItem } from '@/store/calculationStore';

interface UnitPriceListDocumentProps {
    items: LineItem[];
}

export default function UnitPriceListDocument({ items }: UnitPriceListDocumentProps) {
    // 공종별로 그룹화
    const groupedItems = items.reduce((acc, item) => {
        const category = item.workCategory || '기타';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, LineItem[]>);

    return (
        <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <Card key={category}>
                    <CardHeader>
                        <CardTitle>{category}</CardTitle>
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
                                {(categoryItems as LineItem[]).map((item, index) => (
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
            ))}
        </div>
    );
} 