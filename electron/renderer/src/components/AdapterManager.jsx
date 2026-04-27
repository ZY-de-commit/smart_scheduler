import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Input, Select, message, List, Typography, Switch, InputNumber, Checkbox, TreeSelect } from 'antd';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

function AdapterManager() {
  const [adapters, setAdapters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAdapter, setSelectedAdapter] = useState(null);
  const [config, setConfig] = useState({});
  const [form] = Form.useForm();

  // 获取所有可用的适配器
  const fetchAdapters = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/adapters');
      setAdapters(response.data.adapters);
    } catch (error) {
      message.error('获取适配器列表失败');
      console.error('Error fetching adapters:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取适配器配置
  const fetchAdapterConfig = async (adapterName) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/adapters/${adapterName}/config`);
      setConfig(response.data.config);
      form.setFieldsValue(response.data.config);
    } catch (error) {
      message.error('获取适配器配置失败');
      console.error('Error fetching adapter config:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存适配器配置
  const saveAdapterConfig = async (values) => {
    setLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/adapters/${selectedAdapter}/config`, {
        config: values,
        enabled: true
      });
      message.success('配置保存成功');
    } catch (error) {
      message.error('保存配置失败');
      console.error('Error saving adapter config:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理适配器选择
  const handleAdapterSelect = (adapterName) => {
    setSelectedAdapter(adapterName);
    if (adapterName) {
      fetchAdapterConfig(adapterName);
    }
  };

  useEffect(() => {
    fetchAdapters();
  }, []);

  // 渲染 Obsidian 适配器的配置表单
  const renderObsidianConfigForm = () => {
    return (
      <Form
        form={form}
        layout="vertical"
        onFinish={saveAdapterConfig}
      >
        <Form.Item
          name="vault_path"
          label="Obsidian 库路径"
          rules={[{ required: true, message: '请输入 Obsidian 库路径' }]}
        >
          <Input placeholder="例如: C:\\Users\\Username\\Documents\\Obsidian Vault" />
        </Form.Item>

        <Form.Item
          name="include_folders"
          label="包含的文件夹"
        >
          <TextArea 
            placeholder="输入要包含的文件夹，每行一个"
            rows={3}
            value={form.getFieldValue('include_folders')?.join('\n') || ''}
            onChange={(e) => form.setFieldsValue({ include_folders: e.target.value.split('\n').filter(item => item.trim()) })}
          />
        </Form.Item>

        <Form.Item
          name="exclude_folders"
          label="排除的文件夹"
        >
          <TextArea 
            placeholder="输入要排除的文件夹，每行一个"
            rows={3}
            value={form.getFieldValue('exclude_folders')?.join('\n') || '.git\n.obsidian'}
            onChange={(e) => form.setFieldsValue({ exclude_folders: e.target.value.split('\n').filter(item => item.trim()) })}
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存配置
          </Button>
        </Form.Item>
      </Form>
    );
  };

  // 渲染通用适配器配置表单
  const renderGeneralConfigForm = () => {
    return (
      <div>
        <Text>此适配器暂无特定配置</Text>
      </div>
    );
  };

  return (
    <div>
      <Title level={4}>适配器管理</Title>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Text strong>选择适配器:</Text>
          <Select
            style={{ width: 300, marginLeft: 16 }}
            placeholder="请选择适配器"
            onChange={handleAdapterSelect}
            value={selectedAdapter}
          >
            {adapters.map(adapter => (
              <Option key={adapter.name} value={adapter.name}>
                {adapter.display_name} ({adapter.description})
              </Option>
            ))}
          </Select>
        </div>

        {selectedAdapter && (
          <div>
            <Title level={5}>{adapters.find(a => a.name === selectedAdapter)?.display_name} 配置</Title>
            {selectedAdapter === 'obsidian' ? renderObsidianConfigForm() : renderGeneralConfigForm()}
          </div>
        )}
      </Card>

      <Title level={4}>可用适配器</Title>
      <List
        grid={{ gutter: 16, column: 3 }}
        dataSource={adapters}
        renderItem={adapter => (
          <List.Item>
            <Card>
              <Card.Meta
                title={adapter.display_name}
                description={adapter.description}
              />
              <div style={{ marginTop: 16 }}>
                <Text>版本: {adapter.version}</Text>
                <br />
                <Text>支持的时间范围: {adapter.supported_time_ranges.join(', ')}</Text>
                <br />
                <Text>内容类型: {adapter.content_type}</Text>
              </div>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}

export default AdapterManager;