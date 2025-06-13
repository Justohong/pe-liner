'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatNumber = (num: number) => num ? Math.round(num).toLocaleString() : '0';

interface LineItem {
    itemName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    type: 'material' | 'labor' | 'equipment';
    workCategory?: string;
}

interface UnitPriceSheetViewerProps {
    items: LineItem[];
}

export default function UnitPriceSheetViewer({ items }: UnitPriceSheetViewerProps) {
    if (!items || items.length === 0) return <p>표시할 데이터가 없습니다.</p>;

    const groupedItems = items.reduce<Record<string, LineItem[]>>((acc, item) => {
        const category = item.workCategory || '기타';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {});

    const categoryOrder = ["토공", "가시설공", "관접합공", "비굴착갱생공", "포장공", "사급자재비", "부대공"];
    const sortedCategories = Object.entries(groupedItems).sort(([a], [b]) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return (
        <div className="space-y-6">
            {sortedCategories.map(([category, categoryItems]) => {
                const items = categoryItems as LineItem[];
                const subtotal = items.reduce((sum: number, item: LineItem) => sum + item.totalPrice, 0);
                return (
                    <div key={category}>
                        <h3 className="text-lg font-bold mb-2 bg-gray-100 p-2 rounded">{category}</h3>
                        <Table>
                            <TableHeader><TableRow><TableHead>품명</TableHead><TableHead>단위</TableHead><TableHead className="text-right">수량</TableHead><TableHead className="text-right">단가</TableHead><TableHead className="text-right">금액</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {items.map((item: LineItem, index: number) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.itemName}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(item.unitPrice)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(item.totalPrice)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="font-bold bg-gray-50">
                                    <TableCell colSpan={4} className="text-right">소계</TableCell>
                                    <TableCell className="text-right">{formatNumber(subtotal)} 원</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                );
            })}
        </div>
    );
} 