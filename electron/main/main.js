const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { kill } = require('tree-kill');
const isDev = require('electron-is-dev');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const indexPath = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../renderer/dist/index.html')}`;

  mainWindow.loadURL(indexPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startPythonServer() {
  const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
  const pythonPath = path.join(__dirname, '../../python/src/main.py');
  
  pythonProcess = spawn(pythonExecutable, [pythonPath], {
    cwd: path.join(__dirname, '../../python'),
    stdio: 'inherit'
  });

  pythonProcess.on('error', (error) => {
    console.error('Failed to start Python server:', error);
  });

  pythonProcess.on('exit', (code) => {
    console.log(`Python server exited with code ${code}`);
  });
}

function stopPythonServer() {
  if (pythonProcess) {
    kill(pythonProcess.pid);
    pythonProcess = null;
  }
}

app.on('ready', () => {
  startPythonServer();
  createWindow();
});

app.on('window-all-closed', () => {
  stopPythonServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});
