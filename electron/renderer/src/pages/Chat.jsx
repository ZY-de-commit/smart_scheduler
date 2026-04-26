import React, { useState, useEffect, useRef } from 'react';
import {
  Input,
  Button,
  Card,
  Empty,
  Spin,
  Select,
  message,
  Tag,
  Space,
  Divider,
} from 'antd';
import {
  SendOutlined,
  DeleteOutlined,
  RobotOutlined,
  UserOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

import { useAppStore } from '../store';
import { apiService } from '../services/api';

const { TextArea } = Input;
const { Option } = Select;

function Chat() {
  const { chatMessages, addChatMessage, clearChatMessages, aiProviders } = useAppStore();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    addChatMessage(userMessage);
    setInputText('');
    setLoading(true);

    try {
      const context = chatMessages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await apiService.chatWithAI(
        inputText.trim(),
        context,
        selectedProvider
      );

      const assistantMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
      };

      addChatMessage(assistantMessage);
    } catch (error) {
      console.error('Chat error:', error);
      message.error('AI 对话失败，请检查配置');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async (text) => {
    try {
      await apiService.speakText(text);
      message.success('开始播放语音');
    } catch (error) {
      message.error('语音播放失败');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    clearChatMessages();
    message.info('聊天记录已清空');
  };

  const suggestions = [
    '请帮我总结一下今天的新闻',
    '给我推荐一些好听的音乐',
    '解释一下什么是 AI 大模型',
    '帮我制定一个学习计划',
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>AI 对话</h2>
        <Space>
          <Select
            value={selectedProvider}
            onChange={setSelectedProvider}
            style={{ width: 150 }}
          >
            <Option value="openai">OpenAI</Option>
            <Option value="claude">Claude</Option>
            <Option value="local">本地模型</Option>
          </Select>
          <Button icon={<DeleteOutlined />} onClick={handleClear} danger>
            清空记录
          </Button>
        </Space>
      </div>

      <Card style={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            background: '#fafafa',
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {chatMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <RobotOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
              <h3 style={{ color: '#666', marginBottom: 8 }}>开始与 AI 对话</h3>
              <p style={{ color: '#999', marginBottom: 24 }}>
                您可以询问关于任务内容、获取摘要、或者进行一般对话
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {suggestions.map((suggestion, index) => (
                  <Tag
                    key={index}
                    color="blue"
                    style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 13 }}
                    onClick={() => setInputText(suggestion)}
                  >
                    {suggestion}
                  </Tag>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 20,
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background:
                      msg.role === 'assistant'
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#1890ff',
                    color: 'white',
                  }}
                >
                  {msg.role === 'assistant' ? <RobotOutlined /> : <UserOutlined />}
                </div>
                <div style={{ maxWidth: '70%' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      lineHeight: 1.6,
                      background: msg.role === 'assistant' ? '#fff' : '#1890ff',
                      color: msg.role === 'assistant' ? '#333' : '#fff',
                      border: msg.role === 'assistant' ? '1px solid #e8e8e8' : 'none',
                    }}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === 'assistant' && (
                    <div style={{ marginTop: 8 }}>
                      <Button
                        type="link"
                        size="small"
                        icon={<SoundOutlined />}
                        onClick={() => handleSpeak(msg.content)}
                      >
                        语音播放
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                }}
              >
                <RobotOutlined />
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                }}
              >
                <Spin size="small" />
                <span style={{ marginLeft: 8 }}>AI 正在思考...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <TextArea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题..."
            rows={2}
            style={{ flex: 1, resize: 'none' }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={loading}
            disabled={!inputText.trim()}
            style={{ height: 54 }}
          >
            发送
          </Button>
        </div>
        <p style={{ fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' }}>
          按 Enter 发送，Shift + Enter 换行
        </p>
      </Card>
    </div>
  );
}

export default Chat;
