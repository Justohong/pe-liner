'use client';
import { Fragment } from 'react';
import type { CalculationResult } from '@/store/calculationStore';

interface BillOfStatementProps {
    result: CalculationResult;
}

export default function BillOfStatement({ result }: BillOfStatementProps) {
    if (!result?.summary) return <p>내역서 데이터가 없습니다.</p>;

    const { directCost, overheadCost, totalCost } = result.summary;

    const renderCategoryDetails = (byCategory: any[]) => {
        // byCategory는 CategoryCost[] 타입
        return byCategory.map((cost) => (
            <div key={cost.category} className="flex justify-between pl-8 text-sm text-gray-600">
                <span>- {cost.category}</span>
                <span>{cost.totalCost.toLocaleString()} 원</span>
            </div>
        ));
    };

    return (
        <div className="font-sans p-4">
            <h2 className="text-center text-2xl font-bold mb-6">총 괄 내 역 서</h2>
            <div className="border p-4 space-y-3">
                {/* 1. 직접 공사비 */}
                <div className="flex justify-between font-bold text-lg">
                    <span>1. 직접 공사비</span>
                    <span>{directCost.total.toLocaleString()} 원</span>
                </div>
                <div className="pl-4 space-y-2">
                    <div className="flex justify-between font-semibold"><span>가. 재료비</span><span>{directCost.material.toLocaleString()} 원</span></div>
                    <div className="flex justify-between font-semibold"><span>나. 노무비</span><span>{directCost.labor.toLocaleString()} 원</span></div>
                    <div className="flex justify-between font-semibold"><span>다. 직접경비(장비)</span><span>{directCost.equipment.toLocaleString()} 원</span></div>
                </div>
                {/* 공종별 상세 내역 표시 */}
                {renderCategoryDetails(directCost.byCategory)}

                {/* 2. 간접 공사비 */}
                <div className="flex justify-between font-bold text-lg pt-4 mt-4 border-t">
                    <span>2. 간접 공사비 (경비)</span>
                    <span>{overheadCost.total.toLocaleString()} 원</span>
                </div>
                <div className="pl-4 space-y-2">
                    {overheadCost.items.map((item: any) => (
                        <div key={item.itemName} className="flex justify-between text-sm text-gray-600">
                            <span>- {item.itemName}</span>
                            <span>{item.amount.toLocaleString()} 원</span>
                        </div>
                    ))}
                </div>

                {/* 3. 총계 */}
                <div className="flex justify-between items-center text-xl font-bold text-blue-600 pt-4 mt-4 border-t">
                    <span>총 공 사 비</span>
                    <span>{totalCost.toLocaleString()} 원</span>
                </div>
            </div>
        </div>
    );
} 