import React, { useState } from 'react';

interface MenuTreeProps {
  activeMenu: string;
  onMenuSelect: (menu: string) => void;
}

const MenuTree: React.FC<MenuTreeProps> = ({ activeMenu, onMenuSelect }) => {
  const [openMenus, setOpenMenus] = useState<string[]>(['waterProject', 'peLiner', 'peLinerBase', 'peLinerQuantity', 'peLinerCalc']);

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev =>
      prev.includes(menu)
        ? prev.filter(m => m !== menu)
        : [...prev, menu]
    );
  };

  // 공통 스타일 정의
  const menuHeaderStyles = (menu: string) => `
    w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors
    ${openMenus.includes(menu) 
      ? 'bg-blue-50 text-blue-700' 
      : 'text-gray-700 hover:bg-gray-50'}
  `;

  const submenuStyles = (isActive: boolean) => `
    w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors
    ${isActive 
      ? 'bg-blue-100 text-blue-700 font-medium' 
      : 'text-gray-600 hover:bg-gray-50'}
  `;

  const arrowStyles = (menu: string) => `
    w-4 h-4 transform transition-transform
    ${openMenus.includes(menu) ? 'rotate-180' : ''}
  `;

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-1">
        {/* 상수도공사 발주계획 */}
        <div>
          <button
            onClick={() => toggleMenu('waterProject')}
            className={menuHeaderStyles('waterProject')}
          >
            <span className="font-medium">상수도공사 발주계획</span>
            <svg
              className={arrowStyles('waterProject')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openMenus.includes('waterProject') && (
            <div className="ml-3 mt-1 space-y-1">
              <button
                onClick={() => onMenuSelect('waterProjectNaraget')}
                className={submenuStyles(activeMenu === 'waterProjectNaraget')}
              >
                나라장터
              </button>
            </div>
          )}
        </div>

        {/* PE라이너 */}
        <div>
          <button
            onClick={() => toggleMenu('peLiner')}
            className={menuHeaderStyles('peLiner')}
          >
            <span className="font-medium">PE라이너</span>
            <svg
              className={arrowStyles('peLiner')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openMenus.includes('peLiner') && (
            <div className="ml-3 mt-1 space-y-1">
              {/* 기초정보 데이터 관리 */}
              <div>
                <button
                  onClick={() => toggleMenu('peLinerBase')}
                  className={menuHeaderStyles('peLinerBase')}
                >
                  <span className="font-medium">기초정보 데이터 관리</span>
                  <svg
                    className={arrowStyles('peLinerBase')}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openMenus.includes('peLinerBase') && (
                  <div className="ml-3 mt-1 space-y-1">
                    <button
                      onClick={() => onMenuSelect('baseDataUpload')}
                      className={submenuStyles(activeMenu === 'baseDataUpload')}
                    >
                      데이터 업로드
                    </button>
                    <button
                      onClick={() => onMenuSelect('baseDataMachine')}
                      className={submenuStyles(activeMenu === 'baseDataMachine')}
                    >
                      중기기초자료
                    </button>
                    <button
                      onClick={() => onMenuSelect('baseDataMaterial')}
                      className={submenuStyles(activeMenu === 'baseDataMaterial')}
                    >
                      자재 데이터
                    </button>
                    <button
                      onClick={() => onMenuSelect('baseDataLabor')}
                      className={submenuStyles(activeMenu === 'baseDataLabor')}
                    >
                      노임 데이터
                    </button>
                  </div>
                )}
              </div>

              {/* 수량정보 데이터관리 */}
              <div>
                <button
                  onClick={() => toggleMenu('peLinerQuantity')}
                  className={menuHeaderStyles('peLinerQuantity')}
                >
                  <span className="font-medium">수량정보 데이터관리</span>
                  <svg
                    className={arrowStyles('peLinerQuantity')}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openMenus.includes('peLinerQuantity') && (
                  <div className="ml-3 mt-1 space-y-1">
                    <button
                      onClick={() => onMenuSelect('peLinerDataUpload')}
                      className={submenuStyles(activeMenu === 'peLinerDataUpload')}
                    >
                      데이터 업로드
                    </button>
                    <button
                      onClick={() => onMenuSelect('baseDataMachinery')}
                      className={submenuStyles(activeMenu === 'baseDataMachinery')}
                    >
                      중기사용료
                    </button>
                    <button
                      onClick={() => onMenuSelect('peLinerDataUnitPriceSheet')}
                      className={submenuStyles(activeMenu === 'peLinerDataUnitPriceSheet')}
                    >
                      일위대가_호표
                    </button>
                  </div>
                )}
              </div>

              {/* PE라이너 비용계산 */}
              <div>
                <button
                  onClick={() => toggleMenu('peLinerCalc')}
                  className={menuHeaderStyles('peLinerCalc')}
                >
                  <span className="font-medium">PE라이너 비용계산</span>
                  <svg
                    className={arrowStyles('peLinerCalc')}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openMenus.includes('peLinerCalc') && (
                  <div className="ml-3 mt-1 space-y-1">
                    <button
                      onClick={() => onMenuSelect('peLinerDataUnitPriceList')}
                      className={submenuStyles(activeMenu === 'peLinerDataUnitPriceList')}
                    >
                      일위대가목록
                    </button>
                    <button
                      onClick={() => onMenuSelect('peLinerDataMachineryUsage')}
                      className={submenuStyles(activeMenu === 'peLinerDataMachineryUsage')}
                    >
                      중기사용목록
                    </button>
                    <button
                      onClick={() => onMenuSelect('peLinerCalcDocument')}
                      className={submenuStyles(activeMenu === 'peLinerCalcDocument')}
                    >
                      내역서 만들기
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuTree; 