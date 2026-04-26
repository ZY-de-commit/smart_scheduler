# 安装指南

## 项目概述

Smart Scheduler 是一个智能定时任务系统，支持：
- 自定义定时任务
- 多应用适配器集成
- AI 大模型摘要生成
- 语音播报
- 蓝牙音箱支持

## 系统要求

### 基础要求
- **Python**: 3.8 或更高版本
- **Node.js**: 16.x 或更高版本
- **操作系统**: Windows 10+, macOS 10.15+, Linux

### 推荐配置
- **CPU**: 4 核或更高
- **内存**: 8GB 或更高
- **存储空间**: 2GB 或更高

## 安装步骤

### 步骤 1：克隆项目

```bash
git clone <repository-url>
cd smart_scheduler
```

### 步骤 2：安装 Python 依赖（推荐使用虚拟环境）

#### Windows
```powershell
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
venv\Scripts\activate

# 升级 pip
python -m pip install --upgrade pip

# 安装依赖
pip install -r python/requirements.txt
```

#### macOS/Linux
```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 升级 pip
pip install --upgrade pip

# 安装依赖
pip install -r python/requirements.txt
```

### 步骤 3：安装 Node.js 依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd electron/renderer
npm install
cd ../..
```

### 步骤 4：配置环境变量

1. 复制 `.env.example` 文件为 `.env`
2. 编辑 `.env` 文件，填入您的 API Key

```bash
# Windows
copy python\.env.example python\.env

# macOS/Linux
cp python/.env.example python/.env
```

### 步骤 5：启动开发服务器

#### 方法 1：分别启动（推荐）

1. **启动 Python 后端**
   ```bash
   # Windows
   venv\Scripts\activate
   python python\src\main.py
   
   # macOS/Linux
   source venv/bin/activate
   python python/src/main.py
   ```

2. **启动前端开发服务器**
   ```bash
   cd electron/renderer
   npm run dev
   ```

3. **启动 Electron**
   ```bash
   # 新开终端
   npm start
   ```

#### 方法 2：一键启动

```bash
# 确保 Python 服务已启动
npm run dev
```

## 常见问题解决

### 1. pygame 构建失败

**问题原因**：pygame 需要编译 C 扩展，在 Windows 上需要 Visual Studio 构建工具

**解决方案**：
- 我们已将 pygame 替换为更轻量的 `pyttsx3` 和 `playsound`
- 这些库是纯 Python 实现，无需编译

### 2. 音频设备问题

**问题**：无法找到音频设备

**解决方案**：
- **Windows**: 系统已内置 SAPI5 语音引擎
- **macOS**: 系统已内置 NSSpeechSynthesizer
- **Linux**: 需要安装 `espeak` 或 `speech-dispatcher`

### 3. AI API Key 配置

**问题**：AI 服务无法连接

**解决方案**：
- 确保在 `.env` 文件中正确配置了 API Key
- 检查网络连接
- 验证 API Key 是否有效

### 4. 端口冲突

**问题**：端口 5000 已被占用

**解决方案**：
```bash
# Windows
set PYTHON_PORT=5001
python python\src\main.py

# macOS/Linux
export PYTHON_PORT=5001
python python/src/main.py
```

### 5. 依赖安装缓慢

**解决方案**：使用国内镜像源
```bash
pip install -r python/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

## 验证安装

### 验证 Python 依赖
```bash
# 激活虚拟环境后执行
python -c "import flask; print('Flask:', flask.__version__)"
python -c "import openai; print('OpenAI:', openai.__version__)"
python -c "import pyttsx3; print('pyttsx3:', pyttsx3.__version__)"
python -c "from apscheduler.schedulers.background import BackgroundScheduler; print('APScheduler: OK')"
```

### 验证前端依赖
```bash
cd electron/renderer
npm list react
npm list antd
```

## 启动服务

### 开发模式
```bash
# 1. 启动 Python 后端
python python/src/main.py

# 2. 启动前端
cd electron/renderer
npm run dev

# 3. 启动 Electron
# 新开终端
npm start
```

### 生产模式
```bash
# 构建前端
npm run build:renderer

# 打包应用
npm run dist
```

## 目录结构

```
smart_scheduler/
├── electron/          # Electron 桌面端
├── python/            # Python 后端服务
├── shared/            # 共享资源
├── package.json       # 根配置
└── INSTALL.md         # 安装指南
```

## 技术栈

- **前端**: React + Ant Design + Vite
- **后端**: Flask + SocketIO + APScheduler
- **AI**: OpenAI + Claude + 本地模型支持
- **音频**: pyttsx3 + 系统 TTS
- **数据库**: SQLite

## 联系方式

如有任何问题，请联系项目维护者。
