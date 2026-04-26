import React, { useState } from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  message,
  Divider,
  Switch,
  InputNumber,
  Alert,
  Tabs,
  Descriptions,
  Space,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

import { useAppStore } from '../store';
import { apiService } from '../services/api';

const { TabPane } = Tabs;
const { Option } = Select;

function Settings() {
  const { config, updateConfig } = useAppStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    form.setFieldsValue({
      maxConcurrentTasks: config.scheduler?.maxConcurrentTasks || 5,
      timezone: config.scheduler?.timezone || 'Asia/Shanghai',
    });
  }, [config]);

  const handleSave = async (values) => {
    setLoading(true);
    try {
      const newConfig = {
        ...config,
        scheduler: {
          maxConcurrentTasks: values.maxConcurrentTasks,
          timezone: values.timezone,
        },
      };

      await apiService.updateConfig(newConfig);
      updateConfig(newConfig);
      message.success('配置保存成功');
    } catch (error) {
      console.error('Failed to save config:', error);
      message.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  const timezones = [
    { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)' },
    { value: 'Asia/Tokyo', label: '日本标准时间 (UTC+9)' },
    { value: 'Asia/Singapore', label: '新加坡时间 (UTC+8)' },
    { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)' },
    { value: 'America/New_York', label: '美国东部时间 (UTC-5/-4)' },
    { value: 'America/Los_Angeles', label: '美国太平洋时间 (UTC-8/-7)' },
    { value: 'Europe/London', label: '伦敦时间 (UTC+0/+1)' },
    { value: 'Europe/Paris', label: '巴黎时间 (UTC+1/+2)' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>系统设置</h2>

      <Tabs defaultActiveKey="general">
        <TabPane tab="通用设置" key="general">
          <Card title="调度器设置">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              initialValues={{
                maxConcurrentTasks: 5,
                timezone: 'Asia/Shanghai',
              }}
            >
              <Form.Item
                name="maxConcurrentTasks"
                label="最大并发任务数"
                tooltip="同时运行的最大任务数量，推荐根据系统性能设置"
                rules={[{ required: true, message: '请输入最大并发任务数' }]}
              >
                <InputNumber min={1} max={50} style={{ width: 200 }} />
              </Form.Item>

              <Form.Item
                name="timezone"
                label="时区"
                tooltip="所有定时任务将基于此时区执行"
                rules={[{ required: true, message: '请选择时区' }]}
              >
                <Select style={{ width: 300 }}>
                  {timezones.map((tz) => (
                    <Option key={tz.value} value={tz.value}>
                      {tz.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  size="large"
                >
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab="关于" key="about">
          <Card title="系统信息">
            <Descriptions bordered column={1}>
              <Descriptions.Item label="应用名称">Smart Scheduler</Descriptions.Item>
              <Descriptions.Item label="版本号">1.0.0</Descriptions.Item>
              <Descriptions.Item label="技术架构">
                Electron + React + Python (Flask)
              </Descriptions.Item>
              <Descriptions.Item label="功能特性">
                <ul>
                  <li>自定义定时任务调度</li>
                  <li>多应用适配器集成</li>
                  <li>AI 大模型摘要生成</li>
                  <li>语音播报 (TTS)</li>
                  <li>蓝牙音箱支持</li>
                  <li>AI 对话交互</li>
                </ul>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="使用说明" style={{ marginTop: 16 }}>
            <Alert
              message="快速开始"
              description={
                <div>
                  <ol>
                    <li>
                      <strong>配置 AI 服务:</strong> 前往 "AI 设置" 页面，配置您的 OpenAI/Claude API Key
                    </li>
                    <li>
                      <strong>配置应用适配器:</strong> 前往 "应用管理" 页面，配置要接入的应用
                    </li>
                    <li>
                      <strong>创建定时任务:</strong> 前往 "定时任务" 页面，创建您的第一个任务
                    </li>
                    <li>
                      <strong>配置音频输出:</strong> 前往 "音频设置" 页面，选择输出设备并测试语音
                    </li>
                  </ol>
                </div>
              }
              type="info"
              showIcon
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}

export default Settings;
