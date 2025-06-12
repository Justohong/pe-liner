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
    const [uploadedData, setUploadedData] = useState<any>(null);
    const [peLinerData, setPeLinerData] = useState<any>(null);
    const [unitPriceGroups, setUnitPriceGroups] = useState<any[]>([]);

    const handleMenuSelect = (menuId: string) => {
        if (menuId === 'cost-calculation' && result) {
            if (confirm('새로운 계산을 시작하시겠습니까? 현재 계산 결과는 초기화됩니다.')) {
                clearResult();
                setActiveMenu(menuId);
            }
        } else if (menuId === 'waterProjectNaraget') {
            setActiveMenu(menuId);
        } else {
            setActiveMenu(menuId);
        }
    };

    const handlePeLinerDataLoad = (result: any) => {
        console.log('PE라이너 데이터:', result);
        setPeLinerData(result);
    };

    const handleUnitPriceGroupsUpdate = (groups: any[]) => {
        console.log('일위대가_호표 그룹 데이터 업데이트:', groups.length);
        setUnitPriceGroups(groups);
    };

    const renderContent = () => {
        const menuLabel = getMenuLabel(activeMenu);
        const title = <h2 className="text-2xl font-bold mb-4">{menuLabel}</h2>;

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
            case 'equipment-base-data':
                return <div>{title}<MachineBaseTable data={uploadedData?.machineBase || []} /></div>;
            case 'unit-price-list':
                return <div>{title}<UnitPriceListTable groups={unitPriceGroups} /></div>;
            case 'unit-price-table-hopyo':
                return <div>{title}<UnitPriceSheetTable data={peLinerData} onGroupsUpdated={handleUnitPriceGroupsUpdate} /></div>;
            case 'equipment-usage-list':
                return <div>{title}<MachineryUsageTable /></div>;
            case 'hopyo-document':
                return <div>{title}<UnitPriceSheetViewer items={result.lineItems} /></div>;
            case 'overhead-data':
            case 'overhead-document':
                return <div>{title}<OverheadViewer items={result.overheadDetails || []} /></div>;
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
