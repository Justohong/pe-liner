'use client';
import { useEffect } from 'react';
import MenuTree, { menuData } from '@/components/common/MenuTree';
import { CalculatorForm } from '@/components/calculation/CalculatorForm';
import BillOfStatement from '@/components/documents/BillOfStatement';
import UnitPriceSheetViewer from '@/components/documents/UnitPriceSheetViewer';
import OverheadViewer from '@/components/documents/OverheadViewer';
import MaterialDataViewer from '@/components/data/MaterialDataViewer';
import LaborDataViewer from '@/components/data/LaborDataViewer';
import EquipmentDataViewer from '@/components/data/EquipmentDataViewer';
import { useCalculationStore } from '@/store/calculationStore';
import { useMenuStore } from '@/store/menuStore';

/**
 * 메뉴 ID에 해당하는 레이블을 반환하는 함수
 */
function getMenuLabel(id: string): string {
  // 모든 메뉴 아이템을 평면화하여 ID로 검색
  const flattenMenuItems = (items: any[]): any[] => {
    return items.reduce((acc, item) => {
      acc.push(item);
      if (item.children) {
        acc.push(...flattenMenuItems(item.children));
      }
      return acc;
    }, []);
  };

  const allItems = flattenMenuItems(menuData);
  const menuItem = allItems.find(item => item.id === id);
  return menuItem ? menuItem.label : id;
}

export default function Home() {
  const { result } = useCalculationStore();
  const { activeMenu, setActiveMenu } = useMenuStore();

  const handleMenuSelect = (menuId: string) => {
    setActiveMenu(menuId);
  };

  /**
   * 선택된 메뉴에 따라 적절한 컴포넌트를 렌더링하는 함수
   */
  const renderContent = () => {
    if (!activeMenu) return null;

    // 계산 결과가 필요한 메뉴 아이템들
    const resultRequiredMenus = [
      'bill-of-statement',
      'unit-price-sheet-hopyo',
      'overhead-summary'
    ];

    // 계산 결과가 필요하지만 결과가 없는 경우 안내 메시지 표시
    if (resultRequiredMenus.includes(activeMenu) && !result) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-lg text-gray-500">계산 결과가 없습니다. 먼저 비용 계산을 실행해주세요.</p>
        </div>
      );
    }

    // 선택된 메뉴에 따라 컴포넌트 렌더링
    switch (activeMenu) {
      case 'cost-calculation':
        return <CalculatorForm />;
      
      case 'bill-of-statement':
        return result && <BillOfStatement result={result} />;
      
      case 'unit-price-sheet-hopyo':
        return result && <UnitPriceSheetViewer items={result.lineItems} />;
      
      case 'overhead-summary':
        return result && <OverheadViewer items={result.overheadDetails || []} />;
      
      case 'material-data':
        return <MaterialDataViewer />;
      
      case 'labor-data':
        return <LaborDataViewer />;
      
      case 'equipment-data':
        return <EquipmentDataViewer />;
      
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-lg text-gray-500">선택된 메뉴: {getMenuLabel(activeMenu)}</p>
            <p className="text-sm text-gray-400">해당 메뉴는 준비 중입니다.</p>
          </div>
        );
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        <MenuTree activeMenu={activeMenu} onMenuSelect={handleMenuSelect} />
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{getMenuLabel(activeMenu)}</h1>
          </div>
          <div className="bg-white rounded-lg shadow p-6 min-h-[calc(100vh-12rem)]">
            {renderContent()}
          </div>
        </div>
      </div>
    </main>
  );
}
