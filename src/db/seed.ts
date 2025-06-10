import { db, closeConnection } from './index';
import { PriceList } from './schema';
import fs from 'fs';
import csvParser from 'csv-parser';
import dotenv from 'dotenv';
import path from 'path';

// .env 파일 로드
dotenv.config();

// --- 데이터 파일 경로 설정 ---
const DATA_DIR = './public/data';
const MATERIAL_FILE = path.join(DATA_DIR, 'D1200mm 주철관기준(2024).xlsx - 자재.csv');
const LABOR_FILE = path.join(DATA_DIR, 'D1200mm 주철관기준(2024).xlsx - 노임.csv');
const EQUIPMENT_FILE = path.join(DATA_DIR, 'D1200mm 주철관기준(2024).xlsx - 중기사용료.csv');

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
 * 메인 시딩 함수
 */
async function main() {
  try {
    console.log('Seeding process started.');
    
    // 1. 기존 데이터 삭제 시도
    await clearPriceList();
    
    // 2. 각 데이터 타입별로 시딩 실행
    await seedMaterials();
    await seedLabor();
    await seedEquipment();
    
    console.log('Seeding process completed successfully.');
  } catch (err) {
    console.error('An error occurred during the seeding process:', err);
    process.exit(1); // 오류와 함께 종료
  } finally {
    try {
      // 데이터베이스 연결 종료
      await closeConnection();
    } catch (err) {
      console.error('Error closing database connection:', err);
    }
    process.exit(0); // 정상 종료
  }
}

// 메인 함수 실행
if (require.main === module) {
  main();
}

export default main; 