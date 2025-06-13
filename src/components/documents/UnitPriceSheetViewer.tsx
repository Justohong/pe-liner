'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Fragment } from 'react';
import { CalculationResult } from '@/store/calculationStore';

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
            {Object.entries(groupedItems).map(([category, categoryItems]) => {
                const subtotal = categoryItems.reduce((sum, item) => sum + item.totalPrice, 0);
                return (
                    <div key={category}>
                        <h3 className="text-lg font-bold mb-2 bg-gray-100 p-2 rounded">{category}</h3>
                        <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>품명</TableHead><TableHead>단위</TableHead>
                                <TableHead className="text-right">수량</TableHead><TableHead className="text-right">단가</TableHead><TableHead className="text-right">금액</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categoryItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.itemName}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{item.unitPrice.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{item.totalPrice.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="font-bold bg-gray-50">
                                    <TableCell colSpan={4} className="text-right">소계</TableCell>
                                    <TableCell className="text-right">{subtotal.toLocaleString()} 원</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                );
            })}
        </div>
    );
} 