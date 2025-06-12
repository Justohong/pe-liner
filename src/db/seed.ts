import { db, closeConnection } from './index';
import { PriceList, UnitPriceRules, SurchargeRules } from './schema';
import fs from 'fs';
import csvParser from 'csv-parser';
import dotenv from 'dotenv';
import path from 'path';
import { parse } from 'csv-parse/sync';

// .env 파일 로드
dotenv.config();

// --- 데이터 파일 경로 설정 ---
const DATA_DIR = './public/data';
const MATERIAL_FILE = path.join(DATA_DIR, 'D1200mm 주철관기준(2024).xlsx - 자재.csv');
const LABOR_FILE = path.join(DATA_DIR, 'D1200mm 주철관기준(2024).xlsx - 노임.csv');
const EQUIPMENT_FILE = path.join(DATA_DIR, 'D1200mm 주철관기준(2024).xlsx - 중기사용료.csv');
const UNIT_PRICE_SHEET_FILE = path.join(DATA_DIR, '일위대가_호표.csv');

// 기본 데이터 (CSV 파일이 없을 경우 사용)
const DEFAULT_MATERIALS = [
  { itemCode: 'M0001', itemName: 'PE 라이너', unit: 'm', unitPrice: 15000, type: 'material' },
  { itemCode: 'M0002', itemName: '에폭시 수지', unit: 'kg', unitPrice: 8000, type: 'material' },
  { itemCode: 'M0003', itemName: '접착제', unit: 'kg', unitPrice: 12000, type: 'material' },
];

const DEFAULT_LABOR = [
  { itemCode: 'L0001', itemName: '특별인부', unit: '인', unitPrice: 120000, type: 'labor' },
  { itemCode: 'L0002', itemName: '보통인부', unit: '인', unitPrice: 100000, type: 'labor' },
  { itemCode: 'L0003', itemName: '배관공', unit: '인', unitPrice: 150000, type: 'labor' },
];

const DEFAULT_EQUIPMENT = [
  { itemCode: 'E0001', itemName: '라이닝기', unit: '시간', unitPrice: 50000, type: 'equipment' },
  { itemCode: 'E0002', itemName: '공기압축기', unit: '시간', unitPrice: 30000, type: 'equipment' },
  { itemCode: 'E0003', itemName: '1톤 트럭', unit: '시간', unitPrice: 25000, type: 'equipment' },
];

/**
 * PriceList 테이블을 초기화(모든 데이터 삭제)하는 함수
 */
async function clearPriceList() {
  console.log('Clearing PriceList table...');
  try {
    await db.delete(PriceList);
  } catch (error) {
    console.error('Error clearing PriceList table:', error);
    console.log('Continuing with seeding...');
  }
}

/**
 * UnitPriceRules 테이블을 초기화하는 함수
 */
async function clearUnitPriceRules() {
  console.log('Clearing UnitPriceRules table...');
  try {
    await db.delete(UnitPriceRules);
  } catch (error) {
    console.error('Error clearing UnitPriceRules table:', error);
    console.log('Continuing with seeding...');
  }
}

/**
 * SurchargeRules 테이블을 초기화하는 함수
 */
async function clearSurchargeRules() {
  console.log('Clearing SurchargeRules table...');
  try {
    await db.delete(SurchargeRules);
  } catch (error) {
    console.error('Error clearing SurchargeRules table:', error);
    console.log('Continuing with seeding...');
  }
}

/**
 * 파일 존재 여부 확인
 */
function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * CSV 파일을 파싱하는 함수
 */
function parseCSVFile(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!fileExists(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return resolve([]);
    }

    const results: any[] = [];
    
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => {
        console.error(`Error parsing CSV file ${filePath}:`, error);
        resolve([]);
      });
  });
}

/**
 * 자재 데이터를 시딩하는 함수
 */
async function seedMaterials() {
  console.log('Seeding materials...');
  try {
    let values: any[] = [];
    
    // CSV 파일에서 데이터 읽기 시도
    const records = await parseCSVFile(MATERIAL_FILE);
    
    if (records.length > 0) {
      values = records.map((record: any, index: number) => ({
        itemCode: `M${(index + 1).toString().padStart(4, '0')}`,
        itemName: record['품명'],
        unit: record['단위'],
        unitPrice: parseInt(record['단가'].replace(/,/g, '')) || 0,
        type: 'material',
      }));
    } else {
      // CSV 파일이 없거나 비어있으면 기본 데이터 사용
      console.log('Using default material data');
      values = DEFAULT_MATERIALS;
    }

    if (values.length > 0) {
      await db.insert(PriceList).values(values).onConflictDoNothing();
    }
    console.log(`${values.length} materials seeded.`);
  } catch (error) {
    console.error('Error seeding materials:', error);
  }
}

/**
 * 노임 데이터를 시딩하는 함수
 */
async function seedLabor() {
  console.log('Seeding labor rates...');
  try {
    let values: any[] = [];
    
    // CSV 파일에서 데이터 읽기 시도
    const records = await parseCSVFile(LABOR_FILE);
    
    if (records.length > 0) {
      values = records.map((record: any, index: number) => ({
        itemCode: `L${(index + 1).toString().padStart(4, '0')}`,
        itemName: record['직종명'],
        unit: '인',
        unitPrice: parseInt(record['공표노임'].replace(/,/g, '')) || 0,
        type: 'labor',
      }));
    } else {
      // CSV 파일이 없거나 비어있으면 기본 데이터 사용
      console.log('Using default labor data');
      values = DEFAULT_LABOR;
    }
    
    if (values.length > 0) {
      await db.insert(PriceList).values(values).onConflictDoNothing();
    }
    console.log(`${values.length} labor rates seeded.`);
  } catch (error) {
    console.error('Error seeding labor rates:', error);
  }
}

/**
 * 중기사용료 데이터를 시딩하는 함수
 */
async function seedEquipment() {
  console.log('Seeding equipment rates...');
  try {
    let values: any[] = [];
    
    // CSV 파일에서 데이터 읽기 시도
    const records = await parseCSVFile(EQUIPMENT_FILE);
    
    if (records.length > 0) {
      values = records.map((record: any, index: number) => ({
        itemCode: `E${(index + 1).toString().padStart(4, '0')}`,
        itemName: record['자재명'],
        unit: record['단위'],
        unitPrice: parseInt(record['가격'].replace(/,/g, '')) || 0,
        type: 'equipment',
      }));
    } else {
      // CSV 파일이 없거나 비어있으면 기본 데이터 사용
      console.log('Using default equipment data');
      values = DEFAULT_EQUIPMENT;
    }

    if (values.length > 0) {
      await db.insert(PriceList).values(values).onConflictDoNothing();
    }
    console.log(`${values.length} equipment rates seeded.`);
  } catch (error) {
    console.error('Error seeding equipment rates:', error);
  }
}

/**
 * 일위대가_호표.csv 파일을 읽어 UnitPriceRules 테이블에 데이터를 채우는 함수
 */
async function seedUnitPriceRulesFromExcel() {
  console.log('Seeding Unit Price Rules from Excel...');
  
  try {
    if (!fileExists(UNIT_PRICE_SHEET_FILE)) {
      console.warn(`일위대가 호표 파일을 찾을 수 없습니다: ${UNIT_PRICE_SHEET_FILE}`);
      return;
    }

    // 1. 일위대가_호표.csv 파일 읽기
    const content = fs.readFileSync(UNIT_PRICE_SHEET_FILE);
    const records = parse(content, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true
    });

    // 2. PriceList 테이블에서 모든 항목 조회하여 매핑 테이블 생성
    const priceListItems = await db.select().from(PriceList);
    
    // 품명과 규격을 기준으로 itemCode를 찾기 위한 맵 생성
    const itemCodeMap = new Map();
    
    // 품명만으로 itemCode를 찾기 위한 백업 맵 생성
    const itemNameMap = new Map();
    
    priceListItems.forEach(item => {
      // 품명+규격 조합으로 맵 생성 (더 정확한 매칭을 위해)
      const key = `${item.itemName}|${item.type}`;
      itemCodeMap.set(key, item.itemCode);
      
      // 품명만으로도 맵 생성 (백업용)
      itemNameMap.set(item.itemName, {
        itemCode: item.itemCode,
        type: item.type
      });
    });

    const rulesToInsert = [];
    let currentGroupInfo = { 
      pipeType: 'ductile',  // 기본값은 주철관
      minDiameter: 0, 
      maxDiameter: 0, 
      description: '' 
    };
    
    // 파일명에서 관종 정보 추출 시도
    if (UNIT_PRICE_SHEET_FILE.toLowerCase().includes('강관')) {
      currentGroupInfo.pipeType = 'steel';
    }

    console.log('Processing unit price sheet records...');
    for (const record of records) {
      // 3. 그룹 행(예: "No. 1 관 갱생공 (D300)")을 만나면, 현재 작업의 관종/관경 정보 업데이트
      if (record['공종'] && record['공종'].trim().startsWith('No.')) {
        const title = record['공종'].trim();
        console.log(`Processing group: ${title}`);
        
        // 관종 정보 (파일명이나 그룹 제목에서 추출)
        // 기본값은 주철관(ductile)으로 설정
        currentGroupInfo.pipeType = 'ductile';
        
        // 그룹 제목에서 관종 정보 추출 시도
        if (title.includes('강관')) {
          currentGroupInfo.pipeType = 'steel';
        }
        
        // 관경 정보 추출 (예: "D300"에서 300 추출)
        const diameterMatch = title.match(/D(\d+)/i);
        if (diameterMatch && diameterMatch[1]) {
          const diameter = parseInt(diameterMatch[1]);
          currentGroupInfo.minDiameter = diameter;
          currentGroupInfo.maxDiameter = diameter;
          currentGroupInfo.description = title;
          console.log(`  - Pipe type: ${currentGroupInfo.pipeType}, Diameter: ${diameter}mm`);
        } else {
          console.warn(`  - 관경 정보를 찾을 수 없습니다: ${title}`);
        }
        continue;
      }

      // 4. 일반 항목 행(재료비, 노무비 등) 처리
      const itemName = record['품명']?.trim();
      const spec = record['규격']?.trim() || '';
      const quantity = parseFloat(record['수량']?.replace(',', '.')) || 0;

      if (!itemName || quantity <= 0) {
        continue; // 품명이 없거나 수량이 0이하인 행은 건너뜀
      }

      // 품명과 타입을 기준으로 itemCode 찾기
      let itemCode = null;
      let itemType = null;
      
      // 1단계: 품명을 기준으로 PriceList에서 매칭 시도
      const itemInfo = itemNameMap.get(itemName);
      if (itemInfo) {
        itemCode = itemInfo.itemCode;
        itemType = itemInfo.type;
      }
      
      // 2단계: 품명+타입 조합으로 매칭 시도 (더 정확한 매칭)
      ['material', 'labor', 'equipment'].forEach(type => {
        const key = `${itemName}|${type}`;
        if (itemCodeMap.has(key)) {
          itemCode = itemCodeMap.get(key);
          itemType = type;
        }
      });
      
      if (itemCode) {
        // 규칙 객체 생성
        const rule = {
          description: `${currentGroupInfo.description} - ${itemName}${spec ? ` (${spec})` : ''}`,
          pipeType: currentGroupInfo.pipeType,
          minDiameter: currentGroupInfo.minDiameter,
          maxDiameter: currentGroupInfo.maxDiameter,
          itemCode: itemCode,
          quantity: quantity
        };
        
        rulesToInsert.push(rule);
        console.log(`  - Added rule: ${itemName}, quantity: ${quantity}, type: ${itemType}`);
      } else {
        console.warn(`  - PriceList에서 품목을 찾을 수 없습니다: ${itemName}${spec ? ` (${spec})` : ''}`);
      }
    }
    
    // 5. DB에 최종 데이터 삽입
    if (rulesToInsert.length > 0) {
      await db.insert(UnitPriceRules).values(rulesToInsert).onConflictDoNothing();
      console.log(`${rulesToInsert.length} unit price rules from Excel seeded.`);
    } else {
      console.warn('삽입할 규칙이 없습니다.');
    }
  } catch (error) {
    console.error('Error seeding unit price rules from Excel:', error);
  }
}

/**
 * SurchargeRules 시딩 함수
 */
async function seedSurchargeRules() {
  console.log('Seeding surcharge rules...');
  try {
    const rules = [
      { condition: 'riser', description: '입상관 30% 할증', surchargeType: 'percentage', value: 1.3, target: 'labor_cost' },
    ];
    await db.insert(SurchargeRules).values(rules).onConflictDoNothing();
    console.log(`${rules.length} surcharge rules seeded.`);
  } catch (error) {
    console.error('Error seeding surcharge rules:', error);
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('Seeding process started.');

  try {
    // 테이블 초기화
    await clearUnitPriceRules();
    await clearSurchargeRules();
    await clearPriceList();

    // 기본 데이터 시딩
    await seedMaterials();
    await seedLabor();
    await seedEquipment();
    
    // 기존 seedUnitPriceRules() 대신 새로운 함수 사용
    await seedUnitPriceRulesFromExcel();
    
    await seedSurchargeRules();

    console.log('Seeding process completed successfully.');
  } catch (error) {
    console.error('Error during seeding process:', error);
  } finally {
    await closeConnection();
  }
}

// 스크립트가 직접 실행될 때만 메인 함수 실행
if (require.main === module) {
  main();
}

export { main }; 