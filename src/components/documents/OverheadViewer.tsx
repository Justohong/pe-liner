'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CalculationResult } from '@/store/calculationStore';

interface OverheadViewerProps {
  items: CalculationResult['overheadDetails'];
}

export default function OverheadViewer({ items }: OverheadViewerProps) {
  // 총 간접비 계산
  const totalOverhead = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">경비 내역</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>항목명</TableHead>
            <TableHead className="text-right">금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.itemName}</TableCell>
              <TableCell className="text-right">{item.amount.toLocaleString()} 원</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-gray-100 font-medium">
            <TableCell>합계</TableCell>
            <TableCell className="text-right">{totalOverhead.toLocaleString()} 원</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
} 