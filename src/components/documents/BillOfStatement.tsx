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
        totalCost: number;
    };
}

export default function BillOfStatement({ result }: BillOfStatementProps) {
    if (!result?.costsByCategory) return <p>내역서 데이터를 표시할 정보가 부족합니다.</p>;

    const { costsByCategory, directMaterialCost, directLaborCost, directEquipmentCost, totalOverheadCost, totalCost } = result;
    const totalDirectCost = directMaterialCost + directLaborCost + directEquipmentCost;

    // 엑셀의 주요 공종 순서를 정의합니다.
    const categoryOrder = [
        "토공", "가시설공", "관접합공", "비굴착갱생공", "포장공", "사급자재비", "부대공"
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
                <div className="flex justify-between font-bold text-base bg-gray-100 p-2 rounded-t-md">
                    <span>1. 직접공사비</span>
                    <span>{formatNumber(totalDirectCost)} 원</span>
                </div>
                {sortedCategories.map((costs) => {
                    const categoryTotal = (costs.materialCost || 0) + (costs.laborCost || 0) + (costs.equipmentCost || 0);
                    if (categoryTotal === 0) return null;
                    return (
                        <div key={costs.category} className="pl-4 py-1">
                            <div className="flex justify-between font-semibold">
                                <span>- {costs.category}</span>
                                <span>{formatNumber(categoryTotal)} 원</span>
                            </div>
                        </div>
                    );
                })}
                <div className="flex justify-between font-bold text-base bg-gray-100 p-2 mt-4">
                    <span>2. 간접공사비 (경비)</span>
                    <span>{formatNumber(totalOverheadCost)} 원</span>
                </div>
                <div className="flex justify-between items-center text-xl font-bold text-blue-600 border-t-2 border-b-2 border-gray-400 mt-4 py-4">
                    <span>총 공 사 비</span>
                    <span>{formatNumber(totalCost)} 원</span>
                </div>
            </div>
        </div>
    );
} 