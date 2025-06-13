import { create } from 'zustand';

interface MenuState {
  activeMenu: string;
  setActiveMenu: (menuId: string) => void;
}

/**
 * 활성화된 메뉴 상태를 관리하는 Zustand 스토어
 */
export const useMenuStore = create<MenuState>((set) => ({
  // 초기 상태
  activeMenu: 'cost-calculation',
  
  // 상태를 업데이트하는 액션 함수
  setActiveMenu: (menuId) => set({ activeMenu: menuId }),
})); 