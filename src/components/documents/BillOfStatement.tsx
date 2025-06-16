'use client';
import type { CalculationResult } from '@/store/calculationStore';

// 숫자를 쉼표 포맷으로 변환하는 헬퍼 함수
const formatNumber = (num: number) => num ? Math.round(num).toLocaleString() : '0';

interface BillOfStatementProps {
  result: CalculationResult;
}

export default function BillOfStatement({ result }: BillOfStatementProps) {
    // result 객체 또는 필요한 데이터가 없을 경우를 대비한 방어 코드
    if (!result?.costsByCategory || !result.overheadDetails) {
        return <p>내역서 상세 정보를 표시할 데이터가 부족합니다.</p>;
    }

    const { 
        costsByCategory, 
        directMaterialCost, 
        directLaborCost, 
        directEquipmentCost, 
        overheadDetails, 
        totalCost 
    } = result;

    const totalDirectCost = directMaterialCost + directLaborCost + directEquipmentCost;
    const totalOverheadCost = overheadDetails.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
    
    // 엑셀의 주요 공종 순서 정의
    const categoryOrder = ["토공", "가시설공", "관접합공", "비굴착갱생공", "포장공", "사급자재비", "부대공", "관 갱생공"];
    
    // 정의된 순서에 따라 공종을 정렬
    const sortedCategories = Object.entries(costsByCategory).sort(([a], [b]) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        // 정의되지 않은 카테고리는 뒤로 보냄
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return (
        <div className="font-mono p-2 text-sm">
            <h2 className="text-center text-2xl font-bold mb-6">총 괄 내 역 서</h2>
            <div className="border p-4 space-y-1">
                
                {/* 1. 직접공사비 */}
                <div className="flex justify-between font-bold text-base bg-gray-100 p-2 rounded-t-md">
                    <span>1. 직접공사비</span>
                    <span>{formatNumber(totalDirectCost)} 원</span>
                </div>

                {/* 공종별 상세 내역 루프 (핵심 수정 부분) */}
                {sortedCategories.map(([category, costs]: [string, any]) => {
                    const categoryTotal = (costs.material || 0) + (costs.labor || 0) + (costs.equipment || 0);
                    // 합계가 0인 공종은 화면에 표시하지 않음
                    if (categoryTotal === 0) return null;

                    return (
                        <div key={category} className="pl-4 py-2 border-b border-gray-100">
                            {/* 공종명과 공종 합계 */}
                            <div className="flex justify-between font-semibold text-sm">
                                <span>- {category}</span>
                                <span>{formatNumber(categoryTotal)} 원</span>
                            </div>
                            {/* 각 공종의 상세 비용 항목 (재료비, 노무비, 장비비) */}
                            <div className="pl-6 text-xs text-gray-700 mt-1">
                                {costs.material > 0 && <div className="flex justify-between"><span> ◦ 재료비</span><span>{formatNumber(costs.material)}</span></div>}
                                {costs.labor > 0 && <div className="flex justify-between"><span> ◦ 노무비</span><span>{formatNumber(costs.labor)}</span></div>}
                                {costs.equipment > 0 && <div className="flex justify-between"><span> ◦ 경비</span><span>{formatNumber(costs.equipment)}</span></div>}
                            </div>
                        </div>
                    );
                })}

                {/* 2. 간접공사비 */}
                <div className="flex justify-between font-bold text-base bg-gray-100 p-2 mt-4">
                    <span>2. 간접공사비 (경비)</span>
                    <span>{formatNumber(totalOverheadCost)} 원</span>
                </div>
                {/* 간접비 상세 항목 표시 */}
                <div className="pl-4 space-y-1 text-xs">
                    {overheadDetails.map(item => (
                        <div key={item.itemName} className="flex justify-between text-gray-700">
                            <span>- {item.itemName}</span>
                            <span>{formatNumber(item.amount)} 원</span>
                        </div>
                    ))}
                </div>

                {/* 3. 총계 */}
                <div className="flex justify-between items-center text-xl font-bold text-blue-600 border-t-2 border-b-2 border-gray-400 mt-4 py-4">
                    <span>총 공 사 비</span>
                    <span>{formatNumber(totalCost)} 원</span>
                </div>
            </div>
        </div>
    );
} 