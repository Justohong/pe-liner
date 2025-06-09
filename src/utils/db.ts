import * as XLSX from 'xlsx';

// 중기사용료 데이터 타입
export interface MachineryData {
  id?: string;
  code?: string;
  classification?: string;
  name: string;
  spec?: string;
  unit?: string;
  price: number;
  createdAt?: Date;
  표준품셈장비명?: string;
  시간당표준단가?: number;
  // 원본 엑셀 데이터를 보존하기 위한 필드 추가
  originalData?: any;
}

// 중기기초자료 데이터 타입
export interface MachineBaseData {
  id?: string;
  code?: string;
  name: string;
  spec?: string;
  fuelType?: string;
  fuelCost?: number;
  lubricantCost?: number;
  hourlyRate?: number;
  createdAt?: Date;
  표준품셈장비명?: string;
  시간당표준단가?: number;
  // 원본 엑셀 데이터를 보존하기 위한 필드 추가
  originalData?: any;
}

// 자재데이터 타입
export interface MaterialData {
  id?: string;
  code?: string;
  classification?: string;
  name: string;
  spec?: string;
  unit?: string;
  price: number;
  createdAt?: Date;
  관종분류: string;
  품명: string;
  세부종류: string;
  내면처리: string;
  호칭지름: string;
  단위중량_kg_per_m?: number;
  표준길이_m_per_본?: number;
  // 원본 엑셀 데이터를 보존하기 위한 필드 추가
  originalData?: any;
}

// 노임데이터 타입
export interface LaborData {
  id?: string;
  code?: string;
  classification?: string;
  jobTitle: string;
  workType?: string;
  wage: number;
  createdAt?: Date;
  표준품셈직종?: string;
  // 원본 엑셀 데이터를 보존하기 위한 필드 추가
  originalData?: any;
}

// DB 데이터 저장소 (localStorage 사용)
class LocalStorageDatabase {
  // 싱글톤 인스턴스
  private static instance: LocalStorageDatabase;
  
  // 데이터 저장소
  private machinery: MachineryData[] = [];
  private machineBase: MachineBaseData[] = [];
  private material: MaterialData[] = [];
  private labor: LaborData[] = [];
  
  // localStorage 키
  private readonly STORAGE_KEYS = {
    MACHINERY: 'pe-liner-machinery-data',
    MACHINE_BASE: 'pe-liner-machine-base-data',
    MATERIAL: 'pe-liner-material-data',
    LABOR: 'pe-liner-labor-data'
  };
  
  // 생성자에서 localStorage 데이터 로드
  private constructor() {
    this.loadFromLocalStorage();
  }
  
  // 싱글톤 패턴 구현
  public static getInstance(): LocalStorageDatabase {
    if (!LocalStorageDatabase.instance) {
      LocalStorageDatabase.instance = new LocalStorageDatabase();
    }
    return LocalStorageDatabase.instance;
  }
  
  // localStorage에서 데이터 로드
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return; // SSR 환경에서는 로드하지 않음
    
    try {
      const machineryData = localStorage.getItem(this.STORAGE_KEYS.MACHINERY);
      if (machineryData) {
        this.machinery = JSON.parse(machineryData);
      }
      
      const machineBaseData = localStorage.getItem(this.STORAGE_KEYS.MACHINE_BASE);
      if (machineBaseData) {
        this.machineBase = JSON.parse(machineBaseData);
      }
      
      const materialData = localStorage.getItem(this.STORAGE_KEYS.MATERIAL);
      if (materialData) {
        this.material = JSON.parse(materialData);
      }
      
      const laborData = localStorage.getItem(this.STORAGE_KEYS.LABOR);
      if (laborData) {
        this.labor = JSON.parse(laborData);
      }
      
      console.log('localStorage에서 데이터 로드 완료', {
        machinery: this.machinery.length,
        machineBase: this.machineBase.length,
        material: this.material.length,
        labor: this.labor.length
      });
    } catch (error) {
      console.error('localStorage에서 데이터 로드 중 오류:', error);
    }
  }
  
  // localStorage에 데이터 저장
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return; // SSR 환경에서는 저장하지 않음
    
    try {
      localStorage.setItem(this.STORAGE_KEYS.MACHINERY, JSON.stringify(this.machinery));
      localStorage.setItem(this.STORAGE_KEYS.MACHINE_BASE, JSON.stringify(this.machineBase));
      localStorage.setItem(this.STORAGE_KEYS.MATERIAL, JSON.stringify(this.material));
      localStorage.setItem(this.STORAGE_KEYS.LABOR, JSON.stringify(this.labor));
      console.log('localStorage에 데이터 저장 완료');
    } catch (error) {
      console.error('localStorage에 데이터 저장 중 오류:', error);
    }
  }
  
  // 중기사용료 데이터 저장
  public saveMachineryData(data: MachineryData[]): number {
    const timestamp = new Date();
    data.forEach(item => {
      this.machinery.push({
        ...item,
        id: this.generateId(),
        createdAt: timestamp
      });
    });
    this.saveToLocalStorage();
    return data.length;
  }
  
  // 중기기초자료 데이터 저장
  public saveMachineBaseData(data: MachineBaseData[]): number {
    const timestamp = new Date();
    data.forEach(item => {
      this.machineBase.push({
        ...item,
        id: this.generateId(),
        createdAt: timestamp
      });
    });
    this.saveToLocalStorage();
    return data.length;
  }
  
  // 자재데이터 저장
  public saveMaterialData(data: MaterialData[]): number {
    const timestamp = new Date();
    data.forEach(item => {
      this.material.push({
        ...item,
        id: this.generateId(),
        createdAt: timestamp
      });
    });
    this.saveToLocalStorage();
    return data.length;
  }
  
  // 노임데이터 저장
  public saveLaborData(data: LaborData[]): number {
    const timestamp = new Date();
    data.forEach(item => {
      this.labor.push({
        ...item,
        id: this.generateId(),
        createdAt: timestamp
      });
    });
    this.saveToLocalStorage();
    return data.length;
  }
  
  // ID 생성 유틸리티
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  // 중기사용료 데이터 조회
  public getMachineryData(): MachineryData[] {
    return [...this.machinery];
  }
  
  // 중기기초자료 데이터 조회
  public getMachineBaseData(): MachineBaseData[] {
    return [...this.machineBase];
  }
  
  // 자재데이터 조회
  public getMaterialData(): MaterialData[] {
    return [...this.material];
  }
  
  // 노임데이터 조회
  public getLaborData(): LaborData[] {
    return [...this.labor];
  }
  
  // 모든 데이터 삭제
  public clearAllData(): void {
    this.machinery = [];
    this.machineBase = [];
    this.material = [];
    this.labor = [];
    this.saveToLocalStorage();
  }
  
  // 카테고리별 데이터 삭제
  public clearCategoryData(category: 'machinery' | 'machineBase' | 'material' | 'labor'): void {
    switch(category) {
      case 'machinery':
        this.machinery = [];
        break;
      case 'machineBase':
        this.machineBase = [];
        break;
      case 'material':
        this.material = [];
        break;
      case 'labor':
        this.labor = [];
        break;
    }
    this.saveToLocalStorage();
  }
  
  // 엑셀 데이터 변환 및 저장 - 기존 데이터 초기화 후 저장
  public saveExcelData(data: any, clearBeforeSave: boolean = true): {
    machineryCount: number;
    machineBaseCount: number;
    materialCount: number;
    laborCount: number;
  } {
    let machineryCount = 0;
    let machineBaseCount = 0;
    let materialCount = 0;
    let laborCount = 0;
    
    // 데이터 로그 출력으로 디버깅
    console.log('SaveExcelData - 원본 데이터:', data);
    
    // 저장 전 기존 데이터 초기화 (카테고리별)
    if (clearBeforeSave) {
      if (data.machinery && Array.isArray(data.machinery)) {
        this.clearCategoryData('machinery');
        console.log('중기사용료 데이터 초기화 완료');
      }
      
      if (data.machineBase && Array.isArray(data.machineBase)) {
        this.clearCategoryData('machineBase');
        console.log('중기기초자료 데이터 초기화 완료');
      }
      
      if (data.material && Array.isArray(data.material)) {
        this.clearCategoryData('material');
        console.log('자재데이터 초기화 완료');
      }
      
      if (data.labor && Array.isArray(data.labor)) {
        this.clearCategoryData('labor');
        console.log('노임데이터 초기화 완료');
      }
    }
    
    if (data.machinery && Array.isArray(data.machinery)) {
      console.log('중기사용료 데이터 형식:', data.machinery[0]);
      
      // 입력된 데이터를 가능한 한 그대로 보존하되, 필요한 필드만 추가로 매핑
      const machineryData: MachineryData[] = data.machinery.map((item: any) => {
        // 중기명 또는 항목 추출
        let name = '';
        
        if (item['중기사용료'] === '중 기 명' && item['__EMPTY']) {
          // 중기명은 그대로 사용
          name = item['__EMPTY'];
        } else if (
          (item['중기사용료'] === '경    비' || 
           item['중기사용료'] === '재 료 비' || 
           item['중기사용료'] === '노 무 비') && 
          item['__EMPTY']
        ) {
          // 세부 항목은 그대로 사용
          name = item['__EMPTY'];
        } else {
          // 다른 경우에는 중기사용료 필드 또는 __EMPTY 필드 사용
          name = item['중기사용료'] || item['__EMPTY'] || '';
          
          // 빈 문자열이면 이전 값을 유지하고 랜덤 생성 안함
          if (!name) {
            name = '항목';
          }
        }
        
        // 금액 추출 (총계 행에서)
        const price = item['__EMPTY'] === '총   계' ? 
                      (typeof item['__EMPTY_5'] === 'number' ? item['__EMPTY_5'] : 
                      parseFloat(String(item['__EMPTY_5']).replace(/,/g, '')) || 0) : 0;
        
        // 규격 필드 추가
        const spec = item['__EMPTY_1'] || '';
        
        return {
          id: this.generateId(),
          name,
          spec,
          price,
          // 새로운 필드 추가 (엑셀 원본 또는 기본값)
          표준품셈장비명: item['표준품셈장비명'] || '', // 엑셀에 해당 컬럼명이 있다고 가정
          시간당표준단가: typeof item['시간당표준단가'] === 'number' ? item['시간당표준단가'] : parseFloat(String(item['시간당표준단가']).replace(/,/g, '')) || undefined, // 엑셀에 해당 컬럼명이 있다고 가정
          // 원본 데이터 전체를 보존
          originalData: {...item}
        };
      });
      
      console.log('처리된 중기사용료 데이터:', machineryData.length);
      machineryCount = this.saveMachineryData(machineryData);
    }
    
    if (data.machineBase && Array.isArray(data.machineBase)) {
      console.log('중기기초자료 데이터 형식:', data.machineBase[0]);
      
      const machineBaseData: MachineBaseData[] = data.machineBase.map((item: any) => {
        // 중기명 추출 (첫번째 행 헤더인 경우 제외)
        const name = item['중기기초자료'] === '명    칭' ? 
                     '헤더' : 
                     item['중기기초자료'] || '장비' + Math.random().toString(36).substring(2, 7);
        
        // 규격 추출
        const spec = item['__EMPTY'] || '';
        
        // 시간당 비용 계산 (합계 컬럼)
        const hourlyRate = typeof item['__EMPTY_5'] === 'number' ? 
                          item['__EMPTY_5'] : 
                          parseFloat(String(item['__EMPTY_5']).replace(/,/g, '')) || 0;
        
        return {
          name,
          spec,
          hourlyRate,
          // 새로운 필드 추가 (엑셀 원본 또는 기본값)
          표준품셈장비명: item['표준품셈장비명'] || '', // 엑셀에 해당 컬럼명이 있다고 가정
          시간당표준단가: typeof item['시간당표준단가'] === 'number' ? item['시간당표준단가'] : parseFloat(String(item['시간당표준단가']).replace(/,/g, '')) || undefined, // 엑셀에 해당 컬럼명이 있다고 가정
          // 원본 데이터 전체를 보존
          originalData: {...item}
        };
      });
      
      console.log('처리된 중기기초자료 데이터:', machineBaseData.length);
      machineBaseCount = this.saveMachineBaseData(machineBaseData);
    }
    
    if (data.material && Array.isArray(data.material)) {
      console.log('자재데이터 형식:', data.material[0]);
      
      const materialData: MaterialData[] = data.material.map((item: any) => {
        // 자재명 추출 (첫번째 행 헤더인 경우 제외)
        const name = item['자재'] === '명    칭' ? 
                     '헤더' : 
                     item['자재'] || '자재' + Math.random().toString(36).substring(2, 7);
        
        // 규격 추출
        const spec = item['__EMPTY'] || '';
        
        // 단위 추출
        const unit = item['__EMPTY_1'] || '';
        
        // 단가 추출
        const price = typeof item['__EMPTY_2'] === 'number' ? 
                     item['__EMPTY_2'] : 
                     parseFloat(String(item['__EMPTY_2']).replace(/,/g, '')) || 0;
        
        return {
          name,
          spec,
          unit,
          price,
          // 새로운 필드 추가 (엑셀 원본 또는 기본값)
          관종분류: item['관종분류'] || '',
          품명: item['품명 (KS)'] || item['품명'] || '', // "품명 (KS)" 우선 사용
          세부종류: item['세부종류'] || '',
          내면처리: item['내면처리'] || '',
          호칭지름: item['호칭지름'] || '',
          단위중량_kg_per_m: typeof item['단위중량_kg_per_m'] === 'number' ? item['단위중량_kg_per_m'] : parseFloat(String(item['단위중량_kg_per_m']).replace(/,/g, '')) || undefined,
          표준길이_m_per_본: typeof item['표준길이_m_per_본'] === 'number' ? item['표준길이_m_per_본'] : parseFloat(String(item['표준길이_m_per_본']).replace(/,/g, '')) || undefined,
          // 원본 데이터 전체를 보존
          originalData: {...item}
        };
      });
      
      console.log('처리된 자재데이터:', materialData.length);
      materialCount = this.saveMaterialData(materialData);
    }
    
    if (data.labor && Array.isArray(data.labor)) {
      console.log('노임데이터 형식:', data.labor[0]);
      
      const laborData: LaborData[] = data.labor.map((item: any) => {
        // 직종명 추출 (첫번째 행 헤더인 경우 제외)
        const jobTitle = item['노임'] === '명    칭' ? 
                        '헤더' : 
                        item['노임'] || '직종' + Math.random().toString(36).substring(2, 7);
        
        // 작업유형 추출
        const workType = item['__EMPTY'] || '';
        
        // 임금 추출
        const wage = typeof item['__EMPTY_2'] === 'number' ? 
                    item['__EMPTY_2'] : 
                    parseFloat(String(item['__EMPTY_2']).replace(/,/g, '')) || 0;
        
        return {
          jobTitle,
          workType,
          wage,
          // 새로운 필드 추가 (엑셀 원본 또는 기본값)
          표준품셈직종: item['표준품셈직종'] || '', // 엑셀에 해당 컬럼명이 있다고 가정
          // 원본 데이터 전체를 보존
          originalData: {...item}
        };
      });
      
      console.log('처리된 노임데이터:', laborData.length);
      laborCount = this.saveLaborData(laborData);
    }
    
    return {
      machineryCount,
      machineBaseCount,
      materialCount,
      laborCount
    };
  }

  // 필요한 메서드 추가
  getUnitPriceSheetData() {
    try {
      const data = localStorage.getItem('pe-liner-unit-price-sheet-data');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('일위대가_호표 데이터 로드 오류:', error);
      return [];
    }
  }
}

// 데이터베이스 인스턴스 추출
export const db = LocalStorageDatabase.getInstance();

// 데이터를 데이터베이스에 저장하는 함수
export async function saveExcelDataToDb(data: any, clearBeforeSave: boolean = true): Promise<{
  success: boolean;
  counts?: {
    machineryCount: number;
    machineBaseCount: number;
    materialCount: number;
    laborCount: number;
  };
  error?: string;
}> {
  try {
    const result = db.saveExcelData(data, clearBeforeSave);
    return {
      success: true,
      counts: result
    };
  } catch (error) {
    console.error('데이터 저장 중 오류 발생:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '데이터 저장 중 오류가 발생했습니다.'
    };
  }
} 