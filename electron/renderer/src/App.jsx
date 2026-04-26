import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Card, Button, message } from 'antd';
import axios from 'axios';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

function App() {
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
              仪表盘
            </Menu.Item>
            <Menu.Item key="tasks">
              任务管理
            </Menu.Item>
            <Menu.Item key="adapters">
              适配器管理
            </Menu.Item>
            <Menu.Item key="ai">
              AI 配置
            </Menu.Item>
            <Menu.Item key="audio">
              音频设置
            </Menu.Item>
            <Menu.Item key="settings">
              系统设置
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content style={{ background: '#fff', padding: 24, margin: 0, minHeight: 280 }}>
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
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;