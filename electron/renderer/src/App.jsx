import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, message } from 'antd';

import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import TaskCreate from './pages/TaskCreate';
import Adapters from './pages/Adapters';
import AIConfig from './pages/AIConfig';
import AudioConfig from './pages/AudioConfig';
import Chat from './pages/Chat';
import Settings from './pages/Settings';

import { useAppStore } from './store';
import { initApi } from './services/api';
import { initSocket } from './services/socket';

import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const { serverInfo, setServerInfo, setConnected } = useAppStore();

  useEffect(() => {
    const initApp = async () => {
      try {
        if (window.electronAPI) {
          const info = await window.electronAPI.getServerInfo();
          setServerInfo(info);
          
          if (info.isRunning) {
            initApi(`http://${info.host}:${info.port}`);
            initSocket(`http://${info.host}:${info.port}`);
            setConnected(true);
          }
        } else {
          const defaultHost = '127.0.0.1';
          const defaultPort = 5000;
          
          setServerInfo({
            host: defaultHost,
            port: defaultPort,
            isRunning: true
          });
          
          initApi(`http://${defaultHost}:${defaultPort}`);
          initSocket(`http://${defaultHost}:${defaultPort}`);
          setConnected(true);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        message.error('初始化失败，请检查服务是否正常启动');
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>
          正在启动 Smart Scheduler...
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout className="app-layout">
        <MainLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/create" element={<TaskCreate />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/adapters" element={<Adapters />} />
            <Route path="/ai-config" element={<AIConfig />} />
            <Route path="/audio-config" element={<AudioConfig />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </MainLayout>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
