import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Tag,
  Divider,
  List,
  Empty,
  Spin,
  message,
  Space,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';

import { useAppStore } from '../store';
import { apiService } from '../services/api';
import { emitEvent } from '../services/socket';

function TaskDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tasks } = useAppStore();
  const [task, setTask] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    if (id) {
      loadTask();
    }
  }, [id]);

  const loadTask = async () => {
    setLoading(true);
    try {
      const data = await apiService.getTask(id);
      setTask(data.task);
      loadResults();
    } catch (error) {
      console.error('Failed to load task:', error);
      message.error('加载任务详情失败');
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    setLoadingResults(true);
    try {
      const data = await apiService.getTasks();
      setResults(data.results || []);
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!task) return;
    try {
      await apiService.updateTask(id, { enabled: !task.enabled });
      message.success(`任务已${task.enabled ? '禁用' : '启用'}`);
      loadTask();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleRunNow = () => {
    if (emitEvent('execute_task', { task_id: id })) {
      message.success('任务已开始执行');
    } else {
      message.error('无法执行任务，请检查连接状态');
    }
  };

  const handleDelete = async () => {
    try {
      await apiService.deleteTask(id);
      message.success('任务已删除');
      navigate('/tasks');
    } catch (error) {
      message.error('删除失败');
    }
  };

  if (loading) {
    return (
      <div className="loading-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!task) {
    return (
      <div>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/tasks')}
          style={{ marginBottom: 16 }}
        >
          返回任务列表
        </Button>
        <Empty description="任务不存在" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/tasks')}
          style={{ marginBottom: 16 }}
        >
          返回任务列表
        </Button>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0 }}>
            {task.name}
            <Tag
              color={task.enabled ? 'success' : 'default'}
              style={{ marginLeft: 12 }}
            >
              {task.enabled ? '已启用' : '已禁用'}
            </Tag>
          </h2>
          <Space>
            <Button
              icon={task.enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleToggleStatus}
            >
              {task.enabled ? '禁用' : '启用'}
            </Button>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleRunNow}
            >
              立即执行
            </Button>
            <Button icon={<EditOutlined />}>编辑</Button>
            <Popconfirm
              title="确定要删除这个任务吗？"
              onConfirm={handleDelete}
              okText="确定"
              cancelText="取消"
            >
              <Button icon={<DeleteOutlined />} danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        </div>
      </div>

      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="任务名称">{task.name}</Descriptions.Item>
          <Descriptions.Item label="应用适配器">
            <Tag color="blue">{task.adapter}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {task.description || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Cron 表达式">
            <code>{task.cron_expression || '未设置'}</code>
          </Descriptions.Item>
          <Descriptions.Item label="数据时间范围">
            <Tag>{task.time_range || '1d'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="摘要风格">
            <Tag color="purple">{task.summary_style || 'concise'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="语音播报">
            {task.enable_speech ? (
              <Tag color="green">已启用</Tag>
            ) : (
              <Tag>已禁用</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {task.created_at ? dayjs(task.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {task.updated_at ? dayjs(task.updated_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <span>
            <HistoryOutlined style={{ marginRight: 8 }} />
            执行历史
          </span>
        }
      >
        {loadingResults ? (
          <div className="loading-center">
            <Spin size="small" />
          </div>
        ) : results.length === 0 ? (
          <Empty description="暂无执行记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={results}
            renderItem={(result) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <span>
                      {dayjs(result.executed_at).format('YYYY-MM-DD HH:mm:ss')}
                      <Tag
                        color={result.success ? 'success' : 'error'}
                        style={{ marginLeft: 12 }}
                      >
                        {result.success ? '成功' : '失败'}
                      </Tag>
                    </span>
                  }
                  description={
                    result.summary ? (
                      <div style={{ maxHeight: 100, overflow: 'auto' }}>
                        <ReactMarkdown>{result.summary}</ReactMarkdown>
                      </div>
                    ) : (
                      result.error_message || '无摘要内容'
                    )
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}

export default TaskDetail;
