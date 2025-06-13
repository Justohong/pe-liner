'use client';
import { Fragment } from 'react';

const formatNumber = (num: number) => num.toLocaleString();

export default function BillOfStatement({ result }: { result: any }) {
    if (!result?.detailedSummary) return <p>내역서 데이터가 없습니다.</p>;

    const { byCategory, directCost, overheadCost, totalCost } = result.detailedSummary;

    return (
        <div className="font-mono p-4">
            <h2 className="text-center text-2xl font-bold mb-6">총 괄 내 역 서</h2>
            <div className="border p-4 space-y-2 text-sm">
                {/* 각 공종별 상세 내역 재귀적 렌더링 */}
                {byCategory.map((cat: any, index: number) => (
                    <Fragment key={cat.categoryName}>
                        <div className="flex justify-between font-bold pt-2">
                            <span>{index + 1}. {cat.categoryName}</span>
                            <span>{formatNumber(cat.total)}</span>
                        </div>
                        {/* 각 공종의 상세 lineItems 표시 */}
                        {cat.lineItems.map((item: any) => (
                            <div key={item.itemName} className="flex justify-between pl-4 text-xs text-gray-600">
                                <span>- {item.itemName} ({item.quantity.toFixed(2)} * {formatNumber(item.unitPrice)})</span>
                                <span>{formatNumber(item.totalPrice)}</span>
                            </div>
                        ))}
                    </Fragment>
                ))}

                {/* 최종 집계 */}
                <div className="border-t-2 border-gray-500 mt-4 pt-4 space-y-2">
                    <h3 className="font-bold text-lg">최종 집계</h3>
                    <div className="flex justify-between"><span>총 직접재료비</span><span>{formatNumber(directCost.material)}</span></div>
                    <div className="flex justify-between"><span>총 직접노무비</span><span>{formatNumber(directCost.labor)}</span></div>
                    <div className="flex justify-between"><span>총 직접경비(장비)</span><span>{formatNumber(directCost.equipment)}</span></div>
                    <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                        <p>직접공사비 합계</p>
                        <p>{formatNumber(directCost.total)}</p>
                    </div>
                    <div className="flex justify-between mt-2"><span>간접공사비 (경비)</span><span>{formatNumber(overheadCost.total)}</span></div>
                    <div className="flex justify-between items-center text-xl font-bold text-blue-600 border-t-2 border-blue-500 mt-4 pt-4">
                        <span>총 공 사 비</span>
                        <span>{formatNumber(totalCost)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
} 