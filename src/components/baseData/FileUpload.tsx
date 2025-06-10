'use client';

import { useState } from 'react';
import { processExcelFile } from '@/utils/excel';
import { saveExcelDataToDb } from '@/utils/db';

interface FileUploadProps {
  onDataLoad: (result: { success: boolean; data?: any; message?: string; dbResult?: any }) => void;
}

export default function FileUpload({ onDataLoad }: FileUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearBeforeSave, setClearBeforeSave] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      console.log('파일 업로드 시작:', file.name);
      const result = await processExcelFile(file);
      console.log('엑셀 처리 결과:', result);

      if (result.success && result.data) {
        // 데이터베이스에 저장 (clearBeforeSave 옵션 적용)
        const dbResult = await saveExcelDataToDb(result.data, clearBeforeSave);
        console.log('데이터베이스 저장 결과:', dbResult);
        
        // 성공한 경우 결과와 함께 저장 결과도 함께 전달
        onDataLoad({
          ...result,
          dbResult
        });
      } else {
        throw new Error(result.error || '파일 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('파일 업로드 중 오류:', error);
      setError(error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                 file.type === 'application/vnd.ms-excel')) {
      await handleFileChange(file);
    } else {
      setError('엑셀 파일만 업로드 가능합니다.');
    }
  };

  return (
    <div className="w-full space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
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
                {isLoading && (
                  <div className="flex justify-center items-center mt-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2">처리 중...</span>
                  </div>
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
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </label>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="clearBeforeSave"
          checked={clearBeforeSave}
          onChange={(e) => setClearBeforeSave(e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="clearBeforeSave" className="ml-2 text-sm font-medium text-gray-700">
          업로드 전 기존 데이터 초기화 (중복 방지)
        </label>
      </div>
      
      {error && (
        <p className="text-sm text-red-600">
          오류: {error}
        </p>
      )}
    </div>
  );
} 