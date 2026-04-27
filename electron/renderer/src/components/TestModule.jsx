import React, { useState, useEffect } from 'react';
import {
  Card, Button, Form, Select, message, List, Typography,
  Space, Divider, Collapse, Descriptions, Tag, Spin
} from 'antd';
import {
  ExperimentOutlined, DatabaseOutlined, RobotOutlined,
  CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

function TestModule() {
  const [adapters, setAdapters] = useState([]);
  const [aiConfigs, setAiConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [adapterForm] = Form.useForm();
  const [aiForm] = Form.useForm();

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

  // 测试适配器
  const testAdapter = async (values) => {
    setLoading(true);
    const testId = `adapter-${Date.now()}`;
    
    setTestResults(prev => [...prev, {
      id: testId,
      type: 'adapter',
      name: values.adapter_name,
      status: 'running',
      message: '正在测试适配器...',
      timestamp: new Date().toISOString()
    }]);

    try {
      const response = await axios.post(
        `http://localhost:5000/api/adapters/${values.adapter_name}/test`,
        { time_range: values.time_range }
      );

      const result = response.data;
      
      setTestResults(prev => prev.map(item => 
        item.id === testId ? {
          ...item,
          status: result.success ? 'success' : 'error',
          message: result.success ? 
            `测试成功，获取到 ${result.items_count} 条数据` : 
            `测试失败: ${result.error}`,
          details: result
        } : item
      ));

      if (result.success) {
        message.success('适配器测试成功');
      } else {
        message.error('适配器测试失败');
      }
    } catch (error) {
      setTestResults(prev => prev.map(item => 
        item.id === testId ? {
          ...item,
          status: 'error',
          message: `测试失败: ${error.message}`
        } : item
      ));
      message.error('适配器测试失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试 AI 配置
  const testAIConfig = async (values) => {
    setLoading(true);
    const testId = `ai-${Date.now()}`;
    
    setTestResults(prev => [...prev, {
      id: testId,
      type: 'ai',
      name: values.config_name,
      status: 'running',
      message: '正在测试 AI 配置...',
      timestamp: new Date().toISOString()
    }]);

    try {
      // 先获取配置详情
      const configResponse = await axios.get(
        `http://localhost:5000/api/ai/configs/${values.config_name}`
      );
      
      const config = configResponse.data.config;
      if (!config) {
        throw new Error('配置不存在');
      }

      // 测试连接
      const response = await axios.post('http://localhost:5000/api/ai/test', {
        provider_type: config.provider_type,
        config: config.config
      });

      const result = response.data;
      
      setTestResults(prev => prev.map(item => 
        item.id === testId ? {
          ...item,
          status: result.success ? 'success' : 'error',
          message: result.success ? 
            'AI 连接测试成功' : 
            `测试失败: ${result.error}`,
          details: result
        } : item
      ));

      if (result.success) {
        message.success('AI 配置测试成功');
      } else {
        message.error('AI 配置测试失败');
      }
    } catch (error) {
      setTestResults(prev => prev.map(item => 
        item.id === testId ? {
          ...item,
          status: 'error',
          message: `测试失败: ${error.message}`
        } : item
      ));
      message.error('AI 配置测试失败');
    } finally {
      setLoading(false);
    }
  };

  // 清除测试结果
  const clearResults = () => {
    setTestResults([]);
  };

  // 渲染状态标签
  const renderStatusTag = (status) => {
    switch (status) {
      case 'running':
        return <Tag icon={<Spin indicator={<LoadingOutlined spin />} />} color="processing">测试中</Tag>;
      case 'success':
        return <Tag icon={<CheckCircleOutlined />} color="success">成功</Tag>;
      case 'error':
        return <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  return (
    <div>
      <Title level={4}>测试模块</Title>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 适配器测试 */}
        <Card title={<span><DatabaseOutlined style={{ marginRight: 8 }} />适配器测试</span>}>
          <Form
            form={adapterForm}
            layout="vertical"
            onFinish={testAdapter}
          >
            <Form.Item
              name="adapter_name"
              label="选择适配器"
              rules={[{ required: true, message: '请选择适配器' }]}
            >
              <Select placeholder="请选择要测试的适配器">
                {adapters.map(adapter => (
                  <Option key={adapter.name} value={adapter.name}>
                    {adapter.display_name} ({adapter.description})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="time_range"
              label="时间范围"
              initialValue="1d"
            >
              <Select>
                <Option value="1d">最近 1 天</Option>
                <Option value="7d">最近 7 天</Option>
                <Option value="30d">最近 30 天</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<ExperimentOutlined />}
                loading={loading}
                block
              >
                测试适配器
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* AI 配置测试 */}
        <Card title={<span><RobotOutlined style={{ marginRight: 8 }} />AI 配置测试</span>}>
          <Form
            form={aiForm}
            layout="vertical"
            onFinish={testAIConfig}
          >
            <Form.Item
              name="config_name"
              label="选择 AI 配置"
              rules={[{ required: true, message: '请选择 AI 配置' }]}
            >
              <Select placeholder="请选择要测试的 AI 配置">
                {aiConfigs.map(config => (
                  <Option key={config.name} value={config.name}>
                    {config.display_name || config.name}
                    {config.is_default && ' (默认)'}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<ExperimentOutlined />}
                loading={loading}
                block
              >
                测试 AI 配置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5}>测试结果</Title>
            <Button onClick={clearResults} size="small">
              清除结果
            </Button>
          </div>

          <List
            dataSource={testResults}
            renderItem={result => (
              <List.Item>
                <Card size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Space>
                        {result.type === 'adapter' ? (
                          <DatabaseOutlined style={{ fontSize: 16 }} />
                        ) : (
                          <RobotOutlined style={{ fontSize: 16 }} />
                        )}
                        <Text strong>{result.name}</Text>
                        {renderStatusTag(result.status)}
                      </Space>
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary">{result.message}</Text>
                      </div>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(result.timestamp).toLocaleString()}
                    </Text>
                  </div>

                  {result.details && (
                    <Collapse style={{ marginTop: 16 }} size="small">
                      <Panel header="详细信息" key="details">
                        {result.type === 'adapter' ? (
                          <Descriptions size="small" column={1}>
                            <Descriptions.Item label="数据条数">
                              {result.details.items_count}
                            </Descriptions.Item>
                            {result.details.items && result.details.items.length > 0 && (
                              <Descriptions.Item label="数据预览">
                                <List
                                  size="small"
                                  dataSource={result.details.items}
                                  renderItem={item => (
                                    <List.Item>
                                      <Text>{item.title}</Text>
                                      <Text type="secondary" style={{ marginLeft: 16 }}>
                                        ({item.source})
                                      </Text>
                                    </List.Item>
                                  )}
                                />
                              </Descriptions.Item>
                            )}
                          </Descriptions>
                        ) : (
                          <Descriptions size="small" column={1}>
                            <Descriptions.Item label="响应内容">
                              <Paragraph ellipsis={{ rows: 3 }}>
                                {result.details.response || '无响应内容'}
                              </Paragraph>
                            </Descriptions.Item>
                          </Descriptions>
                        )}
                      </Panel>
                    </Collapse>
                  )}
                </Card>
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
}

export default TestModule;