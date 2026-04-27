import React, { useState, useEffect } from 'react';
import {
  Card, Button, Form, Input, Select, message, List, Typography,
  Modal, Switch, Space, Popconfirm, Tag, Divider
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SettingOutlined, TestOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea, Password } = Input;

function AIConfigManager() {
  const [configs, setConfigs] = useState([]);
  const [providerTypes, setProviderTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [form] = Form.useForm();
  const [selectedProviderType, setSelectedProviderType] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  // 获取所有 AI 配置
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/ai/configs');
      setConfigs(response.data.configs || []);
    } catch (error) {
      message.error('获取 AI 配置列表失败');
      console.error('Error fetching AI configs:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取提供商类型
  const fetchProviderTypes = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/ai/provider-types');
      setProviderTypes(response.data.provider_types || []);
    } catch (error) {
      console.error('Error fetching provider types:', error);
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchProviderTypes();
  }, []);

  // 打开新建/编辑模态框
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

  // 关闭模态框
  const closeModal = () => {
    setModalVisible(false);
    setEditingConfig(null);
    form.resetFields();
    setSelectedProviderType(null);
  };

  // 提供商类型变化
  const handleProviderTypeChange = (value) => {
    setSelectedProviderType(value);
  };

  // 测试连接
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

  // 保存配置
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

  // 删除配置
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

  // 设置默认配置
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

  // 获取当前选中的提供商类型的 schema
  const getCurrentProviderSchema = () => {
    if (!selectedProviderType) return null;
    const provider = providerTypes.find(p => p.type === selectedProviderType);
    return provider?.config_schema || null;
  };

  const currentSchema = getCurrentProviderSchema();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4}>AI 配置管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新建配置
        </Button>
      </div>

      <List
        loading={loading}
        grid={{ gutter: 16, column: 1 }}
        dataSource={configs}
        locale={{ emptyText: '暂无 AI 配置，请点击"新建配置"添加' }}
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

      {/* 新建/编辑配置模态框 */}
      <Modal
        title={editingConfig ? '编辑 AI 配置' : '新建 AI 配置'}
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

          {currentSchema && (
            <>
              <Divider>连接配置</Divider>
              
              {currentSchema.api_key && (
                <Form.Item
                  name="api_key"
                  label={currentSchema.api_key.title}
                  rules={currentSchema.api_key.required ? [{ required: true, message: `请输入${currentSchema.api_key.title}` }] : []}
                  extra={currentSchema.api_key.description}
                >
                  <Password placeholder={`请输入${currentSchema.api_key.title}`} />
                </Form.Item>
              )}

              {currentSchema.model && (
                <Form.Item
                  name="model"
                  label={currentSchema.model.title}
                  rules={currentSchema.model.required ? [{ required: true, message: `请输入${currentSchema.model.title}` }] : []}
                  extra={currentSchema.model.description}
                >
                  <Input placeholder={`例如: ${currentSchema.model.type === 'string' ? 'gpt-4' : 'llama2'}`} />
                </Form.Item>
              )}

              {currentSchema.base_url && (
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
                  icon={<TestOutlined />} 
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
    </div>
  );
}

export default AIConfigManager;