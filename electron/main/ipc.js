const { ipcMain, dialog } = require('electron');
const { isPythonRunning, PYTHON_HOST, PYTHON_PORT } = require('./pythonBridge');
const { setConnectionStatus, setTaskCount, showNotification } = require('./tray');

function registerIpcHandlers(mainWindow, tray) {
    
    ipcMain.handle('get-server-info', () => {
        return {
            host: PYTHON_HOST,
            port: PYTHON_PORT,
            isRunning: isPythonRunning()
        };
    });
    
    ipcMain.handle('get-app-path', () => {
        return {
            userData: require('electron').app.getPath('userData'),
            appPath: require('electron').app.getAppPath()
        };
    });
    
    ipcMain.handle('select-directory', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        return result.filePaths;
    });
    
    ipcMain.handle('select-file', async (event, filters) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: filters || []
        });
        return result.filePaths;
    });
    
    ipcMain.handle('show-message-box', async (event, options) => {
        const result = await dialog.showMessageBox(mainWindow, options || {
            type: 'info',
            buttons: ['确定'],
            message: '消息'
        });
        return result;
    });
    
    ipcMain.on('set-connection-status', (event, connected) => {
        setConnectionStatus(connected);
    });
    
    ipcMain.on('set-task-count', (event, count) => {
        setTaskCount(count);
    });
    
    ipcMain.on('show-notification', (event, title, body) => {
        showNotification(title, body);
    });
    
    ipcMain.on('minimize-window', () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });
    
    ipcMain.on('maximize-window', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });
    
    ipcMain.on('close-window', () => {
        if (mainWindow) {
            mainWindow.hide();
        }
    });
    
    ipcMain.on('open-external', (event, url) => {
        require('electron').shell.openExternal(url);
    });
    
    ipcMain.on('open-item', (event, path) => {
        require('electron').shell.openPath(path);
    });
    
    console.log('IPC handlers registered');
}

function sendToRenderer(channel, ...args) {
    if (require('./main').mainWindow) {
        require('./main').mainWindow.webContents.send(channel, ...args);
    }
}

module.exports = {
    registerIpcHandlers,
    sendToRenderer
};
