const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

const { createTray, updateTrayMenu } = require('./tray');
const { startPythonServer, stopPythonServer, sendToPython } = require('./pythonBridge');
const { registerIpcHandlers } = require('./ipc');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const PYTHON_PORT = process.env.PYTHON_PORT || 5000;
const PYTHON_HOST = '127.0.0.1';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false
        },
        icon: path.join(__dirname, '../../shared/icons/icon.png'),
        show: false,
        frame: true,
        titleBarStyle: 'default',
        backgroundColor: '#1a1a2e'
    });

    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../renderer/dist/index.html')}`;

    mainWindow.loadURL(startUrl);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

function showMainWindow() {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
    }
}

function quitApp() {
    isQuitting = true;
    
    stopPythonServer();
    
    if (mainWindow) {
        mainWindow.close();
    }
    
    if (tray) {
        tray.destroy();
    }
    
    app.quit();
}

app.whenReady().then(async () => {
    try {
        await startPythonServer();
    } catch (error) {
        console.error('Failed to start Python server:', error);
        dialog.showErrorBox(
            '启动失败',
            `无法启动 Python 服务: ${error.message}\n\n请确保已安装 Python 依赖。`
        );
    }

    createWindow();
    
    tray = createTray(showMainWindow, quitApp);
    
    registerIpcHandlers(mainWindow, tray);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else {
            showMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        quitApp();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});

process.on('SIGTERM', () => {
    quitApp();
});

process.on('SIGINT', () => {
    quitApp();
});

module.exports = {
    mainWindow,
    showMainWindow,
    quitApp,
    PYTHON_HOST,
    PYTHON_PORT
};
