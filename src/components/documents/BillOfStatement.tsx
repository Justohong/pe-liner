'use client';
import { Fragment } from 'react';

// 숫자를 쉼표 포맷으로 변환하는 헬퍼 함수
const formatNumber = (num: number) => num ? Math.round(num).toLocaleString() : '0';

interface CategoryCost {
    category: string;
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    totalCost: number;
}

interface BillOfStatementProps {
    result: {
        costsByCategory: CategoryCost[];
        lineItems: any[];
        directMaterialCost: number;
        directLaborCost: number;
        directEquipmentCost: number;
        totalOverheadCost: number;
        overheadDetails: { itemName: string; amount: number }[];
        totalCost: number;
    };
}

export default function BillOfStatement({ result }: BillOfStatementProps) {
    if (!result?.costsByCategory) return <p>내역서 데이터를 표시할 정보가 부족합니다.</p>;

    const { 
        costsByCategory, 
        directMaterialCost, 
        directLaborCost, 
        directEquipmentCost, 
        totalOverheadCost, 
        overheadDetails,
        totalCost 
    } = result;
    
    const totalDirectCost = directMaterialCost + directLaborCost + directEquipmentCost;

    // 엑셀의 주요 공종 순서를 정의합니다.
    const categoryOrder = [
        "토공", "가시설공", "관접합공", "관 갱생공", "비굴착갱생공", "포장공", "사급자재비", "부대공"
    ];

    // 배열을 정렬
    const sortedCategories = [...costsByCategory].sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.category);
        const indexB = categoryOrder.indexOf(b.category);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return (
        <div className="font-mono p-2 text-sm">
            <div className="border p-4 space-y-3">
                {/* 직접공사비 헤더 */}
                <div className="flex justify-between font-bold text-base bg-gray-200 p-2 rounded-t-md">
                    <span>1. 직접공사비</span>
                    <span>{formatNumber(totalDirectCost)} 원</span>
                </div>
                
                {/* 직접공사비 상세 - 자재비, 노무비, 장비비 합계 */}
                <div className="pl-4 py-1 border-b border-gray-300">
                    <div className="grid grid-cols-4 gap-2 text-sm font-medium bg-gray-100 p-1">
                        <span className="col-span-1">구분</span>
                        <span className="text-right">자재비</span>
                        <span className="text-right">노무비</span>
                        <span className="text-right">장비비</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm p-1 border-b border-gray-200">
                        <span className="col-span-1">합계</span>
                        <span className="text-right">{formatNumber(directMaterialCost)} 원</span>
                        <span className="text-right">{formatNumber(directLaborCost)} 원</span>
                        <span className="text-right">{formatNumber(directEquipmentCost)} 원</span>
                    </div>
                </div>
                
                {/* 공종별 비용 상세 */}
                {sortedCategories.map((costs) => {
                    const categoryTotal = costs.materialCost + costs.laborCost + costs.equipmentCost;
                    if (categoryTotal === 0) return null;
                    return (
                        <div key={costs.category} className="pl-4 py-1 border-b border-gray-200">
                            <div className="flex justify-between font-semibold">
                                <span>- {costs.category}</span>
                                <span>{formatNumber(categoryTotal)} 원</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-xs pl-4 mt-1">
                                <span className="col-span-1">내역</span>
                                <span className="text-right">{formatNumber(costs.materialCost)} 원</span>
                                <span className="text-right">{formatNumber(costs.laborCost)} 원</span>
                                <span className="text-right">{formatNumber(costs.equipmentCost)} 원</span>
                            </div>
                        </div>
                    );
                })}
                
                {/* 간접공사비(경비) 헤더 */}
                <div className="flex justify-between font-bold text-base bg-gray-200 p-2 mt-4">
                    <span>2. 간접공사비 (경비)</span>
                    <span>{formatNumber(totalOverheadCost)} 원</span>
                </div>
                
                {/* 간접비 상세 내역 */}
                <div className="pl-4 py-1">
                    <div className="grid grid-cols-2 gap-2 text-sm font-medium bg-gray-100 p-1">
                        <span>항목</span>
                        <span className="text-right">금액</span>
                    </div>
                    {overheadDetails.map((item, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2 text-sm p-1 border-b border-gray-200">
                            <span>{item.itemName}</span>
                            <span className="text-right">{formatNumber(item.amount)} 원</span>
                        </div>
                    ))}
                </div>
                
                {/* 총 공사비 */}
                <div className="flex justify-between items-center text-xl font-bold text-blue-600 border-t-2 border-b-2 border-gray-400 mt-4 py-4">
                    <span>총 공 사 비</span>
                    <span>{formatNumber(totalCost)} 원</span>
                </div>
            </div>
        </div>
    );
} 