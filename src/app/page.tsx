'use client';

import { useState, useEffect } from 'react';
import MenuTree from '@/components/common/MenuTree';
import FileUpload from '@/components/baseData/FileUpload';
import MachineryTable from '@/components/quantityData/MachineryTable';
import MachineBaseTable from '@/components/baseData/MachineBaseTable';
import MaterialTable from '@/components/baseData/MaterialTable';
import LaborTable from '@/components/baseData/LaborTable';
import DataUploader from '@/components/quantityData/DataUploader';
import UnitPriceSheetTable, { GroupData } from '@/components/quantityData/UnitPriceSheetTable';
import UnitPriceListTable from '@/components/DocumentGenerator/UnitPriceListTable';
import MachineryUsageTable from '@/components/DocumentGenerator/MachineryUsageTable';
import PriceDocumentGenerator from '@/components/DocumentGenerator/PriceDocumentGenerator';
import NaragetTable from '@/components/waterProject/NaragetTable';
import { db } from '@/utils/db';
import { sessionStore } from '@/utils/sessionStore';
import { useCalculationStore } from '@/store/calculationStore';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { result } = useCalculationStore(); // Zustand 스토어에서 계산 결과 가져오기
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<string>('dashboard'); // 기본 메뉴를 대시보드로 설정
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [dbSaveResult, setDbSaveResult] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  // PE라이너 데이터 생성 관련 상태
  const [peLinerData, setPeLinerData] = useState<any>(null);
  // 일위대가_호표 그룹 데이터 (일위대가목록과 공유)
  const [unitPriceGroups, setUnitPriceGroups] = useState<GroupData[]>([]);

  // 페이지 로드시 sessionStorage 초기화 및 DB 데이터 확인
  useEffect(() => {
    // 새로고침 시 sessionStorage 데이터 초기화
    if (typeof window !== 'undefined') {
      try {
        sessionStore.clearSessionData();
        console.log('페이지 로드 시 sessionStorage 데이터가 초기화되었습니다.');
      } catch (error) {
        console.error('sessionStorage 초기화 중 오류:', error);
      }
    }
    
    // DB에 저장된 데이터 확인
    const machineryCount = db.getMachineryData().length;
    const machineBaseCount = db.getMachineBaseData().length;
    const materialCount = db.getMaterialData().length;
    const laborCount = db.getLaborData().length;
    
    const totalCount = machineryCount + machineBaseCount + materialCount + laborCount;
    setIsDataLoaded(totalCount > 0);
    
    console.log('DB 로드 결과:', {
      machineryCount,
      machineBaseCount, 
      materialCount,
      laborCount,
      isDataLoaded: totalCount > 0
    });
  }, []);

  const handleMenuSelect = (menu: string) => {
    if (menu === 'calculator') {
      router.push('/calculator');
    } else {
      setActiveMenu(menu);
    }
  };

  const handleDataLoad = (result: { success: boolean; data?: any; message?: string; dbResult?: any }) => {
    if (result.success && result.data) {
      console.log('업로드된 데이터:', result.data);
      
      // 기초데이터 업로드에서는 중기기초자료, 자재, 노임 데이터만 처리
      const filteredData = {
        machineBase: result.data.machineBase,
        material: result.data.material,
        labor: result.data.labor
      };
      
      setUploadedData(filteredData);
      
      if (result.dbResult) {
        console.log('DB 저장 결과:', result.dbResult);
        setDbSaveResult(result.dbResult);
        setIsDataLoaded(true);
      }
    }
  };

  // PE라이너 데이터 처리 함수
  const handlePeLinerDataLoad = (result: any) => {
    console.log('PE라이너 데이터:', result);
    setPeLinerData(result);
  };

  // 일위대가_호표 그룹 데이터 업데이트 핸들러
  const handleUnitPriceGroupsUpdate = (groups: GroupData[]) => {
    console.log('일위대가_호표 그룹 데이터 업데이트:', groups.length);
    setUnitPriceGroups(groups);
  };

  // 현재 메뉴에 따라 적절한 컴포넌트 렌더링
  const renderContent = () => {
    // 대시보드 메뉴 (계산 결과 표시)
    if (activeMenu === 'dashboard') {
      if (!result) {
        return (
          <div className="text-center p-8">
            <p className="text-gray-600 mb-4">계산된 결과가 없습니다. 먼저 '자동 계산기' 메뉴에서 공사비를 계산해주세요.</p>
            <Button onClick={() => router.push('/calculator')} className="bg-blue-600 hover:bg-blue-700">
              계산기로 이동
            </Button>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">PE 라이너 공사비 계산 결과</h2>
          
          {/* 요약 카드 */}
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Button 
              onClick={() => setActiveMenu('baseDataMaterial')}
              className="bg-blue-600 hover:bg-blue-700 h-auto py-4"
            >
              자재 상세 보기
            </Button>
            <Button 
              onClick={() => setActiveMenu('baseDataLabor')}
              className="bg-green-600 hover:bg-green-700 h-auto py-4"
            >
              노무비 상세 보기
            </Button>
            <Button 
              onClick={() => setActiveMenu('baseDataMachinery')}
              className="bg-amber-600 hover:bg-amber-700 h-auto py-4"
            >
              장비비 상세 보기
            </Button>
            <Button 
              onClick={() => setActiveMenu('peLinerDataUnitPriceSheet')}
              className="bg-purple-600 hover:bg-purple-700 h-auto py-4"
            >
              일위대가표 보기
            </Button>
          </div>
          
          <Button 
            onClick={() => router.push('/calculator')}
            className="w-full bg-gray-600 hover:bg-gray-700 h-auto py-4"
          >
            계산기로 돌아가기
          </Button>
        </div>
      );
    }
    else if (activeMenu === 'waterProjectNaraget') {
      return <NaragetTable />;
    }
    else if (activeMenu === 'baseDataUpload') {
      return (
        <div>
          <h2 className="text-xl font-semibold mb-4">기초정보 데이터 업로드</h2>
          <p className="text-gray-600 mb-4">중기기초자료, 자재, 노임 데이터를 업로드합니다.</p>
          <FileUpload onDataLoad={handleDataLoad} />
          
          {uploadedData && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">업로드된 데이터</h3>
              <div className="grid grid-cols-2 gap-4">
                {uploadedData.machineBase && (
                  <div className="col-span-1">
                    <p className="font-medium">중기기초자료 데이터: {uploadedData.machineBase.length}개 항목</p>
                  </div>
                )}
                {uploadedData.material && (
                  <div className="col-span-1">
                    <p className="font-medium">자재 데이터: {uploadedData.material.length}개 항목</p>
                  </div>
                )}
                {uploadedData.labor && (
                  <div className="col-span-1">
                    <p className="font-medium">노임 데이터: {uploadedData.labor.length}개 항목</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {dbSaveResult && dbSaveResult.success && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="text-lg font-medium text-green-800 mb-2">데이터베이스 저장 결과</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <p className="text-green-700">중기기초자료: {dbSaveResult.counts.machineBaseCount}개 저장됨</p>
                </div>
                <div className="col-span-1">
                  <p className="text-green-700">자재: {dbSaveResult.counts.materialCount}개 저장됨</p>
                </div>
                <div className="col-span-1">
                  <p className="text-green-700">노임: {dbSaveResult.counts.laborCount}개 저장됨</p>
                </div>
              </div>
            </div>
          )}
          
          {isDataLoaded && !dbSaveResult && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="text-lg font-medium text-blue-800 mb-2">저장된 데이터 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <p className="text-blue-700">중기기초자료: {db.getMachineBaseData().length}개 항목</p>
                </div>
                <div className="col-span-1">
                  <p className="text-blue-700">자재: {db.getMaterialData().length}개 항목</p>
                </div>
                <div className="col-span-1">
                  <p className="text-blue-700">노임: {db.getLaborData().length}개 항목</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => {
                    if (window.confirm('모든 데이터를 삭제하시겠습니까?')) {
                      db.clearAllData();
                      setIsDataLoaded(false);
                      setDbSaveResult(null);
                      setUploadedData(null);
                      alert('모든 데이터가 삭제되었습니다.');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  모든 데이터 삭제
                </button>
              </div>
            </div>
          )}
        </div>
      );
    } else if (activeMenu === 'baseDataMachinery') {
      if (result) {
        // 계산 결과가 있으면, lineItems에서 장비비만 필터링하여 전달
        const equipmentData = result.lineItems.filter(item => item.type === 'equipment');
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
          return <MachineryTable data={formattedData} />;
        }
      }
      
      // 계산 결과가 없거나 장비비 항목이 없는 경우 기존 로직 사용
      console.log('중기사용료 페이지 데이터 확인:', {
        uploadedData: uploadedData?.machinery ? '있음' : '없음',
        peLinerData: peLinerData ? '있음' : '없음',
        peLinerDataStructure: peLinerData?.data ? Object.keys(peLinerData.data) : '없음',
        중기사용료: peLinerData?.data?.['중기사용료'] ? '있음' : '없음'
      });
      
      if (uploadedData?.machinery || (peLinerData?.data?.['중기사용료']?.rowData)) {
        // 엑셀에서 업로드된 중기사용료 데이터를 사용
        const machineryData = uploadedData?.machinery || peLinerData?.data?.['중기사용료']?.rowData || [];
        console.log('중기사용료 데이터 전달:', {
          dataSource: uploadedData?.machinery ? 'uploadedData' : 'peLinerData',
          dataLength: machineryData.length,
          sampleData: machineryData.slice(0, 3)
        });
        return <MachineryTable data={machineryData} />;
      } else {
        return (
          <div className="text-center p-8">
            <p className="text-gray-600">장비비 데이터가 없습니다. '자동 계산기' 메뉴에서 먼저 계산을 수행하거나, 수량정보 데이터관리 &gt; 데이터 업로드 메뉴에서 중기사용료 시트가 포함된 엑셀 파일을 업로드해주세요.</p>
            <Button onClick={() => router.push('/calculator')} className="mt-4 bg-blue-600 hover:bg-blue-700">
              계산기로 이동
            </Button>
          </div>
        );
      }
    } else if (activeMenu === 'baseDataMachine') {
      // DB에서 중기기초자료 데이터를 가져와서 표시 (DB에 저장된 데이터가 있는 경우)
      const machineBaseData = db.getMachineBaseData();
      if (machineBaseData.length > 0) {
        // 기존 엑셀 레이아웃으로 표시 (MachineBaseTable 컴포넌트 사용)
        return <MachineBaseTable data={machineBaseData} />;
      } else if (uploadedData?.machineBase) {
        return <MachineBaseTable data={uploadedData.machineBase} />;
      } else {
        return (
          <div className="text-center p-8">
            <p className="text-gray-600">중기기초자료 데이터가 없습니다. 데이터 업로드 메뉴에서 엑셀 파일을 업로드해주세요.</p>
          </div>
        );
      }
    } else if (activeMenu === 'baseDataMaterial') {
      if (result) {
        // 계산 결과가 있으면, lineItems에서 자재만 필터링하여 전달
        const materialData = result.lineItems.filter(item => item.type === 'material');
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
          return <MaterialTable data={formattedData} />;
        }
      }
      
      // 계산 결과가 없거나 자재 항목이 없는 경우 기존 로직 사용
      const materialData = db.getMaterialData();
      if (materialData.length > 0) {
        return <MaterialTable data={materialData} />;
      } else if (uploadedData?.material) {
        return <MaterialTable data={uploadedData.material} />;
      } else {
        return (
          <div className="text-center p-8">
            <p className="text-gray-600">자재 데이터가 없습니다. '자동 계산기' 메뉴에서 먼저 계산을 수행하거나, 데이터 업로드 메뉴에서 엑셀 파일을 업로드해주세요.</p>
            <Button onClick={() => router.push('/calculator')} className="mt-4 bg-blue-600 hover:bg-blue-700">
              계산기로 이동
            </Button>
          </div>
        );
      }
    } else if (activeMenu === 'baseDataLabor') {
      if (result) {
        // 계산 결과가 있으면, lineItems에서 노무비만 필터링하여 전달
        const laborData = result.lineItems.filter(item => item.type === 'labor');
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
          return <LaborTable data={formattedData} />;
        }
      }
      
      // 계산 결과가 없거나 노무비 항목이 없는 경우 기존 로직 사용
      const laborData = db.getLaborData();
      if (laborData.length > 0) {
        return <LaborTable data={laborData} />;
      } else if (uploadedData?.labor) {
        return <LaborTable data={uploadedData.labor} />;
      } else {
        return (
          <div className="text-center p-8">
            <p className="text-gray-600">노임 데이터가 없습니다. '자동 계산기' 메뉴에서 먼저 계산을 수행하거나, 데이터 업로드 메뉴에서 엑셀 파일을 업로드해주세요.</p>
            <Button onClick={() => router.push('/calculator')} className="mt-4 bg-blue-600 hover:bg-blue-700">
              계산기로 이동
            </Button>
          </div>
        );
      }
    } 
    // PE라이너 데이터생성 메뉴 처리
    else if (activeMenu === 'peLinerDataUpload') {
      return <DataUploader onDataLoad={handlePeLinerDataLoad} />;
    } 
    else if (activeMenu === 'peLinerDataUnitPriceSheet') {
      if (result) {
        // 계산 결과가 있으면, 모든 lineItems을 일위대가표 형식으로 표시
        // UnitPriceSheetTable 컴포넌트가 lineItems 형식을 직접 받을 수 없으므로
        // 여기서는 단순히 계산 결과가 있다는 안내 메시지를 표시
        return (
          <div className="space-y-6">
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle>계산 결과 기반 일위대가표</CardTitle>
                <CardDescription>자동 계산기에서 계산된 결과를 기반으로 한 일위대가표입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-blue-100 border-b">
                        <th className="px-4 py-2 text-left">구분</th>
                        <th className="px-4 py-2 text-left">품명</th>
                        <th className="px-4 py-2 text-right">수량</th>
                        <th className="px-4 py-2 text-right">단가</th>
                        <th className="px-4 py-2 text-right">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.lineItems.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2">{item.type === 'material' ? '재료비' : item.type === 'labor' ? '노무비' : '장비비'}</td>
                          <td className="px-4 py-2">{item.itemName}</td>
                          <td className="px-4 py-2 text-right">{item.quantity.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">{item.unitPrice.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{item.totalPrice.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
      
      // 계산 결과가 없는 경우 기존 로직 사용
      return peLinerData ? (
        <UnitPriceSheetTable 
          data={peLinerData} 
          onGroupsUpdated={handleUnitPriceGroupsUpdate}
        />
      ) : (
        <div className="text-center p-8">
          <p className="text-gray-600 mb-4">표시할 일위대가_호표표 데이터가 없습니다. '자동 계산기' 메뉴에서 먼저 계산을 수행하거나, 수량정보 데이터관리 &gt; 데이터업로드 메뉴에서 일위대가_호표표 시트가 포함된 엑셀 파일을 업로드해주세요.</p>
          <Button onClick={() => router.push('/calculator')} className="mt-4 bg-blue-600 hover:bg-blue-700">
            계산기로 이동
          </Button>
        </div>
      );
    }
    else if (activeMenu === 'peLinerDataUnitPriceList') {
      return (
        <UnitPriceListTable groups={unitPriceGroups} />
      );
    }
    else if (activeMenu === 'peLinerDataMachineryUsage') {
      return <MachineryUsageTable />;
    }
    // PE라이너 내역서 만들기 메뉴 추가
    else if (activeMenu === 'peLinerCalcDocument') {
      return <PriceDocumentGenerator />;
    }
    else if (activeMenu.startsWith('baseData') && !uploadedData && !isDataLoaded && !result) {
      return (
        <div>
          <h2 className="text-xl font-semibold mb-4">{activeMenu} 페이지</h2>
          <p className="text-gray-600 mb-4">먼저 '데이터 업로드' 메뉴에서 엑셀 파일을 업로드하거나, '자동 계산기' 메뉴에서 계산을 수행해주세요.</p>
          <Button onClick={() => router.push('/calculator')} className="mt-4 bg-blue-600 hover:bg-blue-700">
            계산기로 이동
          </Button>
        </div>
      );
    } else {
      return (
        <div>
          <h2 className="text-xl font-semibold mb-4">{activeMenu} 페이지</h2>
          <p className="text-gray-600">이 페이지는 준비 중입니다.</p>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-700">PE 라이너 관리 시스템</h1>
          <div className="text-sm text-gray-500">v0.1.0</div>
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
