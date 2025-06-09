'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface NaragetNotice {
  title: string;
  org: string;
  order_date: string;
  notice_date: string;
  total_amount: string;
  contract_type: string;
  link: string;
}

const NaragetTable: React.FC = () => {
  const [notices, setNotices] = useState<NaragetNotice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('전체');
  const [isTestData, setIsTestData] = useState<boolean>(false);
  const itemsPerPage = 10;

  const fetchData = async () => {
    try {
      setLoading(true);
      // Liner-alarm 프로젝트의 데이터를 가져오는 API 호출
      const response = await fetch('/api/naraget');
      
      if (!response.ok) {
        throw new Error(`데이터 로드 실패: ${response.status} ${response.statusText}`);
      }
      
      // 테스트 데이터 여부 확인
      const isTest = response.headers.get('x-data-source') === 'test-data';
      setIsTestData(isTest);
      
      const data = await response.json();
      console.log('API 응답:', data.length ? `${data.length}개 항목` : '데이터 없음', isTest ? '(테스트 데이터)' : '');
      
      if (!data || data.length === 0) {
        console.warn('API에서 반환된 데이터가 없습니다.');
        throw new Error('불러올 데이터가 없습니다.');
      }
      
      if (data.error) {
        throw new Error(`API 오류: ${data.error}`);
      }
      
      // 날짜 형식 정규화 후 정렬
      setNotices(data);
      setError(null);
      
      // 현재 시간을 마지막 업데이트 시간으로 설정
      const now = new Date();
      setLastUpdated(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      console.error('데이터 로딩 중 오류:', errorMessage);
      setError(`나라장터 데이터를 불러오는데 실패했습니다: ${errorMessage}`);
      setIsTestData(true);
      
      // 테스트용 더미 데이터 (최신 날짜순으로 정렬)
      const testData = [
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
        },
        {
          title: "하남시 노후관로 개량 및 갱생공사",
          org: "경기도 하남시",
          order_date: "2024-12",
          notice_date: "2024-12-20",
          total_amount: "780,000,000원",
          contract_type: "제한경쟁",
          link: "https://www.g2b.go.kr/index.jsp"
        },
        {
          title: "노후상수관 갱생공사 (남부지역)",
          org: "경기도 용인시 상하수도사업소",
          order_date: "2024-11",
          notice_date: "2024-11-05",
          total_amount: "680,000,000원",
          contract_type: "일반경쟁",
          link: "https://www.g2b.go.kr/index.jsp"
        }
      ];

      setNotices(testData);
      
      // 에러 상황에서도 마지막 업데이트 시간 설정
      const now = new Date();
      setLastUpdated(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchData();
  }, []);

  // 데이터 새로고침 핸들러
  const handleRefresh = () => {
    fetchData();
  };

  // 검색 필터링
  const filteredNotices = notices.filter(notice => {
    // 제목 또는 기관명 검색 조건
    const matchesSearch = 
      notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.org.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 년도 필터링 조건
    const matchesYear = yearFilter === '전체' || 
      (notice.notice_date && notice.notice_date.startsWith(yearFilter));
    
    // 두 조건 모두 만족해야 함
    return matchesSearch && matchesYear;
  });

  // 사용 가능한 연도 목록 추출
  const getAvailableYears = (): string[] => {
    const years = new Set<string>();
    
    // 모든 공지의 연도 추출
    notices.forEach(notice => {
      if (notice.notice_date) {
        const year = notice.notice_date.split('-')[0];
        if (year && /^\d{4}$/.test(year)) {
          years.add(year);
        }
      }
    });
    
    // 정렬된 배열로 변환 (최신 연도가 앞에 오도록)
    return ['전체', ...Array.from(years).sort((a, b) => parseInt(b) - parseInt(a))];
  };

  // 페이지네이션 계산
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredNotices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredNotices.length / itemsPerPage);

  // 페이지 변경 핸들러
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // 외부 링크 열기
  const openLink = (url: string) => {
    window.open(url, '_blank');
  };

  // 이전 페이지 이동
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  // 다음 페이지 이동
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">나라장터 상수도공사 발주계획</h2>
            {isTestData && (
              <div className="mt-1 text-xs font-medium text-amber-500 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 inline-block">
                테스트 데이터 사용 중 (Liner-alarm 연결 안됨)
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                마지막 업데이트: {lastUpdated}
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={loading}
              className="flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${loading ? 'animate-spin' : ''}`}
              >
                <path d="M21 12a9 9 0 0 1-9 9c-4.97 0-9-4.03-9-9s4.03-9 9-9h4.59" />
                <path d="m16 5 3 3-3 3" />
              </svg>
              {loading ? '로딩 중...' : '새로고침'}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            총 {notices.length}개의 공고가 있습니다.
          </div>
          <div className="flex items-center gap-2 w-2/3">
            <div className="flex gap-2 items-center w-1/3">
              <span className="text-sm whitespace-nowrap font-medium">연도:</span>
              <select
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {getAvailableYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 w-2/3">
              <Input
                placeholder="공고 제목 또는 기관으로 검색"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // 검색어 변경 시 첫 페이지로 이동
                }}
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64 bg-red-50 text-red-500 rounded-md p-4">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-blue-50 border-b-2 border-blue-200">
                <TableRow className="hover:bg-blue-50">
                  <TableHead className="w-[60px] text-center font-bold text-blue-700">No</TableHead>
                  <TableHead className="w-[320px] font-bold text-blue-700">공고 제목</TableHead>
                  <TableHead className="w-[130px] font-bold text-blue-700">발주 기관</TableHead>
                  <TableHead className="w-[90px] font-bold text-center text-blue-700">발주 기간</TableHead>
                  <TableHead className="w-[90px] font-bold text-center text-blue-700">공고일자</TableHead>
                  <TableHead className="w-[130px] font-bold text-blue-700">총계약금액</TableHead>
                  <TableHead className="w-[90px] font-bold text-center text-blue-700">계약방식</TableHead>
                  <TableHead className="w-[90px] font-bold text-center text-blue-700">상세보기</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length > 0 ? (
                  currentItems.map((notice, index) => (
                    <TableRow key={index} className="hover:bg-gray-50 cursor-pointer" onClick={() => openLink(notice.link)}>
                      <TableCell className="text-center font-medium text-gray-500">
                        {indexOfFirstItem + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{notice.title}</TableCell>
                      <TableCell>{notice.org}</TableCell>
                      <TableCell className="text-center">{notice.order_date}</TableCell>
                      <TableCell className="text-center">{notice.notice_date}</TableCell>
                      <TableCell>{notice.total_amount}</TableCell>
                      <TableCell className="text-center">{notice.contract_type}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLink(notice.link);
                          }}
                        >
                          상세보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredNotices.length > itemsPerPage && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={goToPreviousPage}
                    className={currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  // 페이지 번호 계산 로직
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3) {
                      pageNum = currentPage - 3 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    if (pageNum > totalPages) pageNum = totalPages;
                  }
                  
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={currentPage === pageNum}
                        onClick={() => paginate(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={goToNextPage}
                    className={currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
};

export default NaragetTable; 