import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Button, List, Tag, Empty, Spin, message } from 'antd';
import {
  ScheduleOutlined,
  AppstoreOutlined,
  RobotOutlined,
  SoundOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useAppStore } from '../store';
import { apiService } from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const { tasks, setTasks, adapters, setAdapters, connected } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [recentResults, setRecentResults] = useState([]);

  useEffect(() => {
    if (connected) {
      loadData();
    }
  }, [connected]);

  const loadData = async () => {
    setLoading(true);
    try {
      const tasksData = await apiService.getTasks();
      setTasks(tasksData.tasks || []);

      const adaptersData = await apiService.getAdapters();
      setAdapters(adaptersData.adapters || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const enabledTasks = tasks.filter(t => t.enabled);
  const disabledTasks = tasks.filter(t => !t.enabled);

  const getAdapterStatusColor = (adapter) => {
    if (adapter.is_available) return 'success';
    if (adapter.is_registered) return 'warning';
    return 'default';
  };

  const getAdapterStatusText = (adapter) => {
    if (adapter.is_available) return '可用';
    if (adapter.is_registered) return '已注册';
    return '未配置';
  };

  if (!connected) {
    return (
      <Empty
        description="未连接到后端服务"
        style={{ marginTop: 100 }}
      >
        <Button type="primary" onClick={loadData}>
          重试连接
        </Button>
      </Empty>
    );
  }

  return (
    <div>
      <div
        style={{
          textAlign: 'center',
          padding: '40px 20px',
          marginBottom: 24,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12,
          color: 'white',
        }}
      >
        <h2 style={{ color: 'white', marginBottom: 8, fontSize: 24 }}>
          欢迎使用 Smart Scheduler
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.85)', margin: 0, fontSize: 14 }}>
          AI 驱动的智能定时任务系统，让信息获取更智能
        </p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/tasks')}>
            <Statistic
              title="总任务数"
              value={tasks.length}
              prefix={<ScheduleOutlined style={{ color: '#667eea' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/tasks')}>
            <Statistic
              title="已启用"
              value={enabledTasks.length}
              prefix={<ScheduleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/adapters')}>
            <Statistic
              title="可用应用"
              value={adapters.filter(a => a.is_available).length}
              prefix={<AppstoreOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/ai-config')}>
            <Statistic
              title="AI 提供者"
              value={1}
              prefix={<RobotOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title="定时任务"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => navigate('/tasks/create')}
              >
                新建任务
              </Button>
            }
          >
            {tasks.length === 0 ? (
              <Empty description="暂无定时任务" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/tasks/create')}
                >
                  创建第一个任务
                </Button>
              </Empty>
            ) : (
              <List
                dataSource={tasks.slice(0, 5)}
                renderItem={(task) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        size="small"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        详情
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {task.name}
                          <Tag color={task.enabled ? 'success' : 'default'}>
                            {task.enabled ? '已启用' : '已禁用'}
                          </Tag>
                        </span>
                      }
                      description={
                        <span style={{ color: '#666' }}>
                          {task.description || '暂无描述'} | {task.cron_expression || '未设置时间'}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title="应用适配器"
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => navigate('/adapters')}
              >
                管理
              </Button>
            }
          >
            {adapters.length === 0 ? (
              <Empty description="暂无可用应用" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={adapters.slice(0, 5)}
                renderItem={(adapter) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {adapter.display_name}
                          <Tag color={getAdapterStatusColor(adapter)}>
                            {getAdapterStatusText(adapter)}
                          </Tag>
                        </span>
                      }
                      description={adapter.description}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card
            title="快捷操作"
            style={{ marginTop: 16 }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Button
                icon={<PlusOutlined />}
                onClick={() => navigate('/tasks/create')}
              >
                新建任务
              </Button>
              <Button
                icon={<RobotOutlined />}
                onClick={() => navigate('/chat')}
              >
                AI 对话
              </Button>
              <Button
                icon={<SoundOutlined />}
                onClick={() => navigate('/audio-config')}
              >
                音频测试
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={() => navigate('/settings')}
              >
                系统设置
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
