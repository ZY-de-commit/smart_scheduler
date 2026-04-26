import React, { useEffect } from 'react';
import { Layout, Menu, theme, Badge, Dropdown, Avatar, Space } from 'antd';
import {
  DashboardOutlined,
  ScheduleOutlined,
  AppstoreOutlined,
  RobotOutlined,
  SoundOutlined,
  MessageOutlined,
  SettingOutlined,
  BellOutlined,
  UserOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';

const { Sider, Header, Content } = Layout;

function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { connected, sidebarCollapsed, setSidebarCollapsed, notifications } = useAppStore();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/tasks',
      icon: <ScheduleOutlined />,
      label: '定时任务',
    },
    {
      key: '/adapters',
      icon: <AppstoreOutlined />,
      label: '应用管理',
    },
    {
      key: '/ai-config',
      icon: <RobotOutlined />,
      label: 'AI 设置',
    },
    {
      key: '/audio-config',
      icon: <SoundOutlined />,
      label: '音频设置',
    },
    {
      key: '/chat',
      icon: <MessageOutlined />,
      label: 'AI 对话',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  const userMenuItems = [
    {
      key: '1',
      icon: <UserOutlined />,
      label: '个人中心',
      disabled: true,
    },
    {
      key: '2',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: '3',
      icon: <GlobalOutlined />,
      label: '关于',
      disabled: true,
    },
  ];

  const handleMenuClick = (e) => {
    navigate(e.key);
  };

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/tasks/')) {
      return ['/tasks'];
    }
    return [path];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={240}
        theme="dark"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
        }}
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={(collapsed) => setSidebarCollapsed(collapsed)}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
            {sidebarCollapsed ? 'SS' : 'Smart Scheduler'}
          </span>
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: sidebarCollapsed ? 80 : 240 }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
            position: 'sticky',
            top: 0,
            zIndex: 999,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
                background: connected ? '#f6ffed' : '#fff2f0',
                border: `1px solid ${connected ? '#b7eb8f' : '#ffccc7'}`,
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: connected ? '#52c41a' : '#ff4d4f',
                }}
              />
              <span style={{ fontSize: 13 }}>
                {connected ? '已连接' : '未连接'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Badge count={notifications.length} size="small">
              <BellOutlined style={{ fontSize: 20, color: '#666', cursor: 'pointer' }} />
            </Badge>
            
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} size={32} />
              </Space>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            minHeight: 'calc(100vh - 112px)',
            borderRadius: 8,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
