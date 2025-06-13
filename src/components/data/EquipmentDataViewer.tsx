'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCalculationStore, LineItem } from '@/store/calculationStore';

export default function EquipmentDataViewer() {
  const { result } = useCalculationStore();
  
  // 장비 데이터 필터링
  const equipmentItems = result?.lineItems.filter(item => item.type === 'equipment') || [];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">중기사용료</h2>
      
      {equipmentItems.length === 0 ? (
        <p className="text-gray-500">표시할 장비 데이터가 없습니다.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>장비명</TableHead>
              <TableHead>규격</TableHead>
              <TableHead>단위</TableHead>
              <TableHead className="text-right">단가</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipmentItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.itemName}</TableCell>
                <TableCell>{item.specification || '-'}</TableCell>
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