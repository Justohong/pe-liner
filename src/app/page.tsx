'use client';

import { useState } from 'react';
import { useCalculationStore } from '@/store/calculationStore';
import MenuTree, { menuData } from '@/components/common/MenuTree';
import { CalculatorForm } from '@/components/calculation/CalculatorForm';
import BillOfStatement from '@/components/documents/BillOfStatement';
import UnitPriceSheetViewer from '@/components/documents/UnitPriceSheetViewer';
import OverheadViewer from '@/components/documents/OverheadViewer';
import MaterialTable from '@/components/baseData/MaterialTable';
import LaborTable from '@/components/baseData/LaborTable';

const getMenuLabel = (id: string): string => {
    for (const group of menuData) {
        const menuItem = group.children?.find(child => child.id === id);
        if (menuItem) return menuItem.label;
    }
    return 'Dashboard';
};

export default function Home() {
    const { result, clearResult } = useCalculationStore();
    const [activeMenu, setActiveMenu] = useState<string>('cost-calculation');

    const handleMenuSelect = (menuId: string) => {
        if (menuId === 'cost-calculation' && result) {
            if (confirm('새로운 계산을 시작하시겠습니까? 현재 계산 결과는 초기화됩니다.')) {
                clearResult();
                setActiveMenu(menuId);
            }
        } else {
            setActiveMenu(menuId);
        }
    };

    const renderContent = () => {
        const menuLabel = getMenuLabel(activeMenu);
        const title = <h2 className="text-2xl font-bold mb-4">{menuLabel}</h2>;

        if (activeMenu === 'cost-calculation') {
            return <div>{title}<CalculatorForm /></div>;
        }

        if (!result) {
            return (
                <div className="text-center p-8">
                    {title}
                    <p className="text-gray-500 mt-4">표시할 데이터가 없습니다. '비용계산' 메뉴에서 먼저 계산을 실행해주세요.</p>
                </div>
            );
        }

        switch (activeMenu) {
            case 'bill-of-statement':
                return <div>{title}<BillOfStatement result={result} /></div>;
            case 'unit-price-sheet-hopyo':
                return <div>{title}<UnitPriceSheetViewer items={result.lineItems} /></div>;
            case 'overhead-summary':
                return <div>{title}<OverheadViewer items={result.overheadDetails || []} /></div>;
            case 'material-data':
                return <div>{title}<MaterialTable data={result.lineItems.filter(i => i.type === 'material')} /></div>;
            case 'labor-data':
                return <div>{title}<LaborTable data={result.lineItems.filter(i => i.type === 'labor')} /></div>;
            case 'equipment-data':
                return <div>{title}<MaterialTable data={result.lineItems.filter(i => i.type === 'equipment')} /></div>;
            default:
                return <div>{title}<p>이 페이지는 현재 준비 중입니다.</p></div>;
        }
    };

    return (
        <div className="flex w-full min-h-screen bg-gray-100">
            <MenuTree activeMenu={activeMenu} onMenuSelect={handleMenuSelect} />
            <main className="flex-1 p-8 overflow-auto">
                <div className="bg-white p-6 rounded-lg shadow-md min-h-full">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}
