const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

let tray = null;
let isConnected = false;
let taskCount = 0;

function getIconPath() {
    const iconPath = path.join(__dirname, '../../shared/icons/icon.png');
    return iconPath;
}

function createTray(showMainWindow, quitApp) {
    const icon = nativeImage.createFromPath(getIconPath());
    if (icon.isEmpty()) {
        console.warn('Tray icon is empty');
    }
    
    tray = new Tray(icon);
    tray.setToolTip('Smart Scheduler - 智能定时任务系统');
    
    updateTrayMenu(showMainWindow, quitApp);
    
    tray.on('double-click', () => {
        showMainWindow();
    });
    
    tray.on('right-click', () => {
        tray.popUpContextMenu();
    });
    
    return tray;
}

function updateTrayMenu(showMainWindow, quitApp) {
    if (!tray) return;
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '智能定时任务系统',
            enabled: false
        },
        { type: 'separator' },
        {
            label: `状态: ${isConnected ? '已连接' : '未连接'}`,
            enabled: false
        },
        {
            label: `任务数: ${taskCount}`,
            enabled: false
        },
        { type: 'separator' },
        {
            label: '显示窗口',
            click: () => showMainWindow()
        },
        {
            label: '检查更新',
            enabled: false
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => quitApp()
        }
    ]);
    
    tray.setContextMenu(contextMenu);
}

function setConnectionStatus(connected) {
    isConnected = connected;
    if (tray) {
        const showMainWindow = () => {
            const { BrowserWindow } = require('electron');
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
                const mainWindow = windows[0];
                if (mainWindow.isMinimized()) {
                    mainWindow.restore();
                }
                mainWindow.show();
                mainWindow.focus();
            }
        };
        
        const quitApp = () => {
            require('electron').app.quit();
        };
        
        updateTrayMenu(showMainWindow, quitApp);
    }
}

function setTaskCount(count) {
    taskCount = count;
    if (tray) {
        const showMainWindow = () => {
            const { BrowserWindow } = require('electron');
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
                const mainWindow = windows[0];
                if (mainWindow.isMinimized()) {
                    mainWindow.restore();
                }
                mainWindow.show();
                mainWindow.focus();
            }
        };
        
        const quitApp = () => {
            require('electron').app.quit();
        };
        
        updateTrayMenu(showMainWindow, quitApp);
    }
}

function showNotification(title, body) {
    if (tray) {
        tray.displayBalloon({
            title: title,
            content: body,
            icon: getIconPath()
        });
    }
}

module.exports = {
    createTray,
    updateTrayMenu,
    setConnectionStatus,
    setTaskCount,
    showNotification
};
