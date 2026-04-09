import React from 'react'
import { Layout, Menu } from 'antd'
import {
  HomeOutlined,
  BookOutlined,
  SyncOutlined,
  BarChartOutlined,
  SettingOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Sider, Content } = Layout

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/todo',
      icon: <CheckSquareOutlined />,
      label: '每日计划',
    },
    {
      key: '/tasks',
      icon: <ClockCircleOutlined />,
      label: '任务倒计时',
    },
    {
      key: '/questions',
      icon: <BookOutlined />,
      label: '错题管理',
    },
    {
      key: '/review',
      icon: <SyncOutlined />,
      label: '开始复习',
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: '学习统计',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <Layout className="min-h-screen">
      <Sider
        width={200}
        className="shadow-lg"
      >
        <div className="h-14 flex items-center justify-center border-b border-white/10">
          <span className="text-white text-lg font-bold tracking-wide">
            📚 错题本
          </span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-none"
        />
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <div className="text-white/50 text-xs text-center">
            艾宾浩斯记忆法
          </div>
        </div>
      </Sider>
      <Layout className="bg-gray-50">
        <Content
          className="m-4 p-5 bg-white rounded-xl shadow-sm"
          style={{
            minHeight: 'calc(100vh - 32px)',
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
