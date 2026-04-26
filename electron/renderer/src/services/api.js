import axios from 'axios';
import { message } from 'antd';

let api = null;
let baseURL = '';

function initApi(url) {
  baseURL = url;
  api = axios.create({
    baseURL: url,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  api.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      return response.data;
    },
    (error) => {
      console.error('API Error:', error);
      
      if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
          case 400:
            message.error(data?.error || '请求参数错误');
            break;
          case 401:
            message.error('未授权，请检查配置');
            break;
          case 404:
            message.error('请求的资源不存在');
            break;
          case 500:
            message.error(data?.error || '服务器错误');
            break;
          default:
            message.error(data?.error || `请求失败 (${status})`);
        }
      } else if (error.request) {
        message.error('网络错误，请检查服务器是否运行');
      } else {
        message.error(`请求失败: ${error.message}`);
      }
      
      return Promise.reject(error);
    }
  );

  console.log('API initialized with baseURL:', url);
  return api;
}

function getApi() {
  if (!api) {
    console.warn('API not initialized, creating default instance');
    return initApi('http://127.0.0.1:5000');
  }
  return api;
}

const apiService = {
  getHealth: () => getApi().get('/api/health'),
  
  getConfig: () => getApi().get('/api/config'),
  updateConfig: (config) => getApi().post('/api/config', config),
  
  getTasks: () => getApi().get('/api/tasks'),
  createTask: (task) => getApi().post('/api/tasks', task),
  getTask: (id) => getApi().get(`/api/tasks/${id}`),
  updateTask: (id, task) => getApi().put(`/api/tasks/${id}`, task),
  deleteTask: (id) => getApi().delete(`/api/tasks/${id}`),
  
  getAdapters: () => getApi().get('/api/adapters'),
  getAdapterConfig: (name) => getApi().get(`/api/adapters/${name}/config`),
  updateAdapterConfig: (name, config) => getApi().post(`/api/adapters/${name}/config`, config),
  
  getAIProviders: () => getApi().get('/api/ai/providers'),
  chatWithAI: (message, context = [], provider) => 
    getApi().post('/api/ai/chat', { message, context, provider }),
  summarizeWithAI: (content, style = 'concise', provider) =>
    getApi().post('/api/ai/summarize', { content, style, provider }),
  
  speakText: (text) => getApi().post('/api/audio/speak', { text }),
  playAudio: (filePath) => getApi().post('/api/audio/play', { file_path: filePath }),
  stopAudio: () => getApi().post('/api/audio/stop'),
  getAudioDevices: () => getApi().get('/api/audio/devices'),
};

export { initApi, getApi, baseURL, apiService };
