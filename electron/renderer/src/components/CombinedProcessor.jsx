import React, { useState, useEffect } from 'react';
import {
  Card, Button, Form, Select, message, Typography,
  Space, Divider, List, Tag, Spin, Collapse, Descriptions,
  Input, Radio
} from 'antd';
import {
  PlayCircleOutlined, DatabaseOutlined, RobotOutlined,
  FileTextOutlined, SendOutlined, SaveOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

function CombinedProcessor() {
  const [adapters, setAdapters] = useState([]);
  const [aiConfigs, setAiConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fetchedData, setFetchedData] = useState(null);
  const [aiResponse, setAiResponse] = useState(null);
  const [form] = Form.useForm();

  // 预设提示词
  const presetPrompts = [
    {
      label: '文档总结',
      value: '请总结以下文档内容，提取关键信息和要点。'
    },
    {
      label: '问题解答',
      value: '请基于以下上下文信息，回答用户可能会提出的问题。'
    },
    {
      label: '行动建议',
      value: '请分析以下内容，给出具体的行动建议和待办事项。'
    },
    {
      label: '知识提取',
      value: '请从以下内容中提取关键知识点和概念，并进行整理。'
    },
    {
      label: '创意灵感',
      value: '请基于以下内容，提供创意想法和灵感启发。'
    }
  ];

  // 预设系统提示词
  const presetSystemPrompts = [
    {
      label: '专业助手',
      value: '你是一个专业的助手，擅长分析和总结信息。请用清晰、专业的语言回答问题。'
    },
    {
      label: '简洁风格',
      value: '你是一个简洁高效的助手。请用最简洁的语言回答问题，突出重点。'
    },
    {
      label: '详细风格',
      value: '你是一个注重细节的助手。请提供详细、全面的回答，包括相关的背景信息。'
    },
    {
      label: '创意风格',
      value: '你是一个富有创意的助手。请用创造性的思维回答问题，提供独特的见解。'
    }
  ];

  // 获取适配器列表
  const fetchAdapters = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/adapters');
      setAdapters(response.data.adapters || []);
    } catch (error) {
      console.error('Error fetching adapters:', error);
    }
  };

  // 获取 AI 配置列表
  const fetchAIConfigs = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/ai/configs');
      setAiConfigs(response.data.configs || []);
    } catch (error) {
      console.error('Error fetching AI configs:', error);
    }
  };

  useEffect(() => {
    fetchAdapters();
    fetchAIConfigs();
  }, []);

  // 从适配器获取数据
  const fetchAdapterData = async (values) => {
    setLoading(true);
    setFetchedData(null);
    setAiResponse(null);

    try {
      const response = await axios.post(
        `http://localhost:5000/api/adapters/${values.adapter_name}/fetch`,
        { time_range: values.time_range }
      );

      if (response.data.success) {
        setFetchedData(response.data);
        message.success(`成功获取 ${response.data.items_count} 条数据`);
      } else {
        message.error('获取数据失败');
      }
    } catch (error) {
      message.error('获取数据失败');
      console.error('Error fetching adapter data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 发送到 AI 处理
  const sendToAI = async (values) => {
    if (!fetchedData || fetchedData.items_count === 0) {
      message.warning('请先从适配器获取数据');
      return;
    }

    setProcessing(true);
    setAiResponse(null);

    try {
      const response = await axios.post('http://localhost:5000/api/combined/process', {
        adapter_name: values.adapter_name,
        time_range: values.time_range,
        ai_provider: values.ai_provider || undefined,
        prompt: values.prompt,
        system_prompt: values.system_prompt || undefined
      });

      if (response.data.success) {
        setAiResponse(response.data);
        message.success('AI 处理完成');
      } else {
        message.error(response.data.message || 'AI 处理失败');
      }
    } catch (error) {
      message.error('AI 处理失败');
      console.error('Error processing with AI:', error);
    } finally {
      setProcessing(false);
    }
  };

  // 表单提交
  const handleSubmit = async (values) => {
    if (!fetchedData) {
      // 第一次提交：先获取数据
      await fetchAdapterData(values);
    } else {
      // 已有数据：发送到 AI
      await sendToAI(values);
    }
  };

  // 重置
  const handleReset = () => {
    form.resetFields();
    setFetchedData(null);
    setAiResponse(null);
  };

  return (
    <div>
      <Title level={4}>适配器 + AI 组合处理</Title>
      <Paragraph type="secondary">
        选择适配器获取数据，然后使用 AI 进行智能处理。支持自定义提示词和系统角色设定。
      </Paragraph>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        {/* 左侧：配置和操作 */}
        <div>
          <Card title="配置设置">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Divider>数据源配置</Divider>

              <Form.Item
                name="adapter_name"
                label="选择适配器"
                rules={[{ required: true, message: '请选择适配器' }]}
              >
                <Select
                  placeholder="请选择数据源适配器"
                  prefix={<DatabaseOutlined />}
                >
                  {adapters.map(adapter => (
                    <Option key={adapter.name} value={adapter.name}>
                      {adapter.display_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="time_range"
                label="时间范围"
                initialValue="7d"
              >
                <Select>
                  <Option value="1d">最近 1 天</Option>
                  <Option value="7d">最近 7 天</Option>
                  <Option value="30d">最近 30 天</Option>
                </Select>
              </Form.Item>

              <Divider>AI 配置</Divider>

              <Form.Item
                name="ai_provider"
                label="选择 AI 配置（可选，使用默认）"
              >
                <Select
                  placeholder="选择 AI 配置（留空使用默认）"
                  prefix={<RobotOutlined />}
                  allowClear
                >
                  {aiConfigs.map(config => (
                    <Option key={config.name} value={config.name}>
                      {config.display_name || config.name}
                      {config.is_default && ' (默认)'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Divider>提示词设置</Divider>

              <Form.Item
                label="预设提示词"
              >
                <Select
                  placeholder="选择预设提示词"
                  onChange={(value) => {
                    form.setFieldsValue({ prompt: value });
                  }}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {presetPrompts.map(prompt => (
                    <Option key={prompt.value} value={prompt.value}>
                      {prompt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="prompt"
                label="用户提示词"
                rules={[{ required: true, message: '请输入提示词' }]}
                extra="描述您希望 AI 如何处理这些数据"
              >
                <TextArea
                  rows={4}
                  placeholder="例如：请总结以下内容，提取关键信息..."
                  prefix={<FileTextOutlined />}
                />
              </Form.Item>

              <Form.Item
                label="预设系统角色"
              >
                <Select
                  placeholder="选择预设系统角色"
                  onChange={(value) => {
                    form.setFieldsValue({ system_prompt: value });
                  }}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {presetSystemPrompts.map(prompt => (
                    <Option key={prompt.value} value={prompt.value}>
                      {prompt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="system_prompt"
                label="系统提示词（可选）"
                extra="定义 AI 的角色和行为方式"
              >
                <TextArea
                  rows={3}
                  placeholder="例如：你是一个专业的助手，请用简洁的语言回答问题..."
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={fetchedData ? <SendOutlined /> : <PlayCircleOutlined />}
                    loading={loading || processing}
                    size="large"
                  >
                    {fetchedData ? '发送到 AI 处理' : '获取数据'}
                  </Button>
                  {fetchedData && (
                    <Button onClick={handleReset}>
                      重新开始
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </div>

        {/* 右侧：结果展示 */}
        <div>
          {/* 数据预览 */}
          {fetchedData && (
            <Card 
              title={
                <Space>
                  <DatabaseOutlined />
                  <span>数据预览</span>
                  <Tag color="blue">{fetchedData.items_count} 条数据</Tag>
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              <List
                size="small"
                dataSource={fetchedData.items.slice(0, 10)}
                renderItem={(item, index) => (
                  <List.Item>
                    <Collapse ghost>
                      <Panel
                        header={
                          <Space>
                            <Text strong>{index + 1}. {item.title}</Text>
                            <Tag size="small">{item.source}</Tag>
                          </Space>
                        }
                        key={item.id}
                      >
                        <Descriptions size="small" column={1}>
                          <Descriptions.Item label="来源">
                            {item.source}
                          </Descriptions.Item>
                          <Descriptions.Item label="URL">
                            <Text type="secondary" copyable>
                              {item.url || '无'}
                            </Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="内容">
                            <Paragraph
                              ellipsis={{ rows: 10, expandable: true, symbol: '展开' }}
                            >
                              {item.content}
                            </Paragraph>
                          </Descriptions.Item>
                        </Descriptions>
                      </Panel>
                    </Collapse>
                  </List.Item>
                )}
              />
              {fetchedData.items.length > 10 && (
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
                  仅展示前 10 条，共 {fetchedData.items.length} 条数据
                </Text>
              )}
            </Card>
          )}

          {/* AI 响应 */}
          {aiResponse && (
            <Card 
              title={
                <Space>
                  <RobotOutlined />
                  <span>AI 响应</span>
                  <Tag color="green">成功</Tag>
                </Space>
              }
            >
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="使用的适配器">
                  {aiResponse.adapter_name}
                </Descriptions.Item>
                <Descriptions.Item label="处理数据量">
                  {aiResponse.items_count} 条
                </Descriptions.Item>
                {aiResponse.items_preview && aiResponse.items_preview.length > 0 && (
                  <Descriptions.Item label="处理的数据预览">
                    <List size="small" dataSource={aiResponse.items_preview}>
                      {(item) => (
                        <List.Item>
                          <Text>• {item.title}</Text>
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            ({item.source})
                          </Text>
                        </List.Item>
                      )}
                    </List>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="AI 响应内容">
                  <Card size="small" style={{ background: '#f5f5f5' }}>
                    <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                      {aiResponse.ai_response}
                    </Paragraph>
                  </Card>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* 占位提示 */}
          {!fetchedData && !aiResponse && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <PlayCircleOutlined style={{ fontSize: 48, color: '#ccc' }} />
                <Paragraph style={{ marginTop: 16, color: '#999' }}>
                  请在左侧配置数据源和提示词，然后点击"获取数据"开始
                </Paragraph>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default CombinedProcessor;