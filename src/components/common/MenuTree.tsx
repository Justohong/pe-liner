'use client';
import { useState } from 'react';

// 메뉴 아이템 타입 정의
interface MenuItem {
  id: string;
  label: string;
  children?: MenuItem[];
}

interface MenuItemProps {
  item: MenuItem;
  activeMenu: string;
  onMenuSelect: (menuId: string) => void;
  depth?: number;
}

interface MenuTreeProps {
  activeMenu: string;
  onMenuSelect: (menuId: string) => void;
}

// 메뉴 데이터 구조 정의
export const menuData: MenuItem[] = [
  {
    id: 'waterProject',
    label: '상수도공사 발주계획',
    children: [{ id: 'waterProjectNaraget', label: '나라장터' }],
  },
  {
    id: 'pe-liner-cost',
    label: 'PE라이너 비용계산',
    children: [{ id: 'cost-calculation', label: '비용계산' }],
  },
  {
    id: 'unit-price-sheet',
    label: '일위대가',
    children: [
      { id: 'unit-price-list', label: '일위대가 목록' },
      { id: 'unit-price-table-hopyo', label: '일위대가 호표' },
      { id: 'unit-price-table-sangeun', label: '일위대가 산근' },
    ],
  },
  {
    id: 'equipment-usage',
    label: '중기사용',
    children: [
      { id: 'equipment-usage-list', label: '중기사용목록' },
      { id: 'equipment-usage-fee', label: '중기사용료' },
      { id: 'equipment-base-data', label: '중기기초자료' },
    ],
  },
  {
    id: 'base-data',
    label: '기초정보 데이터',
    children: [
      { id: 'material-data', label: '자재데이터' },
      { id: 'labor-data', label: '노임데이터' },
      { id: 'overhead-data', label: '경비' },
    ],
  },
  {
    id: 'documents',
    label: '문서',
    children: [
      { id: 'hopyo-document', label: '일위대가 호표' },
      { id: 'overhead-document', label: '경비 내역' },
    ],
  },
];

const MenuItemComponent = ({ item, activeMenu, onMenuSelect, depth = 0 }: MenuItemProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  const handleSelect = () => {
    if (!hasChildren) {
      onMenuSelect(item.id);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const isActive = activeMenu === item.id;
  const isParentActive = hasChildren && item.children?.some(child => child.id === activeMenu);

  // 공통 스타일 정의
  const menuHeaderStyles = `
    w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer
    ${isActive 
      ? 'bg-blue-100 text-blue-700 font-medium' 
      : isParentActive 
        ? 'bg-blue-50 text-blue-700 font-medium'
        : 'text-gray-700 hover:bg-gray-50'}
  `;

  return (
    <div className="space-y-1" style={{ paddingLeft: `${depth * 12}px` }}>
      <div
        onClick={handleSelect}
        className={menuHeaderStyles}
      >
        <span>{item.label}</span>
        {hasChildren && (
          <svg
            className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      {hasChildren && isOpen && item.children && (
        <div className="mt-1 ml-2 space-y-1">
          {item.children.map(child => (
            <MenuItemComponent key={child.id} item={child} activeMenu={activeMenu} onMenuSelect={onMenuSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function MenuTree({ activeMenu, onMenuSelect }: MenuTreeProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-1">
        {menuData.map(item => (
          <MenuItemComponent key={item.id} item={item} activeMenu={activeMenu} onMenuSelect={onMenuSelect} />
        ))}
      </div>
    </div>
  );
} 