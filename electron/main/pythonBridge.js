const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const { app } = require('electron');
const isDev = require('electron-is-dev');
const kill = require('tree-kill');

let pythonProcess = null;
const PYTHON_PORT = process.env.PYTHON_PORT || 5000;
const PYTHON_HOST = '127.0.0.1';

function getPythonExecutable() {
    if (process.platform === 'win32') {
        return 'python';
    }
    return 'python3';
}

function getPythonScriptPath() {
    if (isDev) {
        return path.join(__dirname, '../../python/src/main.py');
    }
    
    return path.join(process.resourcesPath, 'python/src/main.py');
}

function getPythonPath() {
    if (isDev) {
        return path.join(__dirname, '../../python/src');
    }
    return path.join(process.resourcesPath, 'python/src');
}

function waitForServer(timeout = 30000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkInterval = 500;
        
        function check() {
            const options = {
                hostname: PYTHON_HOST,
                port: PYTHON_PORT,
                path: '/api/health',
                method: 'GET',
                timeout: 2000
            };
            
            const req = http.request(options, (res) => {
                if (res.statusCode === 200) {
                    resolve(true);
                } else {
                    retry();
                }
            });
            
            req.on('error', () => {
                retry();
            });
            
            req.on('timeout', () => {
                req.destroy();
                retry();
            });
            
            req.end();
        }
        
        function retry() {
            if (Date.now() - startTime > timeout) {
                reject(new Error('Python server startup timeout'));
                return;
            }
            setTimeout(check, checkInterval);
        }
        
        check();
    });
}

async function startPythonServer() {
    if (pythonProcess) {
        console.log('Python server already running');
        return true;
    }
    
    const pythonExec = getPythonExecutable();
    const scriptPath = getPythonScriptPath();
    const pythonPath = getPythonPath();
    
    console.log('Starting Python server...');
    console.log(`Python executable: ${pythonExec}`);
    console.log(`Script path: ${scriptPath}`);
    console.log(`Python path: ${pythonPath}`);
    
    const env = {
        ...process.env,
        PYTHONPATH: pythonPath,
        PYTHON_PORT: PYTHON_PORT
    };
    
    pythonProcess = spawn(pythonExec, ['-u', scriptPath], {
        env: env,
        cwd: path.dirname(scriptPath),
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
    });
    
    pythonProcess.stdout.on('data', (data) => {
        console.log(`[Python] ${data.toString().trim()}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python Error] ${data.toString().trim()}`);
    });
    
    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        pythonProcess = null;
    });
    
    pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        pythonProcess = null;
    });
    
    try {
        await waitForServer();
        console.log('Python server started successfully');
        return true;
    } catch (error) {
        console.error('Python server startup failed:', error);
        if (pythonProcess) {
            stopPythonServer();
        }
        throw error;
    }
}

function stopPythonServer() {
    return new Promise((resolve) => {
        if (!pythonProcess) {
            console.log('No Python server running');
            resolve();
            return;
        }
        
        console.log('Stopping Python server...');
        
        const pid = pythonProcess.pid;
        
        kill(pid, 'SIGTERM', (err) => {
            if (err) {
                console.error('Error killing Python process:', err);
                try {
                    pythonProcess.kill('SIGKILL');
                } catch (e) {
                    console.error('Force kill failed:', e);
                }
            }
            pythonProcess = null;
            console.log('Python server stopped');
            resolve();
        });
    });
}

function isPythonRunning() {
    return pythonProcess !== null && !pythonProcess.killed;
}

function sendToPython(message) {
    if (!pythonProcess || !pythonProcess.stdin) {
        console.error('Python process not available');
        return false;
    }
    
    try {
        pythonProcess.stdin.write(JSON.stringify(message) + '\n');
        return true;
    } catch (error) {
        console.error('Failed to send message to Python:', error);
        return false;
    }
}

module.exports = {
    startPythonServer,
    stopPythonServer,
    isPythonRunning,
    sendToPython,
    PYTHON_HOST,
    PYTHON_PORT
};
