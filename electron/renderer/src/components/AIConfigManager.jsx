import React, { useState, useEffect } from 'react';
import {
  Card, Button, Form, Input, Select, message, List, Typography,
  Modal, Switch, Space, Popconfirm, Tag, Divider, Radio
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SettingOutlined, ExperimentOutlined, ImportOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea, Password } = Input;

const DEFAULT_PROVIDER_TYPES = [
  {
    type: 'openai',
    display_name: 'OpenAI 兼容',
    description: '支持 OpenAI API 格式的提供商，包括云雾AI等',
    config_schema: {
      api_key: { type: 'string', required: true, title: 'API 密钥', description: 'API 访问密钥' },
      model: { type: 'string', required: true, title: '模型名称', description: '要使用的模型名称，如 gpt-4, claude-3 等' },
      base_url: { type: 'string', required: false, title: 'API 地址', description: '自定义 API 地址（可选）' }
    }
  },
  {
    type: 'yunwu',
    display_name: '云雾 AI',
    description: '云雾 AI 服务（OpenAI 兼容格式）',
    config_schema: {
      api_key: { type: 'string', required: true, title: 'API 密钥', description: '云雾 AI 的 API 密钥' },
      model: { type: 'string', required: true, title: '模型名称', description: '要使用的模型名称' },
      base_url: { type: 'string', required: false, title: 'API 地址', description: '自定义 API 地址，默认 https://api.yunwu.ai/v1', default: 'https://api.yunwu.ai/v1' }
    }
  },
  {
    type: 'anthropic',
    display_name: 'Anthropic Claude',
    description: 'Anthropic Claude 系列模型',
    config_schema: {
      api_key: { type: 'string', required: true, title: 'API 密钥', description: 'Anthropic API 密钥' },
      model: { type: 'string', required: true, title: '模型名称', description: 'Claude 模型名称，如 claude-3-sonnet-20240229' }
    }
  },
  {
    type: 'ollama',
    display_name: 'Ollama 本地模型',
    description: '本地运行的 Ollama 模型',
    config_schema: {
      model: { type: 'string', required: true, title: '模型名称', description: 'Ollama 模型名称，如 llama2, mistral 等' },
      base_url: { type: 'string', required: false, title: 'API 地址', description: 'Ollama 服务地址，默认 http://localhost:11434', default: 'http://localhost:11434' }
    }
  }
];

function AIConfigManager() {
  const [configs, setConfigs] = useState([]);
  const [providerTypes, setProviderTypes] = useState(DEFAULT_PROVIDER_TYPES);
  const [initialConfigs, setInitialConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [selectedImportConfig, setSelectedImportConfig] = useState(null);
  const [form] = Form.useForm();
  const [selectedProviderType, setSelectedProviderType] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/ai/configs');
      setConfigs(response.data.configs || []);
    } catch (error) {
      console.error('Error fetching AI configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderTypes = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/ai/provider-types');
      if (response.data.provider_types && response.data.provider_types.length > 0) {
        setProviderTypes(response.data.provider_types);
      }
    } catch (error) {
      console.error('Error fetching provider types:', error);
    }
  };

  const fetchInitialConfigs = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/ai/initial-config');
      setInitialConfigs(response.data.initial_configs || []);
    } catch (error) {
      console.error('Error fetching initial configs:', error);
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchProviderTypes();
    fetchInitialConfigs();
  }, []);

  const openModal = (config = null) => {
    setEditingConfig(config);
    if (config) {
      form.setFieldsValue({
        name: config.name,
        display_name: config.display_name,
        provider_type: config.provider_type,
        is_default: config.is_default,
        enabled: config.enabled,
        ...config.config
      });
      setSelectedProviderType(config.provider_type);
    } else {
      form.resetFields();
      setSelectedProviderType(null);
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingConfig(null);
    form.resetFields();
    setSelectedProviderType(null);
  };

  const openImportModal = () => {
    setSelectedImportConfig(null);
    setImportModalVisible(true);
  };

  const closeImportModal = () => {
    setImportModalVisible(false);
    setSelectedImportConfig(null);
  };

  const handleProviderTypeChange = (value) => {
    setSelectedProviderType(value);
  };

  const testConnection = async () => {
    try {
      const values = await form.validateFields();
      setTestLoading(true);
      
      const config = {
        api_key: values.api_key,
        model: values.model,
        base_url: values.base_url
      };
      
      const response = await axios.post('http://localhost:5000/api/ai/test', {
        provider_type: values.provider_type,
        config
      });
      
      if (response.data.success) {
        message.success('连接测试成功！');
      } else {
        message.error(`连接测试失败: ${response.data.error}`);
      }
    } catch (error) {
      message.error('测试连接失败');
      console.error('Test connection error:', error);
    } finally {
      setTestLoading(false);
    }
  };

  const saveConfig = async (values) => {
    setLoading(true);
    try {
      const config = {
        api_key: values.api_key,
        model: values.model,
        base_url: values.base_url
      };
      
      const data = {
        name: values.name,
        display_name: values.display_name || values.name,
        provider_type: values.provider_type,
        config,
        is_default: values.is_default || false,
        enabled: values.enabled !== false
      };
      
      await axios.post('http://localhost:5000/api/ai/configs', data);
      
      message.success('配置保存成功');
      closeModal();
      fetchConfigs();
    } catch (error) {
      message.error('保存配置失败');
      console.error('Error saving AI config:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async (configName) => {
    try {
      await axios.delete(`http://localhost:5000/api/ai/configs/${configName}`);
      message.success('配置删除成功');
      fetchConfigs();
    } catch (error) {
      message.error('删除配置失败');
      console.error('Error deleting AI config:', error);
    }
  };

  const setDefaultConfig = async (configName) => {
    try {
      await axios.post(`http://localhost:5000/api/ai/configs/${configName}/default`);
      message.success('已设置为默认配置');
      fetchConfigs();
    } catch (error) {
      message.error('设置默认配置失败');
      console.error('Error setting default config:', error);
    }
  };

  const importInitialConfig = async () => {
    if (!selectedImportConfig) {
      message.warning('请选择要导入的配置');
      return;
    }

    try {
      const data = {
        name: selectedImportConfig.name,
        display_name: selectedImportConfig.display_name,
        provider_type: selectedImportConfig.provider_type,
        config: selectedImportConfig.config,
        is_default: configs.length === 0,
        enabled: true
      };
      
      await axios.post('http://localhost:5000/api/ai/configs', data);
      
      message.success('配置导入成功');
      closeImportModal();
      fetchConfigs();
    } catch (error) {
      message.error('导入配置失败');
      console.error('Error importing config:', error);
    }
  };

  const getCurrentProviderSchema = () => {
    if (!selectedProviderType) return null;
    const provider = providerTypes.find(p => p.type === selectedProviderType);
    return provider?.config_schema || null;
  };

  const currentSchema = getCurrentProviderSchema();

  const hasDefaultConfig = configs.some(c => c.is_default);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4}>AI 配置管理</Title>
        <Space>
          {initialConfigs.length > 0 && (
            <Button icon={<ImportOutlined />} onClick={openImportModal}>
              导入初始配置
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            新建配置
          </Button>
        </Space>
      </div>

      {!hasDefaultConfig && configs.length > 0 && (
        <Card style={{ marginBottom: 24, background: '#fffbe6', borderColor: '#ffe58f' }}>
          <Text type="warning">⚠️ 尚未设置默认配置，请选择一个配置设为默认。</Text>
        </Card>
      )}

      <List
        loading={loading}
        grid={{ gutter: 16, column: 1 }}
        dataSource={configs}
        locale={{ 
          emptyText: (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <SettingOutlined style={{ fontSize: 48, color: '#ccc' }} />
              <Paragraph style={{ marginTop: 16, color: '#999' }}>
                暂无 AI 配置
              </Paragraph>
              <Space>
                {initialConfigs.length > 0 && (
                  <Button icon={<ImportOutlined />} onClick={openImportModal}>
                    从初始配置导入
                  </Button>
                )}
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                  新建配置
                </Button>
              </Space>
            </div>
          )
        }}
        renderItem={config => (
          <List.Item>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Title level={5} style={{ margin: 0 }}>{config.display_name || config.name}</Title>
                    {config.is_default && (
                      <Tag color="gold">默认</Tag>
                    )}
                    {config.enabled ? (
                      <Tag icon={<CheckCircleOutlined />} color="success">已启用</Tag>
                    ) : (
                      <Tag icon={<CloseCircleOutlined />} color="default">已禁用</Tag>
                    )}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">配置名称: </Text>
                    <Text>{config.name}</Text>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">提供商类型: </Text>
                    <Text>{config.provider_type}</Text>
                  </div>
                  <div>
                    <Text type="secondary">模型: </Text>
                    <Text>{config.config?.model || '未设置'}</Text>
                  </div>
                  {config.config?.base_url && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">API 地址: </Text>
                      <Text copyable>{config.config.base_url}</Text>
                    </div>
                  )}
                </div>
                <Space>
                  {!config.is_default && (
                    <Button
                      size="small"
                      onClick={() => setDefaultConfig(config.name)}
                    >
                      设为默认
                    </Button>
                  )}
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openModal(config)}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确定要删除这个配置吗？"
                    onConfirm={() => deleteConfig(config.name)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title="新建/编辑 AI 配置"
        open={modalVisible}
        onCancel={closeModal}
        width={600}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveConfig}
        >
          <Form.Item
            name="name"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="例如: yunwu-gpt4" disabled={!!editingConfig} />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="显示名称"
          >
            <Input placeholder="例如: 云雾AI GPT-4" />
          </Form.Item>

          <Form.Item
            name="provider_type"
            label="提供商类型"
            rules={[{ required: true, message: '请选择提供商类型' }]}
          >
            <Select
              placeholder="请选择提供商类型"
              onChange={handleProviderTypeChange}
            >
              {providerTypes.map(provider => (
                <Option key={provider.type} value={provider.type}>
                  {provider.display_name} - {provider.description}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedProviderType && (
            <>
              <Divider>连接配置</Divider>
              
              {currentSchema?.api_key && (
                <Form.Item
                  name="api_key"
                  label={currentSchema.api_key.title}
                  rules={currentSchema.api_key.required ? [{ required: true, message: `请输入${currentSchema.api_key.title}` }] : []}
                  extra={currentSchema.api_key.description}
                >
                  <Password 
                    placeholder={`请输入${currentSchema.api_key.title}`}
                    visibilityToggle={true}
                  />
                </Form.Item>
              )}

              {currentSchema?.model && (
                <Form.Item
                  name="model"
                  label={currentSchema.model.title}
                  rules={currentSchema.model.required ? [{ required: true, message: `请输入${currentSchema.model.title}` }] : []}
                  extra={currentSchema.model.description}
                >
                  <Input placeholder="例如: gpt-4, claude-3-sonnet-20240229, llama2" />
                </Form.Item>
              )}

              {currentSchema?.base_url && (
                <Form.Item
                  name="base_url"
                  label={currentSchema.base_url.title}
                  rules={currentSchema.base_url.required ? [{ required: true, message: `请输入${currentSchema.base_url.title}` }] : []}
                  extra={currentSchema.base_url.description}
                >
                  <Input placeholder={currentSchema.base_url.default || '例如: https://api.example.com/v1'} />
                </Form.Item>
              )}
            </>
          )}

          <Divider>其他设置</Divider>

          <Form.Item
            name="is_default"
            label="设为默认配置"
            valuePropName="checked"
            extra="默认配置将被优先使用"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="启用配置"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存配置
              </Button>
              {selectedProviderType && (
                <Button 
                  icon={<ExperimentOutlined />} 
                  onClick={testConnection}
                  loading={testLoading}
                >
                  测试连接
                </Button>
              )}
              <Button onClick={closeModal}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="导入初始配置"
        open={importModalVisible}
        onCancel={closeImportModal}
        footer={[
          <Button key="cancel" onClick={closeImportModal}>
            取消
          </Button>,
          <Button key="import" type="primary" onClick={importInitialConfig}>
            导入
          </Button>
        ]}
      >
        <Radio.Group
          onChange={(e) => setSelectedImportConfig(e.target.value)}
          value={selectedImportConfig}
          style={{ width: '100%' }}
        >
          <List
            dataSource={initialConfigs}
            renderItem={config => (
              <List.Item>
                <Radio value={config} style={{ width: '100%' }}>
                  <Card size="small" style={{ marginLeft: 8, display: 'inline-block', width: 'calc(100% - 32px)' }}>
                    <div>
                      <Text strong>{config.display_name}</Text>
                      <Tag style={{ marginLeft: 8 }}>{config.provider_type}</Tag>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">模型: </Text>
                      <Text>{config.config?.model || '未设置'}</Text>
                    </div>
                    {config.config?.base_url && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">API 地址: </Text>
                        <Text>{config.config.base_url}</Text>
                      </div>
                    )}
                  </Card>
                </Radio>
              </List.Item>
            )}
          />
        </Radio.Group>
      </Modal>
    </div>
  );
}

export default AIConfigManager;
