const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getServerInfo: () => ipcRenderer.invoke('get-server-info'),
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
    
    setConnectionStatus: (connected) => ipcRenderer.send('set-connection-status', connected),
    setTaskCount: (count) => ipcRenderer.send('set-task-count', count),
    showNotification: (title, body) => ipcRenderer.send('show-notification', title, body),
    
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    
    openExternal: (url) => ipcRenderer.send('open-external', url),
    openItem: (path) => ipcRenderer.send('open-item', path),
    
    on: (channel, callback) => {
        const validChannels = [
            'task-created',
            'task-updated',
            'task-deleted',
            'task-executed',
            'task-error',
            'connection-status',
            'notification'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
    
    removeListener: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    }
});
