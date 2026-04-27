import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Card, Button, message } from 'antd';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import AdapterManager from './components/AdapterManager';
import AIConfigManager from './components/AIConfigManager';
import TestModule from './components/TestModule';
import CombinedProcessor from './components/CombinedProcessor';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

// 仪表盘组件
function Dashboard() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // 检查后端健康状态
  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/health');
      setHealthStatus(response.data);
      message.success('后端服务正常运行');
    } catch (error) {
      message.error('无法连接到后端服务');
      console.error('Health check error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 测试 AI 聊天功能
  const testAI = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/ai/chat', {
        message: '你好，测试一下'
      });
      message.success(`AI 响应: ${response.data.response}`);
    } catch (error) {
      message.error('AI 测试失败');
      console.error('AI test error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 组件挂载时检查健康状态
    checkHealth();
  }, []);

  return (
    <div>
      <Title level={4}>系统状态</Title>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong>后端服务状态:</Text>
          <Text style={{ marginLeft: 8 }}>
            {healthStatus ? (
              healthStatus.status === 'healthy' ? '✅ 正常' : '❌ 异常'
            ) : '⏳ 检查中'}
          </Text>
        </div>
        {healthStatus && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <Text>调度器运行状态:</Text>
              <Text style={{ marginLeft: 8 }}>
                {healthStatus.scheduler_running ? '✅ 运行中' : '❌ 已停止'}
              </Text>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text>AI 服务状态:</Text>
              <Text style={{ marginLeft: 8 }}>
                {healthStatus.ai_available ? '✅ 可用' : '❌ 不可用'}
              </Text>
            </div>
            <div>
              <Text>适配器数量:</Text>
              <Text style={{ marginLeft: 8 }}>
                {healthStatus.adapters_available}
              </Text>
            </div>
          </div>
        )}
      </Card>

      <Title level={4}>快速操作</Title>
      <div style={{ display: 'flex', gap: 16 }}>
        <Button 
          type="primary" 
          onClick={checkHealth} 
          loading={loading}
        >
          检查健康状态
        </Button>
        <Button 
          onClick={testAI} 
          loading={loading}
        >
          测试 AI 功能
        </Button>
      </div>
    </div>
  );
}

// 任务管理组件
function TaskManager() {
  return (
    <div>
      <Title level={4}>任务管理</Title>
      <Text>任务管理功能开发中...</Text>
    </div>
  );
}

// 测试模块组件
function TestModulePage() {
  return <TestModule />;
}

// 组合处理组件
function CombinedProcessorPage() {
  return <CombinedProcessor />;
}

// 音频设置组件
function AudioSettings() {
  return (
    <div>
      <Title level={4}>音频设置</Title>
      <Text>音频设置功能开发中...</Text>
    </div>
  );
}

// 系统设置组件
function SystemSettings() {
  return (
    <div>
      <Title level={4}>系统设置</Title>
      <Text>系统设置功能开发中...</Text>
    </div>
  );
}

// 主应用组件
function App() {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: 'white', margin: 0 }}>Smart Scheduler</Title>
        </Header>
        <Layout>
          <Sider width={200} style={{ background: '#fff' }}>
            <Menu
              mode="inline"
              defaultSelectedKeys={['dashboard']}
              style={{ height: '100%', borderRight: 0 }}
            >
              <Menu.Item key="dashboard">
                <Link to="/">仪表盘</Link>
              </Menu.Item>
              <Menu.Item key="tasks">
                <Link to="/tasks">任务管理</Link>
              </Menu.Item>
              <Menu.Item key="adapters">
                <Link to="/adapters">适配器管理</Link>
              </Menu.Item>
              <Menu.Item key="ai">
                <Link to="/ai">AI 配置</Link>
              </Menu.Item>
              <Menu.Item key="test">
                <Link to="/test">测试模块</Link>
              </Menu.Item>
              <Menu.Item key="combined">
                <Link to="/combined">组合处理</Link>
              </Menu.Item>
              <Menu.Item key="audio">
                <Link to="/audio">音频设置</Link>
              </Menu.Item>
              <Menu.Item key="settings">
                <Link to="/settings">系统设置</Link>
              </Menu.Item>
            </Menu>
          </Sider>
          <Layout style={{ padding: '24px' }}>
            <Content style={{ background: '#fff', padding: 24, margin: 0, minHeight: 280 }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tasks" element={<TaskManager />} />
                <Route path="/adapters" element={<AdapterManager />} />
                <Route path="/ai" element={<AIConfigManager />} />
                <Route path="/test" element={<TestModulePage />} />
                <Route path="/combined" element={<CombinedProcessorPage />} />
                <Route path="/audio" element={<AudioSettings />} />
                <Route path="/settings" element={<SystemSettings />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App;