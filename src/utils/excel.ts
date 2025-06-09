import * as XLSX from 'xlsx';
import { db } from '@/utils/db';

export interface ExcelProcessResult {
  success: boolean;
  data?: {
    machinery?: any[];
    machineBase?: any[];
    material?: any[];
    labor?: any[];
    [key: string]: any[] | undefined;
  };
  error?: string;
}

/**
 * Excel 파일을 처리하여 JSON 데이터로 변환합니다.
 */
export async function processExcelFile(file: File): Promise<ExcelProcessResult> {
  try {
    const data = await readMultiSheetExcelFile(file);
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Excel 파일 처리 중 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * Excel 파일의 여러 시트를 읽어 JSON 형태로 변환합니다.
 */
async function readMultiSheetExcelFile(file: File): Promise<{ [key: string]: any[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetData: { [key: string]: any[] } = {};
        
        // 시트 매핑 정보
        const sheetMapping: { [key: string]: string } = {
          "중기사용료": "machinery",
          "중기기초자료": "machineBase",
          "자재": "material",
          "노임": "labor",
          "일위대가_호표": "unitPriceSheet"  // 일위대가_호표 시트 추가
        };
        
        // 각 시트를 처리하여 데이터 추출
        workbook.SheetNames.forEach(sheetName => {
          const mappedKey = sheetMapping[sheetName];
          
          if (mappedKey) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // 필터링된 데이터를 저장합니다
            sheetData[mappedKey] = jsonData;
          }
        });
        
        resolve(sheetData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 중기사용료 데이터를 그룹화하여 가공합니다.
 * 주의: 이 함수는 더 이상 사용되지 않습니다. 컴포넌트 내부의 processExcelMachineryData 함수를 사용하세요.
 */
export function processMachineryData(data: any[]): { [key: string]: any[] } {
  console.warn('경고: processMachineryData 함수는 더 이상 사용되지 않습니다. MachineryTable 컴포넌트 내부 함수를 직접 사용하도록 변경되었습니다.');
  
  // DB에 필요한 데이터 로드
  const machineBaseData = db.getMachineBaseData();
  const materialData = db.getMaterialData();
  const laborData = db.getLaborData();
  
  console.log('DB 데이터 로드:', {
    machineBase: machineBaseData.length,
    material: materialData.length,
    labor: laborData.length
  });
  
  const groupedData: { [key: string]: any[] } = {};
  let currentMachineName = '';
  let currentItems: any[] = [];
  
  // 중기명으로 그룹화
  data.forEach(item => {
    // 새로운 중기명을 찾은 경우
    if (item['중기사용료'] === '중 기 명' && item['__EMPTY']) {
      // 이전 그룹이 있으면 저장
      if (currentMachineName && currentItems.length > 0) {
        // 소계와 총계 재계산
        recalculateTotals(currentItems);
        groupedData[currentMachineName] = [...currentItems];
      }
      
      // 새 그룹 시작
      currentMachineName = item['__EMPTY'];
      currentItems = [];
    } 
    // 현재 그룹에 아이템 추가
    else if (currentMachineName) {
      // 구분, 항목, 수량, 단위, 단가, 금액 정보가 있는 항목만 추가
      if (
        (item['중기사용료'] === '경    비' || 
         item['중기사용료'] === '재 료 비' || 
         item['중기사용료'] === '노 무 비' || 
         item['__EMPTY'] === '소   계' || 
         item['__EMPTY'] === '총   계' || 
         item['__EMPTY'] === '잡    품' ||
         item['__EMPTY'] === '잡유')
      ) {
        // 항목 매핑
        const mappedItem: any = {
          구분: '',
          항목: '',
          규격: '',
          수량: '',
          단위: '',
          단가: '',
          금액: ''
        };
        
        // 구분 설정
        if (item['중기사용료'] === '경    비') {
          mappedItem.구분 = '경비';
        } else if (item['중기사용료'] === '재 료 비') {
          mappedItem.구분 = '재료비';
        } else if (item['중기사용료'] === '노 무 비') {
          mappedItem.구분 = '노무비';
        } else if (item['__EMPTY'] === '소   계') {
          // 소계 항목 추가 (나중에 재계산)
          mappedItem.구분 = '소계';
          mappedItem.금액 = 0;
          currentItems.push(mappedItem);
          return;
        } else if (item['__EMPTY'] === '총   계') {
          // 총계 항목 추가 (나중에 재계산)
          mappedItem.구분 = '총계';
          mappedItem.금액 = 0;
          currentItems.push(mappedItem);
          return;
        }
        
        // 항목 내용 설정
        if (item['__EMPTY']) {
          mappedItem.항목 = item['__EMPTY'];
        }
        
        // 규격 별도 설정
        if (item['__EMPTY_1']) {
          mappedItem.규격 = item['__EMPTY_1'];
        }
        
        // 수량
        mappedItem.수량 = parseFloat(item['__EMPTY_2']) || 0;
        
        // 단위
        mappedItem.단위 = item['__EMPTY_3'] || '';
        
        // 단가 설정 (DB에서 검색)
        const unitPrice = findUnitPriceFromDB(
          mappedItem.항목, 
          mappedItem.규격, 
          mappedItem.구분, 
          machineBaseData, 
          materialData, 
          laborData
        );
        
        mappedItem.단가 = unitPrice;
        
        // 금액 계산 (수량 * 단가)
        mappedItem.금액 = mappedItem.수량 * mappedItem.단가;
        
        currentItems.push(mappedItem);
      }
    }
  });
  
  // 마지막 그룹 처리
  if (currentMachineName && currentItems.length > 0) {
    // 소계와 총계 재계산
    recalculateTotals(currentItems);
    groupedData[currentMachineName] = [...currentItems];
  }
  
  return groupedData;
}

// DB에서 항목+규격을 기준으로 단가 찾기
function findUnitPriceFromDB(
  name: string, 
  spec: string, 
  category: string, 
  machineBaseData: any[], 
  materialData: any[], 
  laborData: any[]
): number {
  // 검색을 위해 문자열 정규화 (공백 제거, 소문자 변환)
  const normalizedName = name.replace(/\s+/g, '').toLowerCase();
  const normalizedSpec = spec.replace(/\s+/g, '').toLowerCase();
  
  console.log(`DB에서 검색: "${normalizedName}" + "${normalizedSpec}" (카테고리: ${category})`);
  
  // 카테고리에 따라 다른 DB 테이블에서 검색
  if (category === '경비') {
    // 중기기초자료에서 검색
    const machineItem = machineBaseData.find(item => {
      const itemName = (item.name || '').replace(/\s+/g, '').toLowerCase();
      const itemSpec = (item.spec || '').replace(/\s+/g, '').toLowerCase();
      return itemName === normalizedName && (normalizedSpec === '' || itemSpec === normalizedSpec);
    });
    
    if (machineItem) {
      console.log(`중기기초자료 매칭됨: ${machineItem.name}, 금액: ${machineItem.hourlyRate}`);
      return machineItem.hourlyRate || 0;
    }
  } else if (category === '재료비') {
    // 자재 데이터에서 검색
    const materialItem = materialData.find(item => {
      const itemName = (item.name || '').replace(/\s+/g, '').toLowerCase();
      const itemSpec = (item.spec || '').replace(/\s+/g, '').toLowerCase();
      return itemName === normalizedName && (normalizedSpec === '' || itemSpec === normalizedSpec);
    });
    
    if (materialItem) {
      console.log(`자재 매칭됨: ${materialItem.name}, 단가: ${materialItem.price}`);
      return materialItem.price || 0;
    }
  } else if (category === '노무비') {
    // 노임 데이터에서 검색
    const laborItem = laborData.find(item => {
      const itemName = (item.jobTitle || '').replace(/\s+/g, '').toLowerCase();
      const itemWork = (item.workType || '').replace(/\s+/g, '').toLowerCase();
      return itemName === normalizedName && (normalizedSpec === '' || itemWork === normalizedSpec);
    });
    
    if (laborItem) {
      console.log(`노임 매칭됨: ${laborItem.jobTitle}, 임금: ${laborItem.wage}`);
      return laborItem.wage || 0;
    }
  }
  
  // 일치하는 항목이 없는 경우 0 반환
  console.log(`일치하는 항목 없음: ${name} (${spec})`);
  return 0;
}

// 소계와 총계 재계산
function recalculateTotals(items: any[]): void {
  // 구분별 합계 계산
  const categoryTotals: { [key: string]: number } = {};
  let grandTotal = 0;
  
  // 일반 항목의 금액 합산 (구분별)
  items.forEach(item => {
    if (item.구분 !== '소계' && item.구분 !== '총계') {
      categoryTotals[item.구분] = (categoryTotals[item.구분] || 0) + (parseFloat(item.금액) || 0);
      grandTotal += (parseFloat(item.금액) || 0);
    }
  });
  
  // 소계 항목 업데이트
  items.forEach(item => {
    if (item.구분 === '소계') {
      // 이전 구분의 소계 금액 찾기
      const previousItem = items[items.indexOf(item) - 1];
      if (previousItem && previousItem.구분 && categoryTotals[previousItem.구분]) {
        item.금액 = categoryTotals[previousItem.구분];
      }
    } else if (item.구분 === '총계') {
      item.금액 = grandTotal;
    }
  });
}

/**
 * DB에서 가져온 중기사용료 데이터를 그룹화하여 가공합니다.
 * originalData 필드에 저장된 원본 엑셀 데이터를 사용합니다.
 */
function processDbMachineryData(dbData: any[]): { [key: string]: any[] } {
  // originalData 필드로부터 엑셀 데이터 복원
  const originalExcelData = dbData.map(item => item.originalData || {});
  
  // 원본 엑셀 데이터를 그룹화하고 표준 형식으로 가공
  const groupedData: { [key: string]: any[] } = {};
  let currentMachineName = '';
  let currentItems: any[] = [];
  
  // 중기명으로 그룹화 (originalData 필드의 원본 엑셀 형식 사용)
  originalExcelData.forEach(item => {
    // 새로운 중기명을 찾은 경우
    if (item['중기사용료'] === '중 기 명' && item['__EMPTY']) {
      // 이전 그룹이 있으면 저장
      if (currentMachineName && currentItems.length > 0) {
        groupedData[currentMachineName] = [...currentItems];
      }
      
      // 새 그룹 시작
      currentMachineName = item['__EMPTY'];
      currentItems = [];
    } 
    // 현재 그룹에 아이템 추가
    else if (currentMachineName) {
      // 구분, 항목, 수량, 단위, 단가, 금액 정보가 있는 항목만 추가
      if (
        (item['중기사용료'] === '경    비' || 
         item['중기사용료'] === '재 료 비' || 
         item['중기사용료'] === '노 무 비' || 
         item['__EMPTY'] === '소   계' || 
         item['__EMPTY'] === '총   계' || 
         item['__EMPTY'] === '잡    품' ||
         item['__EMPTY'] === '잡유')
      ) {
        // 항목 매핑
        const mappedItem: any = {
          구분: '',
          항목: '',
          규격: '',
          수량: '',
          단위: '',
          단가: '',
          금액: ''
        };
        
        // 구분 설정
        if (item['중기사용료'] === '경    비') {
          mappedItem.구분 = '경비';
        } else if (item['중기사용료'] === '재 료 비') {
          mappedItem.구분 = '재료비';
        } else if (item['중기사용료'] === '노 무 비') {
          mappedItem.구분 = '노무비';
        } else if (item['__EMPTY'] === '소   계') {
          // 소계 항목 추가
          mappedItem.구분 = '소계';
          mappedItem.금액 = item['__EMPTY_5'];
          currentItems.push(mappedItem);
          return;
        } else if (item['__EMPTY'] === '총   계') {
          // 총계 항목 추가
          mappedItem.구분 = '총계';
          mappedItem.금액 = item['__EMPTY_5'];
          currentItems.push(mappedItem);
          return;
        }
        
        // 항목 내용 설정
        if (item['__EMPTY']) {
          mappedItem.항목 = item['__EMPTY'];
        }
        
        // 규격 별도 설정
        if (item['__EMPTY_1']) {
          mappedItem.규격 = item['__EMPTY_1'];
        }
        
        // 수량
        mappedItem.수량 = item['__EMPTY_2'];
        
        // 단위
        mappedItem.단위 = item['__EMPTY_3'];
        
        // 단가
        mappedItem.단가 = item['__EMPTY_4'];
        
        // 금액
        mappedItem.금액 = item['__EMPTY_5'];
        
        currentItems.push(mappedItem);
      }
    }
  });
  
  // 마지막 그룹 처리
  if (currentMachineName && currentItems.length > 0) {
    groupedData[currentMachineName] = [...currentItems];
  }
  
  // 데이터가 없거나 처리할 수 없는 경우 기본 그룹 생성
  if (Object.keys(groupedData).length === 0 && dbData.length > 0) {
    // 간단한 기본 데이터 생성 (각 장비를 별도 그룹으로)
    dbData.forEach(item => {
      const name = item.name || '장비' + Math.random().toString(36).substring(2, 7);
      const price = item.price || 0;
      
      // 기본 항목 추가
      groupedData[name] = [
        {
          구분: '경비',
          항목: name,
          규격: item.spec || '',
          수량: 1,
          단위: item.unit || 'EA',
          단가: price,
          금액: price
        },
        {
          구분: '소계',
          금액: price
        },
        {
          구분: '총계',
          금액: price
        }
      ];
    });
  }
  
  return groupedData;
}

/**
 * DB에서 가져온 중기사용료 데이터를 엑셀 형식으로 변환합니다.
 * 이 함수는 더 이상 사용되지 않지만 호환성을 위해 남겨둡니다.
 */
function convertDbMachineryDataToExcelFormat(dbData: any[]): { [key: string]: any[] } {
  return processDbMachineryData(dbData);
}

/**
 * DB에서 가져온 중기기초자료 데이터를 엑셀 형식으로 변환합니다.
 */
export function convertDbMachineBaseDataToExcelFormat(dbData: any[]): any[] {
  return dbData.map(item => ({
    명칭: item.name || '',
    규격: item.spec || '',
    연료종류: item.fuelType || '',
    연료비: item.fuelCost || 0,
    윤활유비: item.lubricantCost || 0,
    '시간당 금액': item.hourlyRate || 0
  }));
}

/**
 * DB에서 가져온 자재 데이터를 엑셀 형식으로 변환합니다.
 */
export function convertDbMaterialDataToExcelFormat(dbData: any[]): any[] {
  return dbData.map(item => ({
    분류: item.classification || '',
    품명: item.name || '',
    규격: item.spec || '',
    단위: item.unit || '',
    단가: item.price || 0
  }));
}

/**
 * DB에서 가져온 노임 데이터를 엑셀 형식으로 변환합니다.
 */
export function convertDbLaborDataToExcelFormat(dbData: any[]): any[] {
  return dbData.map(item => ({
    분류: item.classification || '',
    직종: item.jobTitle || '',
    작업유형: item.workType || '',
    임금: item.wage || 0
  }));
} 