'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '@/utils/db';

interface DataUploaderProps {
  onDataLoad: (data: any) => void;
}

export default function DataUploader({ onDataLoad }: DataUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [processingResult, setProcessingResult] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processExcelFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setProcessingResult(null);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      // cellFormula: false로 설정하여 계산식 추출 제거 
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellFormula: false });
      
      // 시트 이름 추출
      const sheets = workbook.SheetNames;
      setSheetNames(sheets);
      console.log('시트 목록:', sheets);
      
      // 모든 시트의 데이터 추출
      const extractedData: Record<string, any> = {};
      
      // 각 시트를 확인하고 데이터 추출 (계산식 제외)
      sheets.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        
        // 일위대가_호표 시트가 있는 경우에만 상세 로그 출력
        if (sheetName === '일위대가_호표') {
          console.log(`시트 ${sheetName} 정보:`, worksheet);
        }
        
        // 중기사용료 시트도 처리
        if (sheetName === '중기사용료') {
          console.log(`시트 ${sheetName} 정보:`, worksheet);
          
          // 중기사용료 데이터 처리 로직
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          extractedData['machinery'] = jsonData;
          
          // 중기사용료 데이터 존재 확인
          if (jsonData && Array.isArray(jsonData) && jsonData.length > 0) {
            // 데이터베이스에 맞게 처리된 중기사용료 데이터는 표시용으로만 사용
            // DB에는 저장하지 않고 표시만 함
          }
        }
        
        // 데이터를 객체 형태로 추출 (셀 좌표를 키로 사용)
        const sheetData: Record<string, any> = {};
        
        // 셀 범위 구하기
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // 각 셀 순회
        for (let row = range.s.r; row <= range.e.r; row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            
            if (cell) {
              // 셀 값 추출
              let cellValue;
              if (cell.t === 'n') {
                cellValue = cell.v;
              } else if (cell.t === 'b') {
                cellValue = cell.v ? true : false;
              } else if (cell.t === 'd') {
                cellValue = new Date(cell.v);
              } else {
                cellValue = cell.v;
              }
              
              // 셀 값 저장
              sheetData[cellAddress] = cellValue;
            }
          }
        }
        
        // 일반적인 JSON 데이터로도 변환
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // 두 가지 형태의 데이터를 모두 저장
        extractedData[sheetName] = {
          cellData: sheetData,
          rowData: jsonData
        };
      });
      
      // 중기사용료 데이터가 있는지 확인하고, DB의 데이터와 매칭 가능한지 검증
      if (extractedData['machinery'] && Array.isArray(extractedData['machinery'])) {
        // DB에 중기기초자료, 자재, 노임 데이터가 있는지 확인
        const machineBaseCount = db.getMachineBaseData().length;
        const materialCount = db.getMaterialData().length;
        const laborCount = db.getLaborData().length;
        
        if (machineBaseCount === 0 || materialCount === 0 || laborCount === 0) {
          setError('중기사용료 데이터를 처리하기 위해서는 먼저 기초정보 데이터(중기기초자료, 자재, 노임)가 필요합니다.');
        }
      }
      
      // 결과 데이터를 컴포넌트에 전달
      onDataLoad({
        success: true,
        fileName: file.name,
        sheetNames: sheets,
        data: extractedData
      });
      
      return {
        success: true,
        fileName: file.name,
        sheetNames: sheets,
        data: extractedData
      };
    } catch (error) {
      console.error('Excel 파일 처리 중 오류:', error);
      setError(error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.');
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                 file.type === 'application/vnd.ms-excel')) {
      setFileName(file.name);
      await processExcelFile(file);
    } else {
      setError('엑셀 파일만 업로드 가능합니다.');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      await processExcelFile(file);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">수량정보 데이터 업로드</h2>
        <p className="text-gray-600 mb-4">일위대가_호표 및 중기사용료 시트가 포함된 엑셀 파일을 업로드해주세요.</p>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="text-gray-600">
              {fileName ? (
                <>
                  <p className="font-medium mb-2">업로드된 파일:</p>
                  <p className="text-blue-600 mb-1">{fileName}</p>
                  {isLoading ? (
                    <div className="flex justify-center items-center mt-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2">처리 중...</span>
                    </div>
                  ) : (
                    sheetNames.length > 0 && (
                      <div className="mt-4">
                        <p className="font-medium mb-2">추출된 시트:</p>
                        <ul className="list-disc list-inside text-left w-fit mx-auto">
                          {sheetNames.map((sheet, index) => (
                            <li key={index} className="text-green-600">{sheet}</li>
                          ))}
                        </ul>
                      </div>
                    )
                  )}
                </>
              ) : (
                <>
                  <p>엑셀 파일을 이곳에 드래그하거나</p>
                  <label className="inline-block cursor-pointer mt-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">
                    파일 선택
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
        
        {processingResult && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
            <p>{processingResult}</p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
} 