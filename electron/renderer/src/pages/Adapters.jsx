import React, { useEffect, useState } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  message,
  Modal,
  Form,
  Input,
  Switch,
  Descriptions,
  Empty,
  Spin,
  Space,
} from 'antd';
import {
  AppstoreOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';

import { useAppStore } from '../store';
import { apiService } from '../services/api';

function Adapters() {
  const { adapters, setAdapters } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [selectedAdapter, setSelectedAdapter] = useState(null);
  const [configForm] = Form.useForm();

  useEffect(() => {
    loadAdapters();
  }, []);

  const loadAdapters = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAdapters();
      setAdapters(data.adapters || []);
    } catch (error) {
      console.error('Failed to load adapters:', error);
      message.error('加载应用列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (adapter) => {
    if (adapter.is_available) return 'success';
    if (adapter.is_registered) return 'warning';
    return 'default';
  };

  const getStatusText = (adapter) => {
    if (adapter.is_available) return '可用';
    if (adapter.is_registered) return '已注册';
    return '未配置';
  };

  const getStatusIcon = (adapter) => {
    if (adapter.is_available) return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
  };

  const openConfigModal = (adapter) => {
    setSelectedAdapter(adapter);
    configForm.setFieldsValue(adapter.config || {});
    setConfigModalVisible(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedAdapter) return;

    try {
      const values = await configForm.validateFields();
      await apiService.updateAdapterConfig(selectedAdapter.name, values);
      message.success('配置保存成功');
      setConfigModalVisible(false);
      loadAdapters();
    } catch (error) {
      console.error('Failed to save config:', error);
      message.error('保存配置失败');
    }
  };

  const renderConfigFields = () => {
    if (!selectedAdapter) return null;

    const schema = selectedAdapter.config_schema || {};
    const properties = schema.properties || {};

    if (Object.keys(properties).length === 0) {
      return (
        <Descriptions bordered column={1}>
          <Descriptions.Item label="说明">此适配器无需额外配置</Descriptions.Item>
        </Descriptions>
      );
    }

    return Object.entries(properties).map(([key, prop]) => (
      <Form.Item
        key={key}
        name={key}
        label={prop.title || key}
        tooltip={prop.description}
      >
        {prop.type === 'boolean' ? (
          <Switch />
        ) : (
          <Input placeholder={prop.description || `请输入 ${prop.title || key}`} />
        )}
      </Form.Item>
    ));
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0 }}>应用管理</h2>
        <Button icon={<AppstoreOutlined />} onClick={loadAdapters} loading={loading}>
          刷新列表
        </Button>
      </div>

      {loading ? (
        <div className="loading-center">
          <Spin size="large" />
        </div>
      ) : adapters.length === 0 ? (
        <Empty description="暂无可用应用" />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
          dataSource={adapters}
          renderItem={(adapter) => (
            <List.Item>
              <Card
                hoverable
                actions={[
                  <Button
                    type="link"
                    icon={<SettingOutlined />}
                    onClick={() => openConfigModal(adapter)}
                  >
                    配置
                  </Button>,
                  <Button
                    type="link"
                    icon={<PlayCircleOutlined />}
                    disabled={!adapter.is_available}
                  >
                    测试
                  </Button>,
                ]}
              >
                <Card.Meta
                  avatar={
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 24,
                      }}
                    >
                      <AppstoreOutlined />
                    </div>
                  }
                  title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {adapter.display_name}
                      {getStatusIcon(adapter)}
                    </span>
                  }
                  description={
                    <div>
                      <p style={{ margin: '4px 0', color: '#666' }}>{adapter.description}</p>
                      <Space size={[4, 8]} wrap>
                        <Tag color={getStatusColor(adapter)}>
                          {getStatusText(adapter)}
                        </Tag>
                        {adapter.requires_auth && <Tag color="orange">需要认证</Tag>}
                        <Tag color="blue">{adapter.content_type}</Tag>
                        <Tag>v{adapter.version}</Tag>
                      </Space>
                    </div>
                  }
                />
                
                {adapter.supported_time_ranges && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#999' }}>
                      支持的时间范围：
                    </p>
                    <Space size={[4, 4]} wrap>
                      {adapter.supported_time_ranges.map((tr) => (
                        <Tag key={tr}>{tr}</Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </Card>
            </List.Item>
          )}
        />
      )}

      <Modal
        title={`配置: ${selectedAdapter?.display_name}`}
        open={configModalVisible}
        onOk={handleSaveConfig}
        onCancel={() => setConfigModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form
          form={configForm}
          layout="vertical"
          initialValues={selectedAdapter?.config || {}}
        >
          {renderConfigFields()}
        </Form>
      </Modal>
    </div>
  );
}

export default Adapters;
