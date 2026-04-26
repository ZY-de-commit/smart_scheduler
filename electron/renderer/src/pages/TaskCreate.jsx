import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Select,
  Switch,
  Button,
  Card,
  Row,
  Col,
  message,
  Space,
  Divider,
  InputNumber,
  Radio,
} from 'antd';
import { SaveOutlined, ArrowLeftOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { useAppStore } from '../store';
import { apiService } from '../services/api';

const { TextArea } = Input;
const { Option } = Select;

function TaskCreate() {
  const navigate = useNavigate();
  const { adapters } = useAppStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedAdapter, setSelectedAdapter] = useState('');

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const taskData = {
        ...values,
        config: {},
      };
      
      await apiService.createTask(taskData);
      message.success('任务创建成功');
      navigate('/tasks');
    } catch (error) {
      console.error('Failed to create task:', error);
      message.error('创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdapterChange = (value) => {
    setSelectedAdapter(value);
  };

  const summaryStyles = [
    { value: 'concise', label: '简洁模式' },
    { value: 'detailed', label: '详细模式' },
    { value: 'bullet', label: '要点列表' },
    { value: 'news', label: '新闻播报风格' },
    { value: 'story', label: '讲故事风格' },
  ];

  const timeRanges = [
    { value: '1h', label: '最近1小时' },
    { value: '6h', label: '最近6小时' },
    { value: '12h', label: '最近12小时' },
    { value: '1d', label: '最近1天' },
    { value: '2d', label: '最近2天' },
    { value: '3d', label: '最近3天' },
    { value: '7d', label: '最近7天' },
    { value: '14d', label: '最近14天' },
    { value: '30d', label: '最近30天' },
  ];

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
        <h2 style={{ margin: 0 }}>新建定时任务</h2>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          enabled: true,
          enable_speech: true,
          summary_style: 'concise',
          time_range: '1d',
          schedule_type: 'cron',
        }}
      >
        <Card title="基本信息" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="任务名称"
                rules={[{ required: true, message: '请输入任务名称' }]}
              >
                <Input placeholder="例如：每日新闻摘要" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="enabled"
                label="是否启用"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="任务描述">
            <TextArea rows={2} placeholder="描述这个任务的用途..." />
          </Form.Item>
        </Card>

        <Card title="应用配置" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="adapter"
                label="选择应用"
                rules={[{ required: true, message: '请选择要接入的应用' }]}
              >
                <Select
                  placeholder="选择一个应用"
                  onChange={handleAdapterChange}
                  showSearch
                  optionFilterProp="children"
                >
                  {adapters.map((adapter) => (
                    <Option key={adapter.name} value={adapter.name}>
                      {adapter.display_name}
                      {!adapter.is_available && ' (未配置)'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="time_range"
                label="数据时间范围"
                tooltip="每次执行时获取多长时间范围内的数据"
              >
                <Select>
                  {timeRanges.map((tr) => (
                    <Option key={tr.value} value={tr.value}>
                      {tr.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="执行时间" style={{ marginBottom: 16 }}>
          <Form.Item name="schedule_type" label="执行方式">
            <Radio.Group>
              <Radio value="cron">定时执行 (Cron)</Radio>
              <Radio value="interval">间隔执行</Radio>
              <Radio value="once">仅执行一次</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="cron_expression"
            label="Cron 表达式"
            dependencies={['schedule_type']}
            rules={[
              ({ getFieldValue }) => ({
                required: getFieldValue('schedule_type') === 'cron',
                message: '请输入 Cron 表达式',
              }),
            ]}
          >
            <Input
              placeholder="例如: 0 8 * * * (每天早上8点执行)"
              addonAfter={
                <Select defaultValue="0 8 * * *" style={{ width: 200 }}>
                  <Option value="0 8 * * *">每天早上8点</Option>
                  <Option value="0 9 * * 1-5">工作日早上9点</Option>
                  <Option value="0 12 * * *">每天中午12点</Option>
                  <Option value="0 18 * * *">每天晚上6点</Option>
                  <Option value="0 9 * * 0">每周日早上9点</Option>
                </Select>
              }
            />
          </Form.Item>
        </Card>

        <Card title="AI 摘要设置" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="summary_style" label="摘要风格">
                <Select>
                  {summaryStyles.map((style) => (
                    <Option key={style.value} value={style.value}>
                      {style.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="enable_speech"
                label="语音播报"
                valuePropName="checked"
                tooltip="执行后自动语音播报摘要内容"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="speech_template"
            label="播报模板"
            tooltip="可以使用 {{summary}} 变量插入摘要内容"
          >
            <TextArea
              rows={3}
              placeholder="例如：您好，这是您的每日摘要：{{summary}}"
            />
          </Form.Item>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={() => navigate('/tasks')}>
            取消
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={loading}
          >
            保存任务
          </Button>
        </div>
      </Form>
    </div>
  );
}

export default TaskCreate;
