import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Empty,
  Spin,
  Card,
  Input,
  Select,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useAppStore } from '../store';
import { apiService } from '../services/api';
import { emitEvent } from '../services/socket';

function Tasks() {
  const navigate = useNavigate();
  const { tasks, setTasks, adapters } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterAdapter, setFilterAdapter] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const tasksData = await apiService.getTasks();
      setTasks(tasksData.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiService.deleteTask(id);
      message.success('任务已删除');
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      message.error('删除任务失败');
    }
  };

  const handleToggleStatus = async (task) => {
    try {
      await apiService.updateTask(task.id, { enabled: !task.enabled });
      message.success(`任务已${task.enabled ? '禁用' : '启用'}`);
      loadTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleRunNow = (task) => {
    if (emitEvent('execute_task', { task_id: task.id })) {
      message.success('任务已开始执行');
    } else {
      message.error('无法执行任务，请检查连接状态');
    }
  };

  const getAdapterName = (adapterKey) => {
    const adapter = adapters.find(a => a.name === adapterKey);
    return adapter ? adapter.display_name : adapterKey;
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchText || 
      task.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchText.toLowerCase()));
    
    const matchesAdapter = !filterAdapter || task.adapter === filterAdapter;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'enabled' && task.enabled) ||
      (filterStatus === 'disabled' && !task.enabled);
    
    return matchesSearch && matchesAdapter && matchesStatus;
  });

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(`/tasks/${record.id}`)}>
          {text}
        </a>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '应用',
      dataIndex: 'adapter',
      key: 'adapter',
      render: (adapter) => (
        <Tag color="blue">{getAdapterName(adapter)}</Tag>
      ),
    },
    {
      title: '执行时间',
      dataIndex: 'cron_expression',
      key: 'cron_expression',
      render: (cron) => cron || '未设置',
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled ? '已启用' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={record.enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => handleToggleStatus(record)}
          >
            {record.enabled ? '禁用' : '启用'}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleRunNow(record)}
          >
            立即执行
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/tasks/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个任务吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>定时任务</h2>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadTasks}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/tasks/create')}
            >
              新建任务
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Input
            placeholder="搜索任务名称或描述"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder="筛选应用"
            value={filterAdapter || undefined}
            onChange={setFilterAdapter}
            style={{ width: 200 }}
            allowClear
          >
            {adapters.map((adapter) => (
              <Select.Option key={adapter.name} value={adapter.name}>
                {adapter.display_name}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="筛选状态"
            value={filterStatus || undefined}
            onChange={setFilterStatus}
            style={{ width: 150 }}
            allowClear
          >
            <Select.Option value="enabled">已启用</Select.Option>
            <Select.Option value="disabled">已禁用</Select.Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredTasks}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条任务`,
          }}
          locale={{
            emptyText: (
              <Empty
                description="暂无定时任务"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/tasks/create')}
                >
                  创建第一个任务
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>
    </div>
  );
}

export default Tasks;
