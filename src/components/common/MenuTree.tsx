'use client';
import { useState } from 'react';

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

export const menuData: MenuItem[] = [
  {
    id: 'calculation_group',
    label: 'PE라이너 비용계산',
    children: [{ id: 'cost-calculation', label: '비용계산' }],
  },
  {
    id: 'document_group',
    label: '산출 문서',
    children: [
        { id: 'bill-of-statement', label: '내역서' },
        { id: 'unit-price-sheet-hopyo', label: '일위대가 호표' },
        { id: 'overhead-summary', label: '경비 내역' },
    ],
  },
  {
    id: 'data_group',
    label: '기초 데이터',
    children: [
      { id: 'material-data', label: '자재 데이터' },
      { id: 'labor-data', label: '노임 데이터' },
      { id: 'equipment-data', label: '중기사용료' },
    ],
  },
];

const MenuItem = ({ item, activeMenu, onMenuSelect, depth = 0 }: MenuItemProps) => {
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
  return (
    <div style={{ paddingLeft: `${depth * 16}px` }}>
      <div onClick={handleSelect} className={`p-2 rounded cursor-pointer ${isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>
        <span className={!hasChildren ? '' : 'font-bold'}>{item.label}</span>
        {hasChildren && <span className="float-right">{isOpen ? '▼' : '▶'}</span>}
      </div>
      {hasChildren && isOpen && (
        <div className="mt-1 space-y-1">
          {item.children.map(child => <MenuItem key={child.id} item={child} activeMenu={activeMenu} onMenuSelect={onMenuSelect} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
};

export default function MenuTree({ activeMenu, onMenuSelect }: MenuTreeProps) {
  return (
    <aside className="w-64 bg-gray-50 p-4 border-r flex-shrink-0">
      <h2 className="text-lg font-bold mb-4">PE-Liner v1.0</h2>
      <nav className="space-y-2">
        {menuData.map(item => <MenuItem key={item.id} item={item} activeMenu={activeMenu} onMenuSelect={onMenuSelect} />)}
      </nav>
    </aside>
  );
} 