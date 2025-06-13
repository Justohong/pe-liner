'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCalculationStore, LineItem } from '@/store/calculationStore';

export default function LaborDataViewer() {
  const { result } = useCalculationStore();
  
  // 노무 데이터 필터링
  const laborItems = result?.lineItems.filter(item => item.type === 'labor') || [];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">노임 데이터</h2>
      
      {laborItems.length === 0 ? (
        <p className="text-gray-500">표시할 노임 데이터가 없습니다.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>직종</TableHead>
              <TableHead>단위</TableHead>
              <TableHead className="text-right">단가</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {laborItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.itemName}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="text-right">{item.unitPrice.toLocaleString()} 원</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
} 