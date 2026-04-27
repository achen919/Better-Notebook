import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 预设主题
export const THEME_PRESETS = {
  // 经典蓝
  blue: {
    name: '经典蓝',
    colorPrimary: '#1890ff',
    colorBgBase: '#ffffff',
    siderBg: '#001529',
    siderText: '#ffffff',
  },
  // 赛博紫
  cyber: {
    name: '赛博紫',
    colorPrimary: '#722ed1',
    colorBgBase: '#ffffff',
    siderBg: '#120338',
    siderText: '#e0b0ff',
  },
  // 森林绿
  forest: {
    name: '森林绿',
    colorPrimary: '#52c41a',
    colorBgBase: '#ffffff',
    siderBg: '#0a2e0a',
    siderText: '#b7eb8f',
  },
  // 日落橙
  sunset: {
    name: '日落橙',
    colorPrimary: '#fa541c',
    colorBgBase: '#ffffff',
    siderBg: '#2a1506',
    siderText: '#ffbb96',
  },
  // 樱花粉
  sakura: {
    name: '樱花粉',
    colorPrimary: '#eb2f96',
    colorBgBase: '#ffffff',
    siderBg: '#2a0a1e',
    siderText: '#ffadd2',
  },
  // 深邃黑
  dark: {
    name: '深邃黑',
    colorPrimary: '#177ddc',
    colorBgBase: '#141414',
    siderBg: '#000000',
    siderText: '#ffffff',
  },
  // 极光青
  aurora: {
    name: '极光青',
    colorPrimary: '#13c2c2',
    colorBgBase: '#ffffff',
    siderBg: '#002329',
    siderText: '#87e8de',
  },
  // 金属灰
  metal: {
    name: '金属灰',
    colorPrimary: '#8c8c8c',
    colorBgBase: '#fafafa',
    siderBg: '#262626',
    siderText: '#d9d9d9',
  },
} as const

export type ThemeKey = keyof typeof THEME_PRESETS

interface ThemeState {
  currentTheme: ThemeKey
  setTheme: (theme: ThemeKey) => void
  getThemeConfig: () => typeof THEME_PRESETS[ThemeKey]
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      currentTheme: 'cyber', // 默认赛博紫，更先锋

      setTheme: (theme) => set({ currentTheme: theme }),

      getThemeConfig: () => THEME_PRESETS[get().currentTheme],
    }),
    {
      name: 'theme-storage',
    }
  )
)
