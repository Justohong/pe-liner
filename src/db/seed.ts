import { db, closeConnection } from './index';
import { PriceList, SurchargeRules, OverheadRules } from '@/db/schema';
import fs from 'fs';
import csvParser from 'csv-parser';
import dotenv from 'dotenv';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { eq } from 'drizzle-orm';

// .env 파일 로드
dotenv.config();

// --- 데이터 파일 경로 설정 ---
const DATA_DIR = './public/data';
const MATERIAL_FILE = path.join(DATA_DIR, 'D1200mm 주철관기준(2024).xlsx - 자재.csv');
const LABOR_FILE = path.join(DATA_DIR, 'D1200mm 주철관기준(2024).xlsx - 노임.csv');
const EQUIPMENT_FILE = path.join(DATA_DIR, 'D1200mm 주철관기준(2024).xlsx - 중기사용료.csv');
const OVERHEAD_FILE = path.join(DATA_DIR, '경비.csv');

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

// 기본 간접비 데이터 (CSV 파일이 없을 경우 사용)
const DEFAULT_OVERHEAD = [
  { itemName: '산재보험료', basis: 'direct_labor_cost', rate: 0.0319 },
  { itemName: '고용보험료', basis: 'direct_labor_cost', rate: 0.0085 },
  { itemName: '안전관리비', basis: 'total_direct_cost', rate: 0.018 },
  { itemName: '이윤', basis: 'total_direct_cost', rate: 0.12 },
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
 * OverheadRules 테이블을 초기화하는 함수
 */
async function clearOverheadRules() {
  console.log('Clearing OverheadRules table...');
  try {
    await db.delete(OverheadRules);
  } catch (error) {
    console.error('Error clearing OverheadRules table:', error);
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
 * 간접비(경비) 데이터를 시딩하는 함수
 */
async function seedOverheadRules() {
  console.log('Seeding overhead rules...');
  try {
    let values: any[] = [];
    
    // CSV 파일에서 데이터 읽기 시도
    if (fileExists(OVERHEAD_FILE)) {
      const content = fs.readFileSync(OVERHEAD_FILE);
      const records = parse(content, { 
        columns: true, 
        skip_empty_lines: true,
        trim: true
      });
      
      if (records.length > 0) {
        values = records.map((record: any) => ({
          itemName: record['항목명'],
          basis: record['적용기준'],
          rate: parseFloat(record['요율']) || 0
        }));
      }
    }
    
    // CSV 파일이 없거나 비어있으면 기본 데이터 사용
    if (values.length === 0) {
      console.log('Using default overhead data');
      values = DEFAULT_OVERHEAD;
    }

    if (values.length > 0) {
      await db.insert(OverheadRules).values(values).onConflictDoNothing();
      console.log(`${values.length} overhead rules seeded.`);
    } else {
      console.warn('삽입할 간접비 규칙이 없습니다.');
    }
  } catch (error) {
    console.error('Error seeding overhead rules:', error);
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
    await clearPriceList();
    await clearSurchargeRules();
    await clearOverheadRules();

    // 기본 데이터 시딩
    await seedMaterials();
    await seedLabor();
    await seedEquipment();
    
    // 간접비 및 할증 규칙 시딩
    await seedOverheadRules();
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