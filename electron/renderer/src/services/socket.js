import { io } from 'socket.io-client';
import { message, notification } from 'antd';
import { useAppStore } from '../store';

let socket = null;
let isConnected = false;

function initSocket(url) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    isConnected = true;
    useAppStore.getState().setConnected(true);
    
    if (window.electronAPI) {
      window.electronAPI.setConnectionStatus(true);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    isConnected = false;
    useAppStore.getState().setConnected(false);
    
    if (window.electronAPI) {
      window.electronAPI.setConnectionStatus(false);
    }
  });

  socket.on('connected', (data) => {
    console.log('Server acknowledged connection:', data);
  });

  socket.on('task_created', (data) => {
    console.log('Task created:', data);
    const { addTask } = useAppStore.getState();
    addTask(data.task);
    
    notification.info({
      message: '任务已创建',
      description: `任务 "${data.task.name}" 已创建成功`,
    });
  });

  socket.on('task_updated', (data) => {
    console.log('Task updated:', data);
    const { updateTask } = useAppStore.getState();
    updateTask(data.task_id, data.task);
    
    notification.info({
      message: '任务已更新',
      description: `任务已更新`,
    });
  });

  socket.on('task_deleted', (data) => {
    console.log('Task deleted:', data);
    const { removeTask } = useAppStore.getState();
    removeTask(data.task_id);
    
    notification.info({
      message: '任务已删除',
      description: `任务已删除`,
    });
  });

  socket.on('task_execution_started', (data) => {
    console.log('Task execution started:', data);
    const { addNotification } = useAppStore.getState();
    addNotification({
      type: 'info',
      title: '任务开始执行',
      message: `任务 ${data.task_id} 开始执行`,
    });
  });

  socket.on('task_executed', (data) => {
    console.log('Task executed:', data);
    const { addNotification } = useAppStore.getState();
    addNotification({
      type: 'success',
      title: '任务执行完成',
      message: `任务 ${data.task_id} 执行完成`,
    });
    
    notification.success({
      message: '任务执行完成',
      description: '定时任务已成功执行',
    });
  });

  socket.on('task_error', (data) => {
    console.error('Task error:', data);
    const { addNotification } = useAppStore.getState();
    addNotification({
      type: 'error',
      title: '任务执行失败',
      message: `任务 ${data.task_id} 执行失败: ${data.error}`,
    });
    
    notification.error({
      message: '任务执行失败',
      description: data.error,
    });
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('reconnect_attempt', (attempt) => {
    console.log(`Socket reconnect attempt ${attempt}`);
  });

  socket.on('reconnect', (attempt) => {
    console.log(`Socket reconnected after ${attempt} attempts`);
    message.success('已重新连接到服务器');
  });

  console.log('Socket initialized with URL:', url);
  return socket;
}

function getSocket() {
  return socket;
}

function isSocketConnected() {
  return isConnected;
}

function emitEvent(event, data) {
  if (socket && socket.connected) {
    socket.emit(event, data);
    return true;
  }
  console.warn('Socket not connected, cannot emit event:', event);
  return false;
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
    console.log('Socket disconnected');
  }
}

export {
  initSocket,
  getSocket,
  isSocketConnected,
  emitEvent,
  disconnectSocket,
};
