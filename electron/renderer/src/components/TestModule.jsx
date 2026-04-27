import React, { useState, useEffect } from 'react';
import {
  Card, Button, Form, Select, message, List, Typography,
  Space, Divider, Collapse, Descriptions, Tag, Spin,
  Tabs, Input, Checkbox
} from 'antd';
import {
  ExperimentOutlined, DatabaseOutlined, RobotOutlined,
  CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined,
  SyncOutlined, SendOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
const { TextArea, Password } = Input;
const { TabPane } = Tabs;

const PRESET_PROMPTS = [
  { label: '文档总结', value: '请总结以下文档内容，提取关键信息和要点。' },
  { label: '问题解答', value: '请基于以下上下文信息，回答用户可能会提出的问题。' },
  { label: '行动建议', value: '请分析以下内容，给出具体的行动建议和待办事项。' },
  { label: '知识提取', value: '请从以下内容中提取关键知识点和概念，并进行整理。' },
  { label: '创意灵感', value: '请基于以下内容，提供创意想法和灵感启发。' }
];

const PRESET_SYSTEM_PROMPTS = [
  { label: '专业助手', value: '你是一个专业的助手，擅长分析和总结信息。请用清晰、专业的语言回答问题。' },
  { label: '简洁风格', value: '你是一个简洁高效的助手。请用最简洁的语言回答问题，突出重点。' },
  { label: '详细风格', value: '你是一个注重细节的助手。请提供详细、全面的回答，包括相关的背景信息。' },
  { label: '创意风格', value: '你是一个富有创意的助手。请用创造性的思维回答问题，提供独特的见解。' }
];

function TestModule() {
  const [adapters, setAdapters] = useState([]);
  const [aiConfigs, setAiConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);
  
  const [adapterForm] = Form.useForm();
  const [aiForm] = Form.useForm();
  const [combinedForm] = Form.useForm();

  const [fetchedData, setFetchedData] = useState(null);
  const [selectedAdapters, setSelectedAdapters] = useState([]);

  const fetchAdapters = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/adapters');
      setAdapters(response.data.adapters || []);
    } catch (error) {
      console.error('Error fetching adapters:', error);
    }
  };

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
      const configResponse = await axios.get(
        `http://localhost:5000/api/ai/configs/${values.config_name}`
      );
      
      const config = configResponse.data.config;
      if (!config) {
        throw new Error('配置不存在');
      }

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

  const fetchDataFromAdapters = async (values) => {
    if (!selectedAdapters || selectedAdapters.length === 0) {
      message.warning('请至少选择一个适配器');
      return;
    }

    setLoading(true);
    setFetchedData(null);

    const allData = {
      total_count: 0,
      adapter_data: {},
      all_items: []
    };

    try {
      for (const adapterName of selectedAdapters) {
        const testId = `fetch-${adapterName}-${Date.now()}`;
        
        setTestResults(prev => [...prev, {
          id: testId,
          type: 'fetch',
          name: adapterName,
          status: 'running',
          message: `正在从 ${adapterName} 获取数据...`,
          timestamp: new Date().toISOString()
        }]);

        try {
          const response = await axios.post(
            `http://localhost:5000/api/adapters/${adapterName}/fetch`,
            { time_range: values.time_range }
          );

          const result = response.data;
          
          if (result.success) {
            allData.adapter_data[adapterName] = result;
            allData.all_items.push(...(result.items || []));
            allData.total_count += result.items_count;

            setTestResults(prev => prev.map(item => 
              item.id === testId ? {
                ...item,
                status: 'success',
                message: `获取成功，共 ${result.items_count} 条数据`,
                details: result
              } : item
            ));
          } else {
            setTestResults(prev => prev.map(item => 
              item.id === testId ? {
                ...item,
                status: 'error',
                message: `获取失败: ${result.error}`
              } : item
            ));
          }
        } catch (error) {
          setTestResults(prev => prev.map(item => 
            item.id === testId ? {
              ...item,
              status: 'error',
              message: `获取失败: ${error.message}`
            } : item
          ));
        }
      }

      if (allData.total_count > 0) {
        setFetchedData(allData);
        message.success(`成功获取 ${allData.total_count} 条数据`);
      } else {
        message.warning('未获取到任何数据');
      }
    } catch (error) {
      message.error('获取数据失败');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendToAI = async (values) => {
    if (!fetchedData || fetchedData.total_count === 0) {
      message.warning('请先获取数据');
      return;
    }

    setLoading(true);
    const testId = `combined-${Date.now()}`;
    
    setTestResults(prev => [...prev, {
      id: testId,
      type: 'combined',
      name: `${selectedAdapters.join(', ')} + ${values.ai_provider || '默认'}`,
      status: 'running',
      message: '正在发送到 AI 处理...',
      timestamp: new Date().toISOString()
    }]);

    try {
      const response = await axios.post('http://localhost:5000/api/combined/process', {
        adapter_name: selectedAdapters[0],
        time_range: values.time_range,
        ai_provider: values.ai_provider || undefined,
        prompt: values.prompt,
        system_prompt: values.system_prompt || undefined
      });

      const result = response.data;
      
      if (result.success) {
        setTestResults(prev => prev.map(item => 
          item.id === testId ? {
            ...item,
            status: 'success',
            message: 'AI 处理成功',
            details: result
          } : item
        ));
        message.success('AI 处理成功');
      } else {
        setTestResults(prev => prev.map(item => 
          item.id === testId ? {
            ...item,
            status: 'error',
            message: `处理失败: ${result.message || '未知错误'}`
          } : item
        ));
        message.error('AI 处理失败');
      }
    } catch (error) {
      setTestResults(prev => prev.map(item => 
        item.id === testId ? {
          ...item,
          status: 'error',
          message: `处理失败: ${error.message}`
        } : item
      ));
      message.error('AI 处理失败');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setFetchedData(null);
  };

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

  const renderTypeIcon = (type) => {
    switch (type) {
      case 'adapter':
        return <DatabaseOutlined style={{ fontSize: 16 }} />;
      case 'ai':
        return <RobotOutlined style={{ fontSize: 16 }} />;
      case 'fetch':
        return <SyncOutlined style={{ fontSize: 16 }} spin />;
      case 'combined':
        return <SendOutlined style={{ fontSize: 16 }} />;
      default:
        return <ExperimentOutlined style={{ fontSize: 16 }} />;
    }
  };

  return (
    <div>
      <Title level={4}>测试模块</Title>
      
      <Tabs defaultActiveKey="adapter">
        <TabPane tab={<span><DatabaseOutlined /> 适配器测试</span>} key="adapter">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <Card title="单适配器测试">
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

            <Card title="测试说明">
              <Paragraph>
                <Text strong>适配器测试</Text>用于测试单个适配器能否正常工作。
              </Paragraph>
              <Paragraph>
                测试步骤：
                <List size="small">
                  <List.Item>1. 选择要测试的适配器</List.Item>
                  <List.Item>2. 选择时间范围</List.Item>
                  <List.Item>3. 点击"测试适配器"按钮</List.Item>
                  <List.Item>4. 查看测试结果</List.Item>
                </List>
              </Paragraph>
            </Card>
          </div>
        </TabPane>

        <TabPane tab={<span><RobotOutlined /> AI 配置测试</span>} key="ai">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <Card title="AI 连接测试">
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
                    测试 AI 连接
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card title="测试说明">
              <Paragraph>
                <Text strong>AI 配置测试</Text>用于测试 AI 配置能否正常连接。
              </Paragraph>
              <Paragraph>
                测试步骤：
                <List size="small">
                  <List.Item>1. 选择要测试的 AI 配置</List.Item>
                  <List.Item>2. 点击"测试 AI 连接"按钮</List.Item>
                  <List.Item>3. 查看测试结果</List.Item>
                </List>
              </Paragraph>
              <Paragraph type="secondary">
                提示：如果没有可用的 AI 配置，请先在"AI 配置管理"页面添加配置。
              </Paragraph>
            </Card>
          </div>
        </TabPane>

        <TabPane tab={<span><SendOutlined /> 组合测试</span>} key="combined">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <Card title="组合测试配置">
              <Form
                form={combinedForm}
                layout="vertical"
              >
                <Divider>数据源配置</Divider>
                
                <Form.Item label="选择适配器（可多选）">
                  <Select
                    mode="multiple"
                    placeholder="请选择适配器"
                    value={selectedAdapters}
                    onChange={setSelectedAdapters}
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

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      icon={<SyncOutlined />}
                      onClick={() => combinedForm.validateFields().then(fetchDataFromAdapters)}
                      loading={loading}
                    >
                      获取数据
                    </Button>
                  </Space>
                </Form.Item>

                {fetchedData && fetchedData.total_count > 0 && (
                  <>
                    <Divider>AI 配置</Divider>
                    
                    <Form.Item
                      name="ai_provider"
                      label="选择 AI 配置（可选，使用默认）"
                    >
                      <Select placeholder="选择 AI 配置（留空使用默认）" allowClear>
                        {aiConfigs.map(config => (
                          <Option key={config.name} value={config.name}>
                            {config.display_name || config.name}
                            {config.is_default && ' (默认)'}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Divider>提示词设置</Divider>

                    <Form.Item label="预设用户提示词">
                      <Select
                        placeholder="选择预设提示词"
                        allowClear
                        onChange={(value) => {
                          if (value) {
                            combinedForm.setFieldsValue({ prompt: value });
                          }
                        }}
                        style={{ width: '100%' }}
                      >
                        {PRESET_PROMPTS.map(prompt => (
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
                      />
                    </Form.Item>

                    <Form.Item label="预设系统角色">
                      <Select
                        placeholder="选择预设系统角色"
                        allowClear
                        onChange={(value) => {
                          if (value) {
                            combinedForm.setFieldsValue({ system_prompt: value });
                          }
                        }}
                        style={{ width: '100%' }}
                      >
                        {PRESET_SYSTEM_PROMPTS.map(prompt => (
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
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={() => combinedForm.validateFields().then(sendToAI)}
                        loading={loading}
                        size="large"
                      >
                        发送到 AI 处理
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form>
            </Card>

            <Card title="数据预览">
              {fetchedData && fetchedData.total_count > 0 ? (
                <>
                  <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="总数据条数">
                      <Tag color="blue">{fetchedData.total_count}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="使用的适配器">
                      <Space>
                        {Object.keys(fetchedData.adapter_data).map(name => (
                          <Tag key={name}>
                            {name}: {fetchedData.adapter_data[name].items_count} 条
                          </Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>

                  <Divider>数据预览（前 10 条）</Divider>
                  
                  <List
                    size="small"
                    dataSource={fetchedData.all_items.slice(0, 10)}
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
                              <Descriptions.Item label="内容">
                                <Paragraph
                                  ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}
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
                  
                  {fetchedData.all_items.length > 10 && (
                    <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
                      仅展示前 10 条，共 {fetchedData.all_items.length} 条数据
                    </Text>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <SyncOutlined style={{ fontSize: 48, color: '#ccc' }} />
                  <Paragraph style={{ marginTop: 16, color: '#999' }}>
                    请选择适配器并点击"获取数据"
                  </Paragraph>
                </div>
              )}
            </Card>
          </div>
        </TabPane>
      </Tabs>

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
                        {renderTypeIcon(result.type)}
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
                        {result.type === 'adapter' || result.type === 'fetch' ? (
                          <Descriptions size="small" column={1}>
                            <Descriptions.Item label="数据条数">
                              {result.details.items_count}
                            </Descriptions.Item>
                            {result.details.items && result.details.items.length > 0 && (
                              <Descriptions.Item label="数据预览">
                                <List
                                  size="small"
                                  dataSource={result.details.items.slice(0, 5)}
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
                        ) : result.type === 'combined' ? (
                          <Descriptions size="small" column={1}>
                            <Descriptions.Item label="适配器">
                              {result.details.adapter_name}
                            </Descriptions.Item>
                            <Descriptions.Item label="处理数据量">
                              {result.details.items_count} 条
                            </Descriptions.Item>
                            <Descriptions.Item label="AI 响应">
                              <Card size="small" style={{ background: '#f5f5f5' }}>
                                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                                  {result.details.ai_response}
                                </Paragraph>
                              </Card>
                            </Descriptions.Item>
                          </Descriptions>
                        ) : (
                          <Descriptions size="small" column={1}>
                            <Descriptions.Item label="响应内容">
                              <Paragraph ellipsis={{ rows: 10, expandable: true, symbol: '展开' }}>
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
