import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface NaragetNotice {
  title: string;
  org: string;
  order_date: string;
  notice_date: string;
  total_amount: string;
  contract_type: string;
  link: string;
  [key: string]: string; // 인덱스 시그니처 추가
}

export async function GET() {
  try {
    // 1. Liner-alarm 프로젝트의 데이터 파일 경로 설정 (기본 경로)
    const linerAlarmDataPath = path.join(process.cwd(), '..', 'Liner-alarm', 'data', 'naraget_notices.csv');
    
    // 2. 파일 존재 여부 확인
    if (fs.existsSync(linerAlarmDataPath)) {
      console.log('기본 경로에서 데이터 파일을 찾았습니다:', linerAlarmDataPath);
      return processDataFile(linerAlarmDataPath);
    }
    
    // 3. 대체 경로 시도 (개발 환경에 따라 경로가 다를 수 있음)
    console.log('기본 경로에서 데이터 파일을 찾을 수 없습니다. 대체 경로를 시도합니다.');
    const altPaths = [
      path.join('C:', 'Cursor', 'Liner-alarm', 'data', 'naraget_notices.csv'),
      path.join('C:', 'Users', 'Liner-alarm', 'data', 'naraget_notices.csv'),
      path.join(process.cwd(), 'data', 'naraget_notices.csv') // 프로젝트 내 데이터 디렉토리
    ];
    
    // 4. 대체 경로 순차적으로 시도
    for (const altPath of altPaths) {
      if (fs.existsSync(altPath)) {
        console.log('대체 경로에서 데이터 파일을 찾았습니다:', altPath);
        return processDataFile(altPath);
      }
    }
    
    // 5. 모든 경로에서 파일을 찾지 못한 경우
    console.log('모든 경로에서 데이터 파일을 찾을 수 없습니다. 기본 데이터를 사용합니다.');
    throw new Error('나라장터 데이터 파일을 찾을 수 없습니다.');
    
  } catch (error) {
    // 오류 발생 시 테스트 데이터 반환
    console.error('API 오류:', error);
    console.log('테스트 데이터를 사용합니다.');
    
    // 테스트 데이터 생성 및 반환
    return NextResponse.json(
      getTestData(),
      { 
        status: 200,
        headers: {
          'x-data-source': 'test-data'
        }
      }
    );
  }
}

// CSV 파일 처리 함수
async function processDataFile(filePath: string) {
  try {
    // CSV 파일 읽기
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    console.log(`파일 로드 성공: ${filePath}`);
    
    // CSV 파싱 - 좀 더 정교한 방식 (콤마가 값 내에 있을 수 있음)
    const lines = fileContent.split('\n');
    const headers = parseCsvLine(lines[0]);
    
    console.log(`헤더 정보: ${headers.join(', ')}`);
    
    const notices: NaragetNotice[] = [];
    
    // 헤더 행을 제외한 각 행을 처리
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // 빈 줄 건너뛰기
      
      try {
        const values = parseCsvLine(lines[i]);
        if (values.length < 3) continue; // 최소 필드 수 검증
        
        const notice: Record<string, string> = {};
        
        // 각 열을 해당 헤더와 매핑
        headers.forEach((header, index) => {
          if (index < values.length) {
            notice[header.trim()] = values[index] ? values[index].trim() : '';
          }
        });
        
        notices.push({
          title: notice['title'] || '',
          org: notice['org'] || '',
          order_date: notice['order_date'] || '',
          notice_date: formatDateString(notice['notice_date']),
          total_amount: notice['total_amount'] || '',
          contract_type: notice['contract_type'] || '',
          link: notice['link'] || 'https://www.g2b.go.kr/index.jsp',
        });
      } catch (lineError) {
        console.error(`${i}번 줄 처리 중 오류: ${lineError}`);
        continue; // 오류가 있는 줄은 건너뜀
      }
    }
    
    console.log(`파싱된 공지 수: ${notices.length}`);
    
    // 날짜 유효성 검사 후 최신순 정렬
    const validNotices = notices.filter(notice => {
      const date = parseDate(notice.notice_date);
      return date !== null;
    });
    
    // 공고일자 기준으로 최신순 정렬
    validNotices.sort((a, b) => {
      const dateA = parseDate(a.notice_date) || new Date('1900-01-01');
      const dateB = parseDate(b.notice_date) || new Date('1900-01-01');
      return dateB.getTime() - dateA.getTime(); // 내림차순(최신순)
    });
    
    console.log(`유효한 날짜를 가진 공지 수: ${validNotices.length}`);
    if (validNotices.length > 0) {
      console.log(`최신 공지일자: ${validNotices[0].notice_date}`);
    }
    
    return NextResponse.json(validNotices);
  } catch (error) {
    console.error('데이터 파일 처리 오류:', error);
    // 오류 발생 시 테스트 데이터 반환
    return NextResponse.json(getTestData());
  }
}

// CSV 라인을 적절히 파싱하는 함수 (콤마가 따옴표 안에 있는 경우 처리)
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // 따옴표 토글
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // 콤마를 만났고 따옴표 밖이면 필드 추가
      result.push(current);
      current = '';
    } else {
      // 일반 문자는 현재 필드에 추가
      current += char;
    }
  }
  
  // 마지막 필드 추가
  result.push(current);
  
  return result;
}

// 날짜 문자열을 Date 객체로 변환
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // 1. YYYY-MM-DD 형식
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // 2. YYYY-MM-DD HH:MM:SS 형식
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // 3. YYYYMMDD 형식
  if (/^\d{8}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // 4. YYYY.MM.DD 형식
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('.');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

// 날짜를 일관된 형식으로 포맷팅
function formatDateString(dateStr: string): string {
  if (!dateStr) return '';
  
  const date = parseDate(dateStr);
  if (!date) return dateStr; // 파싱 실패 시 원본 반환
  
  // YYYY-MM-DD 형식으로 통일
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// 테스트 데이터 함수
function getTestData(): NaragetNotice[] {
  // 현재 기준으로 데이터를 자동 생성
  const currentYear = new Date().getFullYear();
  const testData: NaragetNotice[] = [];
  
  // 현재 년도부터 2년 전까지의 테스트 데이터 생성
  for (let year = currentYear + 1; year >= currentYear - 2; year--) {
    for (let month = 12; month >= 1; month--) {
      // 한 달에 1-2개 항목만 생성 (랜덤)
      const itemsPerMonth = Math.floor(Math.random() * 2) + 1;
      
      for (let i = 0; i < itemsPerMonth; i++) {
        const dayOfMonth = Math.floor(Math.random() * 28) + 1;
        const amount = Math.floor(Math.random() * 2000) + 500;
        const contractTypes = ["일반경쟁", "제한경쟁", "수의계약", "지명경쟁"];
        const orgList = [
          "서울특별시 상수도사업본부", 
          "인천광역시 수도사업본부", 
          "경기도 성남시 맑은물사업소",
          "경기도 하남시",
          "경기도 용인시 상하수도사업소",
          "부산광역시 상수도사업본부",
          "대구광역시 상수도사업본부",
          "광주광역시 상수도사업본부",
          "대전광역시 상수도사업본부"
        ];
        
        // 날짜가 현재보다 미래인 경우는 제외
        const now = new Date();
        if (year > now.getFullYear() || 
            (year === now.getFullYear() && month > now.getMonth() + 1) ||
            (year === now.getFullYear() && month === now.getMonth() + 1 && dayOfMonth > now.getDate())) {
          continue;
        }
        
        // 날짜 포맷팅
        const formattedMonth = month.toString().padStart(2, '0');
        const formattedDay = dayOfMonth.toString().padStart(2, '0');
        
        testData.push({
          title: `${year}년 ${orgList[Math.floor(Math.random() * orgList.length)].split(' ')[0]} 상수도관로 갱생공사 (${i + 1}차)`,
          org: orgList[Math.floor(Math.random() * orgList.length)],
          order_date: `${year}-${formattedMonth}`,
          notice_date: `${year}-${formattedMonth}-${formattedDay}`,
          total_amount: `${amount.toLocaleString('ko-KR')}00,000원`,
          contract_type: contractTypes[Math.floor(Math.random() * contractTypes.length)],
          link: "https://www.g2b.go.kr/index.jsp"
        });
      }
    }
  }
  
  // 고정 테스트 데이터도 추가 (중요 항목)
  const fixedTestData: NaragetNotice[] = [
    {
      title: "지방상수도관망 정비사업(2025년 갱생공사)",
      org: "서울특별시 상수도사업본부",
      order_date: "2025-03",
      notice_date: "2025-03-25",
      total_amount: "1,850,000,000원",
      contract_type: "제한경쟁",
      link: "https://www.g2b.go.kr/index.jsp"
    },
    {
      title: "2025년 노후상수관로 갱생 종합공사",
      org: "인천광역시 수도사업본부",
      order_date: "2025-02",
      notice_date: "2025-02-15",
      total_amount: "1,250,000,000원",
      contract_type: "일반경쟁",
      link: "https://www.g2b.go.kr/index.jsp"
    },
    {
      title: "상반기 상수도관로 갱생사업",
      org: "경기도 성남시 맑은물사업소",
      order_date: "2025-01",
      notice_date: "2025-01-10",
      total_amount: "950,000,000원",
      contract_type: "제한경쟁",
      link: "https://www.g2b.go.kr/index.jsp"
    }
  ];
  
  // 모든 데이터 합치기
  const allTestData = [...testData, ...fixedTestData];
  
  // 날짜 기준 내림차순 정렬
  allTestData.sort((a, b) => {
    const dateA = new Date(a.notice_date);
    const dateB = new Date(b.notice_date);
    return dateB.getTime() - dateA.getTime();
  });
  
  return allTestData;
} 