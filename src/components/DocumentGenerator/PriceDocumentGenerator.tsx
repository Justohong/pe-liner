'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, RefreshCw, Plus, Trash2 } from 'lucide-react';
import type { GroupData } from '@/components/quantityData/UnitPriceSheetTable';
import { db } from '@/utils/db';
import * as XLSX from 'xlsx';
import { sessionStore } from '@/utils/sessionStore';

// 규격 정보 인터페이스 추가
interface SpecInfo {
  id: string;
  name: string;
  totalLength: number;
  workHoles: number;
  bendCount: number;
}

interface ProjectDetails {
  projectName: string;
  // 공통 작업 정보를 규격별 정보로 이동
  // totalLength: number;
  // workHoles: number;
  // bendCount: number;
}

interface DocumentItem {
  공종명: string;
  규격: string;
  수량: number;
  단위: string;
  합계단가: number;
  합계금액: number;
  재료비단가: number;
  재료비금액: number;
  노무비단가: number;
  노무비금액: number;
  경비단가: number;
  경비금액: number;
  비고?: string;
  isSpecMatched?: boolean; // 규격 매칭 여부 추가
}

// 규격 매칭을 위한 유틸리티 함수 추가
function extractSizeNumber(spec: string): number {
  // D700mm, t=9.0mm 같은 형식에서 숫자만 추출
  const matches = spec.match(/\d+(\.\d+)?/g);
  if (matches && matches.length > 0) {
    return parseFloat(matches[0]);
  }
  return 0;
}

// 규격 매칭 함수
function matchSpecWithItem(itemSpec: string, userSpec: string): boolean {
  const itemNum = extractSizeNumber(itemSpec);
  const userNum = extractSizeNumber(userSpec);
  
  // 숫자가 추출되었고 일치하는 경우
  if (itemNum > 0 && userNum > 0 && itemNum === userNum) {
    return true;
  }
  
  // 텍스트가 포함되는 경우 (숫자가 없는 경우 고려)
  if (itemNum === 0 || userNum === 0) {
    return itemSpec.includes(userSpec) || userSpec.includes(itemSpec);
  }
  
  return false;
}

export default function PriceDocumentGenerator() {
  // 프로젝트 정보 상태
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    projectName: '',
  });

  // 규격 정보 상태 추가
  const [specInfos, setSpecInfos] = useState<SpecInfo[]>([]);
  
  // 규격 추가 여부 상태 추가
  const [hasSpecs, setHasSpecs] = useState<boolean>(false);

  // 일위대가목록 데이터 상태
  const [groupData, setGroupData] = useState<GroupData[]>([]);
  
  // 내역서 데이터 상태
  const [documentItems, setDocumentItems] = useState<DocumentItem[]>([]);
  
  // 오류 메시지 상태
  const [error, setError] = useState<string>('');

  // 작업정보 기본 상태 (규격이 없을 때 사용)
  const [defaultWorkInfo, setDefaultWorkInfo] = useState({
    totalLength: 0,
    workHoles: 0,
    bendCount: 0
  });

  // 작업정보 변경 핸들러 (규격이 없을 때 사용)
  const handleDefaultWorkInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedWorkInfo = { ...defaultWorkInfo, [name]: Number(value) };
    setDefaultWorkInfo(updatedWorkInfo);
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    // 그룹 데이터가 없는 경우 세션스토리지에서 로드 시도
    if (!groupData || groupData.length === 0) {
      try {
        const storedGroups = sessionStore.getUnitPriceGroups();
        if (storedGroups) {
          console.log('세션스토리지에서 그룹 데이터 로드:', storedGroups.length);
          setGroupData(storedGroups);
        }
      } catch (error) {
        console.error('그룹 데이터 로드 중 오류:', error);
      }
    }
    
    // 프로젝트 기본 정보 로드
    const storedProjectDetails = sessionStore.getProjectDetails();
    if (storedProjectDetails) {
      setProjectDetails(storedProjectDetails);
    }

    // 규격 정보 로드
    const storedSpecInfos = sessionStore.getSpecInfos();
    if (storedSpecInfos) {
      setSpecInfos(storedSpecInfos);
      setHasSpecs(storedSpecInfos.length > 0);
    }
    
    // 이미 저장된 문서 항목 로드
    const storedDocumentItems = sessionStore.getDocumentItems();
    if (storedDocumentItems) {
      setDocumentItems(storedDocumentItems);
    }
  }, [groupData]);

  // 프로젝트 정보 변경 핸들러
  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedDetails = { ...projectDetails, [name]: value };
    setProjectDetails(updatedDetails);
    
    // 세션스토리지에 저장
    sessionStore.saveProjectDetails(updatedDetails);
  };

  // 규격 정보 추가 함수
  const addSpecInfo = () => {
    const newSpecId = `spec-${Date.now()}`;
    const newSpec: SpecInfo = {
      id: newSpecId,
      name: `규격 ${specInfos.length + 1}`,
      totalLength: 0,
      workHoles: 0,
      bendCount: 0
    };
    
    const updatedSpecInfos = [...specInfos, newSpec];
    setSpecInfos(updatedSpecInfos);
    setHasSpecs(true);
    
    // 세션스토리지에 저장
    sessionStore.saveSpecInfos(updatedSpecInfos);
  };
  
  // 규격 정보 삭제 함수
  const deleteSpecInfo = (specId: string) => {
    const updatedSpecInfos = specInfos.filter(spec => spec.id !== specId);
    setSpecInfos(updatedSpecInfos);
    setHasSpecs(updatedSpecInfos.length > 0);
    
    // 세션스토리지에 저장
    sessionStore.saveSpecInfos(updatedSpecInfos);
  };
  
  // 규격 정보 변경 핸들러
  const handleSpecChange = (specId: string, field: string, value: string | number) => {
    const updatedSpecInfos = specInfos.map(spec => {
      if (spec.id === specId) {
        return { ...spec, [field]: field === 'name' ? value : Number(value) };
      }
      return spec;
    });
    
    setSpecInfos(updatedSpecInfos);
    
    // 세션스토리지에 저장
    sessionStore.saveSpecInfos(updatedSpecInfos);
  };

  // 규격 추가 토글 핸들러 추가
  const toggleSpecsMode = () => {
    const newHasSpecs = !hasSpecs;
    setHasSpecs(newHasSpecs);
    
    // 규격 추가 모드로 변경 시 자동으로 첫 번째 규격 추가
    if (newHasSpecs && specInfos.length === 0) {
      addSpecInfo();
    }
  };

  // 규격별 내역서 항목 생성 함수
  const generateItemsForSpec = (specInfo: SpecInfo): DocumentItem[] => {
    // 일위대가 그룹 데이터로부터 내역서 항목 생성
    return groupData.map(group => {
      // 공종명과 단위에 따라 적절한 수량 결정
      let quantity = 1;
      
      // 규격 매칭 여부
      const isSpecMatched = matchSpecWithItem(group.규격, specInfo.name);
      
      // 규격이 매칭되지 않으면 수량을 0으로 설정
      if (!isSpecMatched) {
        quantity = 0;
      } else {
        // 단위가 m인 경우 작업 총길이 적용
        if (group.단위 === 'm') {
          quantity = specInfo.totalLength;
        } 
        // 단위가 개소인 경우 
        else if (group.단위 === '개소') {
          // 곡관 관련 공종인 경우
          if (group.공종명.includes('곡관') || group.공종명.includes('굴곡') || group.공종명.includes('굽힘')) {
            quantity = specInfo.bendCount;
          } 
          // 나머지 모든 개소 단위 항목은 작업 구멍수 적용
          else {
            quantity = specInfo.workHoles;
          }
        }
      }
      
      // 수량에 따른 금액 계산
      const totalPrice = group.합계금액 * quantity;
      const materialPrice = group.재료비금액 * quantity;
      const laborPrice = group.노무비금액 * quantity;
      const expensePrice = group.경비금액 * quantity;
      
      return {
        공종명: group.공종명,
        규격: group.규격,
        수량: quantity,
        단위: group.단위,
        합계단가: group.합계금액, // 단가는 원래 단가 그대로
        합계금액: totalPrice, // 수량 * 단가
        재료비단가: group.재료비금액,
        재료비금액: materialPrice, // 수량 * 단가
        노무비단가: group.노무비금액,
        노무비금액: laborPrice, // 수량 * 단가
        경비단가: group.경비금액,
        경비금액: expensePrice, // 수량 * 단가
        비고: isSpecMatched ? '' : '규격 불일치', // 규격 불일치 표시
        isSpecMatched // 매칭 여부 추가
      };
    });
  };

  // 내역서 생성 함수
  const generateDocument = () => {
    // 필수 필드 확인
    if (!projectDetails.projectName) {
      setError('시행공사명을 입력해주세요.');
      return;
    }

    // 일위대가 그룹 데이터가 있는지 확인
    if (!groupData || groupData.length === 0) {
      setError('일위대가 데이터가 없습니다. 먼저 일위대가_호표 데이터를 확인해주세요.');
      return;
    }

    // 규격 정보가 있는지 확인
    if (hasSpecs && specInfos.length === 0) {
      setError('규격 정보가 없습니다. 규격을 추가하거나 규격 추가 옵션을 해제해주세요.');
      return;
    }

    // 일위대가목록 항목을 단 한 번만 순회하여 내역서 생성
    let allDocumentItems: DocumentItem[] = [];
    let totalAmount = 0;
    let totalMaterialAmount = 0;
    let totalLaborAmount = 0;
    let totalExpenseAmount = 0;

    // 규격 추가되지 않은 경우
    if (!hasSpecs) {
      // 각 일위대가 항목에 대해 한 번만 계산
      groupData.forEach(group => {
        let quantity = 1;
        
        // 단위에 따른 수량 결정
        if (group.단위 === 'm') {
          quantity = defaultWorkInfo.totalLength;
        } else if (group.단위 === '개소') {
          // 곡관 관련 공종인 경우
          if (group.공종명.includes('곡관') || group.공종명.includes('굴곡') || group.공종명.includes('굽힘')) {
            quantity = defaultWorkInfo.bendCount;
          } else {
            quantity = defaultWorkInfo.workHoles;
          }
        }
        
        // 수량에 따른 금액 계산
        const totalPrice = group.합계금액 * quantity;
        const materialPrice = group.재료비금액 * quantity;
        const laborPrice = group.노무비금액 * quantity;
        const expensePrice = group.경비금액 * quantity;
        
        // 항목 추가
        allDocumentItems.push({
          공종명: group.공종명,
          규격: group.규격,
          수량: quantity,
          단위: group.단위,
          합계단가: group.합계금액,
          합계금액: totalPrice,
          재료비단가: group.재료비금액,
          재료비금액: materialPrice,
          노무비단가: group.노무비금액,
          노무비금액: laborPrice,
          경비단가: group.경비금액,
          경비금액: expensePrice,
          비고: '',
          isSpecMatched: true
        });
        
        // 금액 합산
        totalAmount += totalPrice;
        totalMaterialAmount += materialPrice;
        totalLaborAmount += laborPrice;
        totalExpenseAmount += expensePrice;
      });
    } else {
      // 규격 추가된 경우: 각 일위대가 항목에 대해 한 번만 계산
      groupData.forEach(group => {
        // 이 항목과 매치되는 규격 찾기
        const matchingSpec = specInfos.find(spec => 
          matchSpecWithItem(group.규격, spec.name)
        );
        
        let quantity = 0;
        let isMatched = false;
        
        // 매칭되는 규격이 있는 경우
        if (matchingSpec) {
          isMatched = true;
          
          // 단위에 따른 수량 결정
          if (group.단위 === 'm') {
            quantity = matchingSpec.totalLength;
          } else if (group.단위 === '개소') {
            // 곡관 관련 공종인 경우
            if (group.공종명.includes('곡관') || group.공종명.includes('굴곡') || group.공종명.includes('굽힘')) {
              quantity = matchingSpec.bendCount;
            } else {
              quantity = matchingSpec.workHoles;
            }
          } else {
            quantity = 1; // 기본값
          }
        }
        
        // 수량에 따른 금액 계산
        const totalPrice = group.합계금액 * quantity;
        const materialPrice = group.재료비금액 * quantity;
        const laborPrice = group.노무비금액 * quantity;
        const expensePrice = group.경비금액 * quantity;
        
        // 항목 추가
        allDocumentItems.push({
          공종명: group.공종명,
          규격: group.규격,
          수량: quantity,
          단위: group.단위,
          합계단가: group.합계금액,
          합계금액: totalPrice,
          재료비단가: group.재료비금액,
          재료비금액: materialPrice,
          노무비단가: group.노무비금액,
          노무비금액: laborPrice,
          경비단가: group.경비금액,
          경비금액: expensePrice,
          비고: isMatched ? '' : '규격 불일치',
          isSpecMatched: isMatched
        });
        
        // 금액 합산 (매칭된 경우만)
        if (isMatched) {
          totalAmount += totalPrice;
          totalMaterialAmount += materialPrice;
          totalLaborAmount += laborPrice;
          totalExpenseAmount += expensePrice;
        }
      });
    }

    // 프로젝트 정보를 내역서 첫 행에 추가
    const projectRow: DocumentItem = {
      공종명: projectDetails.projectName,
      규격: '',
      수량: 1,
      단위: '식',
      합계단가: 0,
      합계금액: totalAmount,
      재료비단가: 0,
      재료비금액: totalMaterialAmount,
      노무비단가: 0,
      노무비금액: totalLaborAmount,
      경비단가: 0,
      경비금액: totalExpenseAmount,
      비고: ''
    };

    // 내역서에 모든 항목 추가 (프로젝트 행 + 그룹 항목들)
    const newItems = [projectRow, ...allDocumentItems];
    
    // 내역서 항목 업데이트
    setDocumentItems(newItems);
    setError(''); // 오류 메시지 초기화
    
    // 내역서 데이터 저장
    try {
      sessionStore.saveDocumentItems(newItems);
      console.log('내역서 데이터를 sessionStorage에 저장했습니다:', newItems.length);
    } catch (err) {
      console.error('내역서 데이터 저장 중 오류:', err);
    }
  };

  // 숫자 포맷팅 함수
  const formatNumber = (value: number) => {
    if (value === 0) return '';
    // 소수점을 반올림하여 정수로 변환 후 포맷팅
    return Math.round(value).toLocaleString('ko-KR');
  };

  // 엑셀용 숫자 포맷팅 함수 추가
  const formatNumberForExcel = (value: number) => {
    if (value === 0) return 0;
    // 엑셀 내보내기를 위한 값도 반올림 처리
    return Math.round(value);
  };

  // 엑셀 다운로드 함수
  const downloadExcel = () => {
    if (documentItems.length === 0) {
      setError('먼저 내역서를 생성해주세요.');
      return;
    }

    try {
      // 워크북 생성
      const wb = XLSX.utils.book_new();
      
      // 1. 내역서 시트 생성
      // 프로젝트명 행 처리
      const projectNameRow = documentItems[0];
      const projectRowData = {
        'NO': '',
        '공종명': projectNameRow.공종명,
        '규격': '',
        '수량': '',
        '단위': '',
        '합계단가': '',
        '합계금액': projectNameRow.합계금액,
        '재료비단가': '',
        '재료비금액': projectNameRow.재료비금액,
        '노무비단가': '',
        '노무비금액': projectNameRow.노무비금액,
        '경비단가': '',
        '경비금액': projectNameRow.경비금액,
        '비고': ''
      };
      
      // 일반 항목 처리 (1부터 시작하는 번호 부여)
      const itemRowsData = documentItems.slice(1).map((item, idx) => ({
        'NO': (idx + 1).toString(),
        '공종명': item.공종명,
        '규격': item.규격,
        '수량': item.수량,
        '단위': item.단위,
        '합계단가': item.합계단가,
        '합계금액': item.합계금액,
        '재료비단가': item.재료비단가,
        '재료비금액': item.재료비금액,
        '노무비단가': item.노무비단가,
        '노무비금액': item.노무비금액,
        '경비단가': item.경비단가,
        '경비금액': item.경비금액,
        '비고': item.비고 || ''
      }));
      
      // 모든 행 데이터 합치기
      const documentData = [projectRowData, ...itemRowsData];
      
      // 워크시트 생성
      const documentWS = XLSX.utils.json_to_sheet(documentData);
      
      // 숫자 셀에 통화 형식 스타일 적용
      applyCurrencyFormat(documentWS);
      
      // 열 너비 설정
      const documentColWidths = [
        { wch: 5 }, // NO
        { wch: 25 }, // 공종명
        { wch: 15 }, // 규격
        { wch: 8 }, // 수량
        { wch: 8 }, // 단위
        { wch: 12 }, // 합계단가
        { wch: 12 }, // 합계금액
        { wch: 12 }, // 재료비단가
        { wch: 12 }, // 재료비금액
        { wch: 12 }, // 노무비단가
        { wch: 12 }, // 노무비금액
        { wch: 12 }, // 경비단가
        { wch: 12 }, // 경비금액
        { wch: 15 } // 비고
      ];
      documentWS['!cols'] = documentColWidths;
      
      // 테두리 정보 설정 (내역서)
      applyBordersToSheet(documentWS, documentItems.length + 1);
      
      // 내역서 시트 추가
      XLSX.utils.book_append_sheet(wb, documentWS, '내역서');
      
      // 2. 일위대가목록 시트 생성
      const unitPriceListData = groupData.map(group => ({
        '공종명': group.공종명,
        '규격': group.규격,
        '단위': group.단위,
        '재료비금액': group.재료비금액,
        '노무비금액': group.노무비금액,
        '경비금액': group.경비금액,
        '합계금액': group.합계금액
      }));
      
      const unitPriceListWS = XLSX.utils.json_to_sheet(unitPriceListData);
      
      // 숫자 셀에 통화 형식 스타일 적용
      applyCurrencyFormat(unitPriceListWS);
      
      // 일위대가목록 열 너비 설정
      const unitPriceListColWidths = [
        { wch: 30 }, // 공종명
        { wch: 20 }, // 규격
        { wch: 8 }, // 단위
        { wch: 15 }, // 재료비금액
        { wch: 15 }, // 노무비금액
        { wch: 15 }, // 경비금액
        { wch: 15 } // 합계금액
      ];
      unitPriceListWS['!cols'] = unitPriceListColWidths;
      
      // 테두리 정보 설정 (일위대가목록)
      applyBordersToSheet(unitPriceListWS, groupData.length + 1);
      
      XLSX.utils.book_append_sheet(wb, unitPriceListWS, '일위대가목록');
      
      // 3. localStorage에서 일위대가_호표 데이터 가져와 시트 생성 
      console.log('일위대가_호표 데이터 가져오기 시도');
      const unitPriceSheetData = sessionStore.getDataUnitpriceSheet();
      
      if (unitPriceSheetData) {
        try {
          console.log('일위대가_호표 데이터:', typeof unitPriceSheetData === 'string' ? unitPriceSheetData.substring(0, 100) + '...' : '객체 데이터');
          
          const parsedData = Array.isArray(unitPriceSheetData) ? unitPriceSheetData : JSON.parse(unitPriceSheetData);
          
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log('일위대가_호표 데이터 변환:', parsedData.length, '항목');
            
            // 데이터 형식 확인 및 변환 작업
            const formattedData = parsedData.map(item => {
              // 필요한 키만 추출하여 반환
              return {
                '공종명': item['공종명'] || '',
                '규격': item['규격'] || '',
                '수량': item['수량'] || '',
                '단위': item['단위'] || '',
                '합계단가': item['합계단가'] || 0,
                '합계금액': item['합계금액'] || 0,
                '재료비단가': item['재료비단가'] || 0,
                '재료비금액': item['재료비금액'] || 0,
                '노무비단가': item['노무비단가'] || 0,
                '노무비금액': item['노무비금액'] || 0,
                '경비단가': item['경비단가'] || 0,
                '경비금액': item['경비금액'] || 0,
                '비고': item['비고'] || ''
              };
            });
            
            // JSON 데이터를 워크시트로 변환
            const unitPriceSheetWS = XLSX.utils.json_to_sheet(formattedData);
            
            // 숫자 셀에 통화 형식 스타일 적용
            applyCurrencyFormat(unitPriceSheetWS);
            
            // 열 너비 설정
            const unitPriceSheetColWidths = [
              { wch: 25 }, // 공종명
              { wch: 15 }, // 규격
              { wch: 8 }, // 수량
              { wch: 8 }, // 단위
              { wch: 12 }, // 합계단가
              { wch: 12 }, // 합계금액
              { wch: 12 }, // 재료비단가
              { wch: 12 }, // 재료비금액
              { wch: 12 }, // 노무비단가
              { wch: 12 }, // 노무비금액
              { wch: 12 }, // 경비단가
              { wch: 12 }, // 경비금액
              { wch: 15 } // 비고
            ];
            unitPriceSheetWS['!cols'] = unitPriceSheetColWidths;
            
            // 테두리 정보 설정
            applyBordersToSheet(unitPriceSheetWS, formattedData.length + 1);
            
            // 워크시트를 워크북에 추가
            XLSX.utils.book_append_sheet(wb, unitPriceSheetWS, '일위대가_호표');
          } else {
            console.log('일위대가_호표 데이터가 배열이 아니거나 비어있습니다.');
          }
        } catch (e) {
          console.error('일위대가_호표 데이터 파싱 오류:', e);
        }
      } else {
        console.log('sessionStorage에서 일위대가_호표 데이터를 찾을 수 없습니다.');
      }
      
      // 4. localStorage에서 중기사용목록 데이터 가져와 시트 생성
      console.log('중기사용목록 데이터 가져오기 시도');
      const machineryUsageData = sessionStore.getMachineryUsage();
      
      if (machineryUsageData) {
        try {
          console.log('중기사용목록 데이터:', typeof machineryUsageData === 'string' ? machineryUsageData.substring(0, 100) + '...' : '객체 데이터');
          
          // 중기사용목록 데이터 변환
          const machineryUsageItems = Array.isArray(machineryUsageData) ? machineryUsageData : JSON.parse(machineryUsageData);
          
          if (Array.isArray(machineryUsageItems) && machineryUsageItems.length > 0) {
            // 중기사용목록 데이터 표 형식으로 변환
            const machineryUsageTableData = machineryUsageItems.map((item: any) => ({
              '중기명': item.name || '',
              '재료비': formatNumberForExcel(item.material) || 0,
              '노무비': formatNumberForExcel(item.labor) || 0,
              '경비': formatNumberForExcel(item.expense) || 0,
              '합계': formatNumberForExcel(item.total) || 0
            }));
            
            // 중기사용목록 시트 생성
            const machineryUsageWS = XLSX.utils.json_to_sheet(machineryUsageTableData);
            
            // 숫자 셀에 통화 형식 스타일 적용
            applyCurrencyFormat(machineryUsageWS);
            
            // 열 너비 설정
            const machineryUsageColWidths = [
              { wch: 30 }, // 중기명
              { wch: 15 }, // 재료비
              { wch: 15 }, // 노무비
              { wch: 15 }, // 경비
              { wch: 15 }  // 합계
            ];
            machineryUsageWS['!cols'] = machineryUsageColWidths;
            
            // 테두리 정보 설정
            applyBordersToSheet(machineryUsageWS, machineryUsageTableData.length + 1);
            
            // 중기사용목록 시트 추가
            XLSX.utils.book_append_sheet(wb, machineryUsageWS, '중기사용목록');
            
            console.log('중기사용목록 시트 추가 완료:', machineryUsageTableData.length);
          }
        } catch (e) {
          console.error('중기사용목록 데이터 처리 중 오류:', e);
        }
      } else {
        console.log('sessionStorage에서 중기사용목록 데이터를 찾을 수 없습니다.');
      }
      
      // 5. 중기사용료 시트 생성 (그룹화된 테이블)
      try {
        // 중기사용료 데이터 가져오기
        const machineryData = processMachineryDataForExcel();
        
        if (machineryData && Object.keys(machineryData).length > 0) {
          // 중기 데이터를 표 형식으로 변환
          const machineryTableData: Array<Record<string, any>> = [];
          
          // 각 중기에 대한 표 구성
          for (const machineName in machineryData) {
            // 중기명 헤더 행 추가
            machineryTableData.push({
              '중기명': machineName,
              'No.': '',
              '구분': '',
              '항목': '',
              '규격': '',
              '수량': '',
              '단위': '',
              '단가': '',
              '금액': ''
            });
            
            // 헤더 행 추가
            machineryTableData.push({
              '중기명': '',
              'No.': 'No.',
              '구분': '구분',
              '항목': '항목',
              '규격': '규격',
              '수량': '수량',
              '단위': '단위',
              '단가': '단가',
              '금액': '금액'
            });
            
            // 중기 상세 항목 추가
            let itemNo = 1;
            machineryData[machineName].forEach(item => {
              machineryTableData.push({
                '중기명': '',
                'No.': item.구분 === '소계' || item.구분 === '총계' ? '' : itemNo++,
                '구분': item.구분 || '',
                '항목': item.항목 || '',
                '규격': item.규격 || '',
                '수량': item.수량 || '',
                '단위': item.단위 || '',
                '단가': item.단가 || '',
                '금액': item.금액 || 0
              });
            });
            
            // 중기 간 구분을 위한 빈 행 추가
            machineryTableData.push({
              '중기명': '',
              'No.': '',
              '구분': '',
              '항목': '',
              '규격': '',
              '수량': '',
              '단위': '',
              '단가': '',
              '금액': ''
            });
          }
          
          // 중기사용료 시트 생성
          const machineryWS = XLSX.utils.json_to_sheet(machineryTableData);
          
          // 숫자 셀에 통화 형식 스타일 적용
          applyCurrencyFormat(machineryWS);
          
          // 열 너비 설정
          const machineryColWidths = [
            { wch: 25 }, // 중기명
            { wch: 5 }, // No.
            { wch: 10 }, // 구분
            { wch: 20 }, // 항목
            { wch: 20 }, // 규격
            { wch: 8 }, // 수량
            { wch: 8 }, // 단위
            { wch: 12 }, // 단가
            { wch: 12 } // 금액
          ];
          machineryWS['!cols'] = machineryColWidths;
          
          // 중기사용료 시트 추가
          XLSX.utils.book_append_sheet(wb, machineryWS, '중기사용료');
          
          console.log('중기사용료 시트 추가 완료:', machineryTableData.length);
        }
      } catch (err) {
        console.error('중기사용료 시트 생성 중 오류:', err);
      }
      
      // 6. DB에서 중기기초자료 데이터 가져와 시트 생성
      const machineBaseData = db.getMachineBaseData();
      if (machineBaseData.length > 0) {
        // 헤더 행 제외하고 데이터만 추출
        const filteredData = machineBaseData
          .filter((item, index) => index > 0) // 첫 번째 줄 제외
          .map(item => {
            const data: Record<string, any> = {};
            if (item.originalData) {
              // originalData 있을 경우 필요한 필드만 추출
              data['명    칭'] = item.originalData['중기기초자료'] || '';
              data['규    격'] = item.originalData['__EMPTY'] || '';
              data['단 위'] = item.originalData['__EMPTY_1'] || '';
              data['재 료 비'] = item.originalData['__EMPTY_2'] || 0;
              data['노 무 비'] = item.originalData['__EMPTY_3'] || 0;
              data['경    비'] = item.originalData['__EMPTY_4'] || 0;
              data['합계'] = item.originalData['__EMPTY_5'] || 0;
              data['비 고'] = item.originalData['__EMPTY_6'] || '';
            } else {
              // 원본 데이터 사용
              return item;
            }
            return data;
          });
        
        // 정제된 데이터로 워크시트 생성
        const machineBaseWS = XLSX.utils.json_to_sheet(filteredData);
        
        // 숫자 셀에 통화 형식 스타일 적용
        applyCurrencyFormat(machineBaseWS);
        
        // 테두리 정보 설정 (중기기초자료)
        applyBordersToSheet(machineBaseWS, filteredData.length + 1);
        
        XLSX.utils.book_append_sheet(wb, machineBaseWS, '중기기초자료');
      }
      
      // 7. DB에서 자재 데이터 가져와 시트 생성
      const materialData = db.getMaterialData();
      if (materialData.length > 0) {
        // 헤더 행 제외하고 데이터만 추출
        const filteredData = materialData
          .filter((item, index) => index > 0) // 첫 번째 줄 제외
          .map(item => {
            // 자재 데이터를 한글 필드명으로 변환
            const data: Record<string, any> = {};
            
            if (item.originalData) {
              // 원본 데이터에서 필드 추출 및 한글 필드명으로 변환
              data['품명'] = item.originalData['자재'] || '';
              data['규격'] = item.originalData['__EMPTY'] || '';
              data['단위'] = item.originalData['__EMPTY_1'] || '';
              data['단가'] = item.originalData['__EMPTY_2'] || 0;
              data['비고'] = item.originalData['__EMPTY_3'] || '';
            } else {
              // 필드명이 없는 경우 기본 정보 사용
              data['품명'] = item.name || '';
              data['규격'] = item.spec || '';
              data['단위'] = item.unit || '';
              data['단가'] = item.price || 0;
              data['비고'] = '';
            }
            
            return data;
          });
        
        // 정제된 데이터로 워크시트 생성
        const materialWS = XLSX.utils.json_to_sheet(filteredData);
        
        // 숫자 셀에 통화 형식 스타일 적용
        applyCurrencyFormat(materialWS);
        
        // 열 너비 설정
        const materialColWidths = [
          { wch: 30 }, // 품명
          { wch: 20 }, // 규격
          { wch: 8 },  // 단위
          { wch: 12 }, // 단가
          { wch: 15 }  // 비고
        ];
        materialWS['!cols'] = materialColWidths;
        
        // 테두리 정보 설정 (자재데이터)
        applyBordersToSheet(materialWS, filteredData.length + 1);
        
        XLSX.utils.book_append_sheet(wb, materialWS, '자재데이터');
      }
      
      // 8. DB에서 노임 데이터 가져와 시트 생성
      const laborData = db.getLaborData();
      if (laborData.length > 0) {
        // 헤더 행 제외하고 데이터만 추출
        const filteredData = laborData
          .filter((item, index) => index > 0) // 첫 번째 줄 제외
          .map(item => {
            // 노임 데이터를 한글 필드명으로 변환
            const data: Record<string, any> = {};
            
            if (item.originalData) {
              // 원본 데이터에서 필드 추출 및 한글 필드명으로 변환
              data['직종'] = item.originalData['노임'] || '';
              data['작업유형'] = item.originalData['__EMPTY'] || '';
              data['단위'] = item.originalData['__EMPTY_1'] || '';
              data['임금'] = item.originalData['__EMPTY_2'] || 0;
              data['비고'] = item.originalData['__EMPTY_3'] || '';
            } else {
              // 필드명이 없는 경우 기본 정보 사용
              data['직종'] = item.jobTitle || '';
              data['작업유형'] = item.workType || '';
              data['단위'] = '인';
              data['임금'] = item.wage || 0;
              data['비고'] = '';
            }
            
            return data;
          });
        
        // 정제된 데이터로 워크시트 생성
        const laborWS = XLSX.utils.json_to_sheet(filteredData);
        
        // 숫자 셀에 통화 형식 스타일 적용
        applyCurrencyFormat(laborWS);
        
        // 열 너비 설정
        const laborColWidths = [
          { wch: 25 }, // 직종
          { wch: 20 }, // 작업유형
          { wch: 8 },  // 단위
          { wch: 12 }, // 임금
          { wch: 15 }  // 비고
        ];
        laborWS['!cols'] = laborColWidths;
        
        // 테두리 정보 설정 (노임데이터)
        applyBordersToSheet(laborWS, filteredData.length + 1);
        
        XLSX.utils.book_append_sheet(wb, laborWS, '노임데이터');
      }
      
      // 엑셀 파일 다운로드
      const fileName = `PE라이너_${projectDetails.projectName}_내역서_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('엑셀 다운로드 중 오류:', err);
      setError('엑셀 파일 생성 중 오류가 발생했습니다.');
    }
  };

  // 엑셀 시트에 테두리 적용 함수
  function applyBordersToSheet(ws: XLSX.WorkSheet, rowCount: number) {
    if (!ws['!ref']) return;
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    const colCount = range.e.c + 1;
    
    // 셀 스타일 설정
    if (!ws['!cols']) ws['!cols'] = Array(colCount).fill({ wch: 12 });
    
    // 데이터 영역에 대한 스타일 설정 (테두리 등)
    for (let r = 0; r < rowCount; r++) {
      if (!ws['!rows']) ws['!rows'] = [];
      if (!ws['!rows'][r]) ws['!rows'][r] = {};
      
      // 첫 번째 행은 헤더로 배경색 설정
      if (r === 0) {
        ws['!rows'][r].hpt = 25; // 헤더 행 높이
      }
    }
  }

  // 워크시트의 숫자 셀에 통화 형식 적용 함수
  function applyCurrencyFormat(ws: XLSX.WorkSheet) {
    if (!ws['!ref']) return;
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // 각 셀 순회
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellAddress];
        
        if (cell && typeof cell.v === 'number' && cell.v !== 0) {
          // 숫자 셀에 통화 형식 스타일 적용
          if (!cell.z) {
            cell.z = '#,##0'; // 천 단위 구분 형식 지정
          }
        }
      }
    }
  }

  // 중기사용료 데이터 처리 함수 
  function processMachineryDataForExcel() {
    try {
      // 세션 스토리지에서 중기사용료 데이터 가져오기
      const sessionData = sessionStore.getMachineryTableData();
      if (sessionData && Object.keys(sessionData).length > 0) {
        console.log('세션스토리지에서 중기사용료 데이터 로드 성공:', Object.keys(sessionData).length);
        return sessionData;
      }
      
      // 세션 스토리지에서 데이터가 없는 경우 DB에서 가져오기
      const dbData = db.getMachineryData();
      if (!dbData || dbData.length === 0) {
        console.log('DB에서 중기사용료 데이터를 찾을 수 없습니다.');
        return null;
      }
      
      // 중기명으로 그룹화된 데이터
      const groupedData: { [key: string]: any[] } = {};
      let currentMachine = '';
      
      // DB 데이터 순회하면서 중기별 데이터 구성
      dbData.forEach(item => {
        // 새 중기 시작
        if (item.name && 
            item.originalData && 
            item.originalData['중기사용료'] === '중 기 명') {
          if (item.name.trim() !== '') {
            currentMachine = item.name;
            if (!groupedData[currentMachine]) {
              groupedData[currentMachine] = [];
            }
          }
        } 
        // 중기 항목 추가
        else if (currentMachine) {
          // 특정 구분 항목인 경우
          if (item.originalData && (
            item.originalData['중기사용료'] === '재 료 비' || 
            item.originalData['중기사용료'] === '노 무 비' || 
            item.originalData['중기사용료'] === '경    비' ||
            item.originalData['__EMPTY'] === '소   계' || 
            item.originalData['__EMPTY'] === '총   계' ||
            item.originalData['__EMPTY'] === '잡    품' ||
            item.originalData['__EMPTY'] === '경    유' ||
            item.originalData['__EMPTY'] === '화물차운전사'
          )) {
            // 구분 결정
            let 구분 = '';
            let 항목 = '';
            
            if (item.originalData['중기사용료'] === '재 료 비') {
              구분 = '재료비';
              항목 = '재료비';
            }
            else if (item.originalData['중기사용료'] === '노 무 비') {
              구분 = '노무비';
              항목 = '노무비';
            }
            else if (item.originalData['중기사용료'] === '경    비') {
              구분 = '경비';
              항목 = '경비';
            }
            else if (item.originalData['__EMPTY'] === '소   계') {
              구분 = '소계';
            }
            else if (item.originalData['__EMPTY'] === '총   계') {
              구분 = '총계';
            }
            else {
              구분 = '경비';
              항목 = item.originalData['__EMPTY'] || item.name || '';
            }
            
            // 항목 추가
            const newItem = {
              구분: 구분,
              항목: 항목,
              규격: item.originalData['__EMPTY_1'] || '',
              수량: item.originalData['__EMPTY_2'] || '',
              단위: item.originalData['__EMPTY_3'] || '',
              단가: item.originalData['__EMPTY_4'] || '',
              금액: item.originalData['__EMPTY_5'] || item.price || 0
            };
            
            groupedData[currentMachine].push(newItem);
          }
        }
      });
      
      console.log('DB에서 중기사용료 데이터 가공 완료:', Object.keys(groupedData).length);
      return groupedData;
    } catch (error) {
      console.error('중기사용료 데이터 처리 중 오류:', error);
      return null;
    }
  }

  // 세션 데이터 초기화 함수
  const resetSessionData = () => {
    // 세션 데이터 초기화
    sessionStore.clearSessionData();
    
    // 상태 초기화
    setGroupData([]);
    setDocumentItems([]);
    setProjectDetails({
      projectName: '',
    });
    
    // 성공 메시지 표시
    setError('');
    alert('모든 임시 데이터가 초기화되었습니다.');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">내역서 만들기</h2>
      
      <Card className="shadow-md">
      <CardHeader className="bg-blue-50 py-3">
          <CardTitle className="text-lg">내역서 생성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          {/* 규격 추가 버튼 */}
          <div className="flex items-center space-x-4 mb-4">
            <Button 
              type="button" 
              onClick={toggleSpecsMode}
              className={`bg-white text-black shadow-md border-2 ${hasSpecs ? 'border-blue-600' : 'border-gray-500'}`}
            >
              규격 추가
            </Button>
            {hasSpecs && (
              <Button 
                type="button" 
                onClick={addSpecInfo}
                style={{ backgroundColor: '#16a34a' }}
                className="text-white hover:bg-green-500 shadow-md border-2 border-green-700"
              >
                <Plus size={16} /> 규격정보 추가
              </Button>
            )}
          </div>

          {/* 프로젝트명 입력 */}
          <div className="mt-4">
            <Label htmlFor="projectName" className="text-base font-medium">시행공사명</Label>
            <Input 
              id="projectName" 
              name="projectName" 
              value={projectDetails.projectName} 
              onChange={handleProjectChange} 
              placeholder="공사명을 입력하세요" 
              className="h-10 text-base"
              autoComplete="off"
            />
          </div>

          {/* 규격이 없는 경우 기본 작업정보 입력 */}
          {!hasSpecs && (
            <div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="h-full">
                  <Label htmlFor="totalLength" className="text-base font-medium block mb-0.5">작업 총길이 (m)</Label>
                  <Input 
                    id="totalLength" 
                    name="totalLength" 
                    type="number" 
                    value={defaultWorkInfo.totalLength || ''} 
                    onChange={handleDefaultWorkInfoChange} 
                    placeholder="입력하세요" 
                    className="h-10 text-base w-full"
                    autoComplete="off"
                  />
                </div>
                <div className="h-full">
                  <Label htmlFor="workHoles" className="text-base font-medium block mb-0.5">작업 구멍수 (개소)</Label>
                  <Input 
                    id="workHoles" 
                    name="workHoles" 
                    type="number" 
                    value={defaultWorkInfo.workHoles || ''} 
                    onChange={handleDefaultWorkInfoChange} 
                    placeholder="입력하세요" 
                    className="h-10 text-base w-full"
                    autoComplete="off"
                  />
                </div>
                <div className="h-full">
                  <Label htmlFor="bendCount" className="text-base font-medium block mb-0.5">곡관 작업수 (개소)</Label>
                  <Input 
                    id="bendCount" 
                    name="bendCount" 
                    type="number" 
                    value={defaultWorkInfo.bendCount || ''} 
                    onChange={handleDefaultWorkInfoChange} 
                    placeholder="입력하세요" 
                    className="h-10 text-base w-full"
                    autoComplete="on"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 규격 정보 입력 (규격이 추가된 경우) */}
          {hasSpecs && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-4">
                {specInfos.map((spec) => (
                  <div key={spec.id} className="border border-gray-200 rounded-lg p-4 w-[calc(50%-0.5rem)] bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex-1">
                        <Label htmlFor={`specName-${spec.id}`} className="text-sm font-medium block mb-0.5">규격정보</Label>
                        <Input 
                          id={`specName-${spec.id}`}
                          value={spec.name} 
                          onChange={(e) => handleSpecChange(spec.id, 'name', e.target.value)} 
                          placeholder="규격정보 입력 (예: D700mm)" 
                          className="h-9 text-sm"
                        />
                      </div>
                      <Button 
                        type="button" 
                        onClick={() => deleteSpecInfo(spec.id)}
                        className="bg-red-500 hover:bg-red-600 text-white h-9 ml-2 px-2 shadow-sm border border-gray-300"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <Label htmlFor={`totalLength-${spec.id}`} className="text-xs font-medium block mb-0.5">작업 총길이 (m)</Label>
                        <Input 
                          id={`totalLength-${spec.id}`}
                          type="number" 
                          value={spec.totalLength || ''} 
                          onChange={(e) => handleSpecChange(spec.id, 'totalLength', e.target.value)} 
                          placeholder="입력하세요" 
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`workHoles-${spec.id}`} className="text-xs font-medium block mb-0.5">작업 구멍수 (개소)</Label>
                        <Input 
                          id={`workHoles-${spec.id}`}
                          type="number" 
                          value={spec.workHoles || ''} 
                          onChange={(e) => handleSpecChange(spec.id, 'workHoles', e.target.value)} 
                          placeholder="입력하세요" 
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`bendCount-${spec.id}`} className="text-xs font-medium block mb-0.5">곡관 작업수 (개소)</Label>
                        <Input 
                          id={`bendCount-${spec.id}`}
                          type="number" 
                          value={spec.bendCount || ''} 
                          onChange={(e) => handleSpecChange(spec.id, 'bendCount', e.target.value)} 
                          placeholder="입력하세요" 
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button 
              onClick={generateDocument}
              style={{ backgroundColor: '#2563eb' }}
              className="text-white flex items-center gap-2 py-2 h-11 text-base px-6 hover:bg-blue-600 shadow-md border-2 border-blue-700 font-bold"
            >
              <RefreshCw size={18} />
              <span>내역서 생성</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {documentItems.length > 0 && (
        <Card className="shadow-md border-blue-100">
          <CardHeader className="bg-blue-100 py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">내역서</CardTitle>
            <Button 
              onClick={downloadExcel}
              style={{ backgroundColor: '#16a34a' }}
              className="text-white flex gap-2 items-center px-4 py-2 h-12 rounded-md shadow-md border-2 border-green-700 hover:bg-green-500"
            >
              <FileSpreadsheet size={16} />
              <span>엑셀로 다운로드</span>
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>No</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>공 종 명</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>규 격</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>수량</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>단위</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" colSpan={2}>합 계</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" colSpan={2}>재 료 비</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" colSpan={2}>노 무 비</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" colSpan={2}>경 비</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center" rowSpan={2}>비 고</th>
                </tr>
                <tr>
                  <th className="px-3 py-2 border text-sm font-medium text-center">단 가</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">금 액</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">단 가</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">금 액</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">단 가</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">금 액</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">단 가</th>
                  <th className="px-3 py-2 border text-sm font-medium text-center">금 액</th>
                </tr>
              </thead>
              <tbody>
                {/* 프로젝트명 행 (첫 번째 행) */}
                {documentItems.length > 0 && (
                  <tr className="bg-blue-100 font-bold text-blue-900">
                    <td className="px-3 py-2 border text-sm text-center"></td>
                    <td className="px-3 py-2 border text-sm font-semibold text-left text-lg">{documentItems[0].공종명}</td>
                    <td className="px-3 py-2 border text-sm text-left">{documentItems[0].규격}</td>
                    <td className="px-3 py-2 border text-sm text-center">{documentItems[0].수량}</td>
                    <td className="px-3 py-2 border text-sm text-center">{documentItems[0].단위}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].합계단가)}</td>
                    <td className="px-3 py-2 border text-sm text-right font-medium">{formatNumber(documentItems[0].합계금액)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].재료비단가)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].재료비금액)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].노무비단가)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].노무비금액)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].경비단가)}</td>
                    <td className="px-3 py-2 border text-sm text-right">{formatNumber(documentItems[0].경비금액)}</td>
                    <td className="px-3 py-2 border text-sm text-center">{documentItems[0].비고 || ''}</td>
                  </tr>
                )}
                
                {/* 나머지 항목 (1부터 시작하는 번호 부여) */}
                {documentItems.slice(1).map((item, idx) => {
                  // 규격 매칭 여부에 따라 스타일 적용
                  const rowStyle = item.isSpecMatched === false ? 'bg-red-50' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50');
                  
                  return (
                    <tr key={idx} className={rowStyle}>
                      <td className="px-3 py-2 border text-sm text-center">{idx + 1}</td>
                      <td className="px-3 py-2 border text-sm font-semibold text-left">{item.공종명}</td>
                      <td className="px-3 py-2 border text-sm text-left">{item.규격}</td>
                      <td className="px-3 py-2 border text-sm text-center">{item.수량}</td>
                      <td className="px-3 py-2 border text-sm text-center">{item.단위}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.합계단가)}</td>
                      <td className="px-3 py-2 border text-sm text-right font-medium">{formatNumber(item.합계금액)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.재료비단가)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.재료비금액)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.노무비단가)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.노무비금액)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.경비단가)}</td>
                      <td className="px-3 py-2 border text-sm text-right">{formatNumber(item.경비금액)}</td>
                      <td className="px-3 py-2 border text-sm text-center">{item.비고 || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 