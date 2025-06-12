'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCalculationStore } from '@/store/calculationStore';

export default function ResultPage() {
  const router = useRouter();
  const { result } = useCalculationStore();
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 결과가 없으면 계산기 페이지로 리디렉션
  useEffect(() => {
    if (isClient && !result) {
      router.push('/calculator');
    }
  }, [isClient, result, router]);

  // 결과가 없거나 서버 사이드 렌더링 중이면 로딩 표시
  if (!isClient || !result) {
    return (
      <div className="container mx-auto p-4 md:p-8 text-center">
        <p>결과를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">계산 결과 상세</h1>
        <Button onClick={() => router.push('/calculator')}>계산기로 돌아가기</Button>
      </div>

      <div className="space-y-8">
        {/* 1. 요약 카드 */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle>계산 결과 요약</CardTitle>
            <CardDescription>최종 계산된 공사비 정보입니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">총 공사비</p>
              <p className="font-bold text-xl">{result.totalCost.toLocaleString()} 원</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">재료비</p>
              <p>{result.directMaterialCost.toLocaleString()} 원</p>
              <p className="text-xs text-gray-400">
                ({((result.directMaterialCost / result.totalCost) * 100).toFixed(1)}%)
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">노무비</p>
              <p>{result.directLaborCost.toLocaleString()} 원</p>
              <p className="text-xs text-gray-400">
                ({((result.directLaborCost / result.totalCost) * 100).toFixed(1)}%)
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">장비비</p>
              <p>{result.directEquipmentCost.toLocaleString()} 원</p>
              <p className="text-xs text-gray-400">
                ({((result.directEquipmentCost / result.totalCost) * 100).toFixed(1)}%)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. 상세 내역 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>상세 산출 내역</CardTitle>
            <CardDescription>단위 미터당 투입 자원 및 비용</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>구분</TableHead>
                  <TableHead>품명</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="text-right">단가</TableHead>
                  <TableHead className="text-right">금액 (1m 기준)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.type === 'material' ? '재료비' : item.type === 'labor' ? '노무비' : '장비비'}</TableCell>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.totalPrice.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 3. 할증 내역 */}
        {result.surchargeDetails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>할증 내역</CardTitle>
              <CardDescription>특수 조건에 따른 추가 비용</CardDescription>
            </CardHeader>
            <CardContent>
              {result.surchargeDetails.map((detail, index) => (
                <div key={index} className="flex justify-between p-2 bg-blue-50 rounded mb-2">
                  <p>{detail.description}</p>
                  <p>+ {detail.amount.toLocaleString()} 원</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 