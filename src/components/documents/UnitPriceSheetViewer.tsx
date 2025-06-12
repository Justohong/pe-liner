'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CalculationResult } from '@/store/calculationStore';

interface UnitPriceSheetViewerProps {
  items: CalculationResult['lineItems'];
}

export default function UnitPriceSheetViewer({ items }: UnitPriceSheetViewerProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">일위대가 호표</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>공종</TableHead>
            <TableHead>품명</TableHead>
            <TableHead>단위</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead className="text-right">단가</TableHead>
            <TableHead className="text-right">금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.workCategory || '기타'}</TableCell>
              <TableCell>{item.itemName}</TableCell>
              <TableCell>{item.unit}</TableCell>
              <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
              <TableCell className="text-right">{item.unitPrice.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.totalPrice.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 