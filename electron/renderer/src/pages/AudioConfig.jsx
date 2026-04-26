import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Select,
  Slider,
  Button,
  message,
  List,
  Input,
  Divider,
  Alert,
  Space,
  Tag,
} from 'antd';
import {
  SoundOutlined,
  PlayCircleOutlined,
  AudioOutlined,
  BluetoothOutlined,
  SaveOutlined,
} from '@ant-design/icons';

import { useAppStore } from '../store';
import { apiService } from '../services/api';

const { Option } = Select;

function AudioConfig() {
  const { config, updateConfig } = useAppStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [testText, setTestText] = useState('你好，这是语音播报测试。');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      outputDevice: config.audio?.outputDevice || '',
      speechRate: config.audio?.speechRate || 150,
      volume: config.audio?.volume || 1.0,
      bluetoothDevice: config.audio?.bluetoothDevice || '',
    });
  }, [config.audio]);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const response = await apiService.getAudioDevices();
      setDevices(response.devices || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
      message.error('加载音频设备失败');
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleSave = async (values) => {
    setLoading(true);
    try {
      const newConfig = {
        ...config,
        audio: {
          outputDevice: values.outputDevice,
          speechRate: values.speechRate,
          volume: values.volume,
          bluetoothDevice: values.bluetoothDevice,
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

  const handleTestSpeech = async () => {
    if (!testText.trim()) {
      message.warning('请输入测试文本');
      return;
    }

    setIsPlaying(true);
    try {
      await apiService.speakText(testText);
      message.success('语音播放中...');
    } catch (error) {
      console.error('Speech test failed:', error);
      message.error('语音播放失败');
    } finally {
      setIsPlaying(false);
    }
  };

  const handleStop = async () => {
    try {
      await apiService.stopAudio();
      message.info('已停止播放');
    } catch (error) {
      message.error('停止播放失败');
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>音频配置</h2>

      <Alert
        message="音频功能说明"
        description={
          <div>
            <p>本应用支持以下音频功能：</p>
            <ul>
              <li><strong>文本转语音 (TTS):</strong> 将 AI 摘要和消息转换为语音播放</li>
              <li><strong>蓝牙音箱支持:</strong> 可连接蓝牙设备进行语音播报</li>
              <li><strong>自定义语速音量:</strong> 可根据个人习惯调整语音参数</li>
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
          speechRate: 150,
          volume: 1.0,
        }}
      >
        <Card title="输出设备" style={{ marginBottom: 16 }}>
          <Form.Item
            name="outputDevice"
            label="选择音频输出设备"
          >
            <Select
              placeholder="请选择输出设备"
              loading={loadingDevices}
              style={{ width: '100%' }}
              allowClear
            >
              {devices.map((device) => (
                <Option key={device.id} value={device.id}>
                  <span>
                    {device.is_bluetooth && <BluetoothOutlined style={{ marginRight: 8 }} />}
                    {device.name}
                    {device.is_default && <Tag color="blue" style={{ marginLeft: 8 }}>默认</Tag>}
                  </span>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="bluetoothDevice"
            label="蓝牙音箱 (可选)"
            tooltip="如果需要专门连接蓝牙音箱，请在此选择"
          >
            <Select
              placeholder="选择蓝牙设备"
              loading={loadingDevices}
              style={{ width: '100%' }}
              allowClear
            >
              {devices
                .filter((d) => d.is_bluetooth)
                .map((device) => (
                  <Option key={device.id} value={device.id}>
                    <span>
                      <BluetoothOutlined style={{ marginRight: 8 }} />
                      {device.name}
                    </span>
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Button icon={<AudioOutlined />} onClick={loadDevices} loading={loadingDevices}>
            刷新设备列表
          </Button>
        </Card>

        <Card title="语音参数" style={{ marginBottom: 16 }}>
          <Form.Item
            name="speechRate"
            label="语速 (每分钟字数)"
            extra="值越大语速越快，推荐范围 100-200"
          >
            <Slider
              min={50}
              max={400}
              step={10}
              marks={{
                100: '慢',
                150: '正常',
                200: '快',
                300: '很快',
              }}
            />
          </Form.Item>

          <Form.Item
            name="volume"
            label="音量"
            extra="0.0 为静音，1.0 为最大音量"
          >
            <Slider
              min={0}
              max={1}
              step={0.1}
              marks={{
                0: '静音',
                0.5: '50%',
                1: '最大',
              }}
            />
          </Form.Item>
        </Card>

        <Card title="语音测试">
          <Form.Item label="测试文本">
            <Input.TextArea
              rows={2}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="输入要播放的文本..."
            />
          </Form.Item>

          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleTestSpeech}
              loading={isPlaying}
            >
              播放测试
            </Button>
            <Button icon={<SoundOutlined />} onClick={handleStop} danger>
              停止
            </Button>
          </Space>
        </Card>

        <Divider />

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
    </div>
  );
}

export default AudioConfig;
