import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  message,
  Tabs,
  Descriptions,
  Space,
  Divider,
  InputNumber,
  Switch,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  RobotOutlined,
  MessageOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

import { useAppStore } from '../store';
import { apiService } from '../services/api';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

function AIConfig() {
  const { config, updateConfig } = useAppStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('你好，请介绍一下你自己');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    form.setFieldsValue({
      provider: config.ai?.provider || 'openai',
      apiKey: config.ai?.apiKey || '',
      model: config.ai?.model || 'gpt-3.5-turbo',
      baseUrl: config.ai?.baseUrl || '',
    });
  }, [config.ai]);

  const handleSave = async (values) => {
    setLoading(true);
    try {
      const newConfig = {
        ...config,
        ai: {
          provider: values.provider,
          apiKey: values.apiKey,
          model: values.model,
          baseUrl: values.baseUrl,
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

  const handleTest = async () => {
    if (!testMessage.trim()) {
      message.warning('请输入测试消息');
      return;
    }

    setTestLoading(true);
    setTestResult('');

    try {
      const response = await apiService.chatWithAI(
        testMessage.trim(),
        [],
        form.getFieldValue('provider')
      );
      setTestResult(response.response);
      message.success('测试成功');
    } catch (error) {
      console.error('Test failed:', error);
      message.error('测试失败，请检查配置');
    } finally {
      setTestLoading(false);
    }
  };

  const providerOptions = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'claude', label: 'Claude (Anthropic)' },
    { value: 'local', label: '本地模型 (Ollama)' },
  ];

  const getModelOptions = (provider) => {
    switch (provider) {
      case 'openai':
        return [
          'gpt-3.5-turbo',
          'gpt-3.5-turbo-16k',
          'gpt-4',
          'gpt-4-32k',
          'gpt-4-turbo-preview',
        ];
      case 'claude':
        return [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-2.1',
        ];
      case 'local':
        return [
          'llama2',
          'llama3',
          'mistral',
          'codellama',
          'qwen',
        ];
      default:
        return [];
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>AI 配置</h2>

      <Tabs defaultActiveKey="config">
        <TabPane tab="基础配置" key="config">
          <Card>
            <Alert
              message="配置说明"
              description={
                <div>
                  <p>请根据您选择的 AI 提供商配置相应的参数：</p>
                  <ul>
                    <li><strong>OpenAI:</strong> 需要 API Key，可在 <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer">OpenAI 控制台</a> 获取</li>
                    <li><strong>Claude:</strong> 需要 API Key，可在 <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic 控制台</a> 获取</li>
                    <li><strong>本地模型:</strong> 需要先安装并启动 Ollama，支持本地运行 AI 模型</li>
                  </ul>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              initialValues={{
                provider: 'openai',
                model: 'gpt-3.5-turbo',
              }}
            >
              <Form.Item
                name="provider"
                label="AI 提供商"
                rules={[{ required: true, message: '请选择 AI 提供商' }]}
              >
                <Select options={providerOptions} />
              </Form.Item>

              <Form.Item
                name="apiKey"
                label="API Key"
                tooltip="请输入您的 API Key"
                rules={[
                  { required: true, message: '请输入 API Key' },
                ]}
              >
                <Input.Password placeholder="请输入 API Key" />
              </Form.Item>

              <Form.Item noStyle dependencies={['provider']}>
                {({ getFieldValue }) => {
                  const provider = getFieldValue('provider');
                  const modelOptions = getModelOptions(provider);

                  return (
                    <Form.Item
                      name="model"
                      label="模型"
                      rules={[{ required: true, message: '请选择模型' }]}
                    >
                      <Select
                        showSearch
                        placeholder="选择模型"
                        optionFilterProp="children"
                      >
                        {modelOptions.map((model) => (
                          <Option key={model} value={model}>
                            {model}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  );
                }}
              </Form.Item>

              <Form.Item
                name="baseUrl"
                label="API 地址 (可选)"
                tooltip="用于自定义 API 端点，例如使用代理或本地部署的 API"
              >
                <Input placeholder="例如: https://api.openai.com/v1" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  size="large"
                >
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab="连接测试" key="test">
          <Card title="测试 AI 连接">
            <Form layout="vertical">
              <Form.Item label="测试消息">
                <TextArea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="输入要发送给 AI 的消息..."
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  icon={<MessageOutlined />}
                  onClick={handleTest}
                  loading={testLoading}
                >
                  发送测试消息
                </Button>
              </Form.Item>
            </Form>

            {testResult && (
              <div>
                <Divider>测试结果</Divider>
                <Card
                  title="AI 回复"
                  style={{ background: '#fafafa' }}
                >
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                    {testResult}
                  </div>
                </Card>
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane tab="摘要配置" key="summary">
          <Card title="内容摘要设置">
            <Descriptions bordered column={1}>
              <Descriptions.Item label="摘要风格说明">
                <ul>
                  <li><strong>简洁模式:</strong> 用最简短的语言概括内容，适合快速浏览</li>
                  <li><strong>详细模式:</strong> 保留更多细节信息，适合深度阅读</li>
                  <li><strong>要点列表:</strong> 以列表形式呈现关键要点，结构清晰</li>
                  <li><strong>新闻播报:</strong> 以新闻播报的风格组织内容，适合语音播报</li>
                  <li><strong>讲故事:</strong> 以更生动有趣的方式讲述内容，增强吸引力</li>
                </ul>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}

export default AIConfig;
