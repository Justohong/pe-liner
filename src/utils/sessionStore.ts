// 세션 데이터 관리 클래스 (세션스토리지 사용)
export class SessionDataStore {
  private static instance: SessionDataStore;

  // 세션스토리지 키
  private readonly KEYS = {
    MACHINE_GLOBAL_VAR: 'pe-liner-machine-global-var',
    MACHINERY_TABLE_DATA: 'pe-liner-machinery-table-data',
    MACHINERY_USAGE: 'pe-liner-machinery-usage',
    UNIT_PRICE_GROUPS: 'pe-liner-unit-price-groups',
    UNIT_PRICE_SHEET_DATA: 'pe-liner-unit-price-sheet-data',
    PROJECT_DETAILS: 'pe-liner-project-details',
    DOCUMENT_ITEMS: 'pe-liner-document-items',
    DATA_UNITPRICE_SHEET: 'pe-liner-data-unitprice-sheet',
    SPEC_INFOS: 'pe-liner-spec-infos',
  };

  private constructor() {
    // 생성자
  }

  // 싱글톤 패턴
  public static getInstance(): SessionDataStore {
    if (!SessionDataStore.instance) {
      SessionDataStore.instance = new SessionDataStore();
    }
    return SessionDataStore.instance;
  }

  // 일반적인 데이터 저장 메서드
  private saveData(key: string, data: any): void {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
    } catch (error) {
      console.error(`${key} 저장 중 오류:`, error);
    }
  }

  // 일반적인 데이터 조회 메서드
  private getData(key: string, parseJson: boolean = true): any {
    if (typeof window === 'undefined') return null;
    
    try {
      const data = sessionStorage.getItem(key);
      if (!data) return null;
      return parseJson ? JSON.parse(data) : data;
    } catch (error) {
      console.error(`${key} 조회 중 오류:`, error);
      return null;
    }
  }

  // 중기전역변수 저장
  public saveMachineGlobalVar(value: number | string): void {
    this.saveData(this.KEYS.MACHINE_GLOBAL_VAR, value.toString());
  }

  // 중기전역변수 조회
  public getMachineGlobalVar(): number {
    const data = this.getData(this.KEYS.MACHINE_GLOBAL_VAR, false);
    return data ? parseFloat(data) : 0;
  }

  // 중기사용료 테이블 데이터 저장
  public saveMachineryTableData(data: any): void {
    this.saveData(this.KEYS.MACHINERY_TABLE_DATA, data);
  }

  // 중기사용료 테이블 데이터 조회
  public getMachineryTableData(): any {
    return this.getData(this.KEYS.MACHINERY_TABLE_DATA);
  }

  // 일위대가_호표 그룹 데이터 저장
  public saveUnitPriceGroups(data: any): void {
    this.saveData(this.KEYS.UNIT_PRICE_GROUPS, data);
  }

  // 일위대가_호표 그룹 데이터 조회
  public getUnitPriceGroups(): any {
    return this.getData(this.KEYS.UNIT_PRICE_GROUPS);
  }

  // 일위대가_호표 데이터 저장
  public saveUnitPriceSheetData(data: any): void {
    this.saveData(this.KEYS.UNIT_PRICE_SHEET_DATA, data);
  }

  // 일위대가_호표 데이터 조회
  public getUnitPriceSheetData(): any {
    return this.getData(this.KEYS.UNIT_PRICE_SHEET_DATA);
  }

  // 프로젝트 정보 저장
  public saveProjectDetails(data: any): void {
    this.saveData(this.KEYS.PROJECT_DETAILS, data);
  }

  // 프로젝트 정보 조회
  public getProjectDetails(): any {
    return this.getData(this.KEYS.PROJECT_DETAILS);
  }

  // 내역서 항목 저장
  public saveDocumentItems(data: any): void {
    this.saveData(this.KEYS.DOCUMENT_ITEMS, data);
  }

  // 내역서 항목 조회
  public getDocumentItems(): any {
    return this.getData(this.KEYS.DOCUMENT_ITEMS);
  }

  // 중기사용목록 저장
  public saveMachineryUsage(data: any): void {
    this.saveData(this.KEYS.MACHINERY_USAGE, data);
  }

  // 중기사용목록 조회
  public getMachineryUsage(): any {
    return this.getData(this.KEYS.MACHINERY_USAGE);
  }

  // 일위대가_호표 데이터 저장
  public saveDataUnitpriceSheet(data: any): void {
    this.saveData(this.KEYS.DATA_UNITPRICE_SHEET, data);
  }

  // 일위대가_호표 데이터 조회
  public getDataUnitpriceSheet(): any {
    return this.getData(this.KEYS.DATA_UNITPRICE_SHEET);
  }

  // 규격 정보 저장
  public saveSpecInfos(data: any): void {
    this.saveData(this.KEYS.SPEC_INFOS, data);
  }

  // 규격 정보 조회
  public getSpecInfos(): any {
    return this.getData(this.KEYS.SPEC_INFOS);
  }

  // 세션 데이터 초기화
  public clearSessionData(key?: string): void {
    if (typeof window === 'undefined') return;
    
    if (key) {
      sessionStorage.removeItem(key);
    } else {
      // 특정 키만 삭제 (localStorage에 영향 없음)
      Object.values(this.KEYS).forEach(k => {
        sessionStorage.removeItem(k);
      });
    }
  }

  // 특정 키 데이터 삭제
  public removeData(key: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(key);
  }
}

// 사용하기 쉬운 export
export const sessionStore = SessionDataStore.getInstance(); 