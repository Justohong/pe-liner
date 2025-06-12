'use client';

import { useState } from 'react';
import { useCalculationStore } from '@/store/calculationStore';
import MenuTree, { menuData } from '@/components/common/MenuTree';
import { CalculatorForm } from '@/components/calculation/CalculatorForm';
import MaterialTable from '@/components/baseData/MaterialTable';
import LaborTable from '@/components/baseData/LaborTable';
import MachineryTable from '@/components/quantityData/MachineryTable';
import UnitPriceSheetTable from '@/components/quantityData/UnitPriceSheetTable';
import UnitPriceListTable from '@/components/DocumentGenerator/UnitPriceListTable';
import MachineryUsageTable from '@/components/DocumentGenerator/MachineryUsageTable';
import PriceDocumentGenerator from '@/components/DocumentGenerator/PriceDocumentGenerator';
import NaragetTable from '@/components/waterProject/NaragetTable';
import MachineBaseTable from '@/components/baseData/MachineBaseTable';
import DataUploader from '@/components/quantityData/DataUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// 메뉴 ID에서 라벨을 가져오는 헬퍼 함수
const getMenuLabel = (id: string): string => {
  for (const group of menuData) {
    if (group.id === id) return group.label;
    if (group.children) {
      const menuItem = group.children.find(child => child.id === id);
      if (menuItem) return menuItem.label;
    }
  }
  return '페이지';
};

export default function Home() {
  const { result, clearResult } = useCalculationStore();
  // 기본 메뉴를 비용계산으로 설정
  const [activeMenu, setActiveMenu] = useState<string>('cost-calculation');
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [peLinerData, setPeLinerData] = useState<any>(null);
  const [unitPriceGroups, setUnitPriceGroups] = useState<any[]>([]);

  const handleMenuSelect = (menuId: string) => {
    // '비용계산' 메뉴를 다시 누를 때, 새로운 계산을 시작할지 묻는 로직
    if (menuId === 'cost-calculation' && result) {
      if (confirm('새로운 계산을 시작하시겠습니까? 현재 계산 결과는 사라집니다.')) {
        clearResult();
        setActiveMenu(menuId);
      }
    } else if (menuId === 'waterProjectNaraget') {
      // 기존 상수도공사 발주계획 메뉴 유지
      setActiveMenu(menuId);
    } else {
      setActiveMenu(menuId);
    }
  };

  // PE라이너 데이터 처리 함수
  const handlePeLinerDataLoad = (result: any) => {
    console.log('PE라이너 데이터:', result);
    setPeLinerData(result);
  };

  // 일위대가_호표 그룹 데이터 업데이트 핸들러
  const handleUnitPriceGroupsUpdate = (groups: any[]) => {
    console.log('일위대가_호표 그룹 데이터 업데이트:', groups.length);
    setUnitPriceGroups(groups);
  };

  const renderContent = () => {
    const menuLabel = getMenuLabel(activeMenu);

    // 상수도공사 발주계획 - 나라장터 메뉴 처리
    if (activeMenu === 'waterProjectNaraget') {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">나라장터</CardTitle>
          </CardHeader>
          <CardContent>
            <NaragetTable />
          </CardContent>
        </Card>
      );
    }

    // PE라이너 비용계산 메뉴 처리
    if (activeMenu === 'cost-calculation') {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">PE-Liner 공사비 자동 산출</CardTitle>
          </CardHeader>
          <CardContent>
            <CalculatorForm />
          </CardContent>
        </Card>
      );
    }

    // 계산 결과가 없는 상태에서 다른 메뉴 선택 시
    if (!result && activeMenu !== 'waterProjectNaraget') {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">{menuLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8">
              <p className="text-gray-600 mb-4">표시할 데이터가 없습니다.</p>
              <p className="text-gray-500 mb-6">먼저 'PE라이너 비용계산 &gt; 비용계산' 메뉴에서 공사비를 계산해주세요.</p>
              <Button onClick={() => setActiveMenu('cost-calculation')} className="bg-blue-600 hover:bg-blue-700">
                비용계산 시작하기
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // 계산 결과가 있을 때 각 메뉴에 맞는 데이터 표시
    switch (activeMenu) {
      case 'material-data':
        // 자재데이터 메뉴
        const materialData = result?.lineItems.filter(item => item.type === 'material') || [];
        if (materialData.length > 0) {
          // 자재 데이터를 MaterialTable 형식에 맞게 변환
          const formattedData = materialData.map(item => ({
            '자재': item.itemName,
            '__EMPTY': '', // 규격
            '__EMPTY_1': item.unit, // 단위
            '__EMPTY_2': item.unitPrice, // 단가
            '__EMPTY_3': '', // 비고
            'quantity': item.quantity,
            'totalPrice': item.totalPrice
          }));
          return (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-2xl">{menuLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <MaterialTable data={formattedData} />
              </CardContent>
            </Card>
          );
        }
        break;
        
      case 'labor-data':
        // 노임데이터 메뉴
        const laborData = result?.lineItems.filter(item => item.type === 'labor') || [];
        if (laborData.length > 0) {
          // 노무비 데이터를 LaborTable 형식에 맞게 변환
          const formattedData = laborData.map(item => ({
            '노임': item.itemName,
            '__EMPTY': '', // 규격
            '__EMPTY_1': item.unit, // 단위
            '__EMPTY_2': item.unitPrice, // 단가
            '__EMPTY_3': '', // 비고
            'quantity': item.quantity,
            'totalPrice': item.totalPrice
          }));
          return (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-2xl">{menuLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <LaborTable data={formattedData} />
              </CardContent>
            </Card>
          );
        }
        break;
        
      case 'equipment-usage-fee':
        // 중기사용료 메뉴
        const equipmentData = result?.lineItems.filter(item => item.type === 'equipment') || [];
        if (equipmentData.length > 0) {
          // 장비비 데이터를 MachineryTable 형식에 맞게 변환
          const formattedData = equipmentData.map(item => ({
            '중기사용료': item.itemName,
            '__EMPTY': '', // 규격
            '__EMPTY_1': item.unit, // 단위
            '__EMPTY_2': item.unitPrice, // 단가
            '__EMPTY_3': '', // 비고
            'quantity': item.quantity,
            'totalPrice': item.totalPrice
          }));
          return (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-2xl">{menuLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <MachineryTable data={formattedData} />
              </CardContent>
            </Card>
          );
        }
        break;
        
      case 'equipment-base-data':
        // 중기기초자료 메뉴
        return (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl">{menuLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <MachineBaseTable data={uploadedData?.machineBase || []} />
            </CardContent>
          </Card>
        );
        
      case 'unit-price-list':
        // 일위대가 목록 메뉴
        return (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl">{menuLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <UnitPriceListTable groups={unitPriceGroups} />
            </CardContent>
          </Card>
        );
        
      case 'unit-price-table-hopyo':
        // 일위대가 호표 메뉴
        return (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl">{menuLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              {peLinerData ? (
                <UnitPriceSheetTable 
                  data={peLinerData} 
                  onGroupsUpdated={handleUnitPriceGroupsUpdate}
                />
              ) : (
                <div className="text-center p-4">
                  <p className="text-gray-600">표시할 일위대가 호표 데이터가 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
        
      case 'equipment-usage-list':
        // 중기사용목록 메뉴
        return (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl">{menuLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <MachineryUsageTable />
            </CardContent>
          </Card>
        );
        
      default:
        return (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl">{menuLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-4">
                <p className="text-gray-600">이 페이지는 준비 중입니다.</p>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-700">PE 라이너 관리 시스템</h1>
          <div className="text-sm text-gray-500">v0.3.0</div>
        </div>
      </header>
      
      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 메뉴 */}
        <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
          <div className="p-3 h-full">
            <MenuTree onMenuSelect={handleMenuSelect} activeMenu={activeMenu} />
          </div>
        </aside>
        
        {/* 콘텐츠 영역 */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 w-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
