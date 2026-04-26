# Smart Scheduler - 智能定时任务系统

## 项目概述

Smart Scheduler 是一个 AI 驱动的智能定时任务系统，支持自定义定时任务、多应用适配器集成、AI 大模型摘要生成和语音播报功能。

## 项目架构

### 整体架构

```
smart_scheduler/
├── electron/          # Electron 桌面端
│   ├── main/          # Electron 主进程
│   └── renderer/      # 前端渲染进程 (React + Vite)
├── python/            # Python 后端服务
│   └── src/           # 后端核心代码
├── shared/            # 共享资源
├── venv/              # Python 虚拟环境 (需创建)
├── package.json       # 根配置
├── README.md          # 项目说明
└── INSTALL.md         # 详细安装指南
```

### 前端架构

**技术栈**：
- React 18.2.0 - 前端框架
- Vite 5.0.6 - 构建工具
- Ant Design 5.11.5 - UI 组件库
- Zustand 4.4.7 - 状态管理
- Axios 1.6.2 - HTTP 客户端
- Socket.IO Client 4.7.2 - WebSocket 客户端

**目录结构**：
```
electron/renderer/src/
├── components/        # 组件
│   └── layout/        # 布局组件
├── pages/             # 页面组件
│   ├── Dashboard.jsx  # 仪表盘
│   ├── Tasks.jsx      # 任务管理
│   ├── TaskCreate.jsx # 创建任务
│   ├── TaskDetail.jsx # 任务详情
│   ├── Adapters.jsx   # 适配器管理
│   ├── AIConfig.jsx   # AI 配置
│   ├── AudioConfig.jsx # 音频配置
│   ├── Chat.jsx       # 聊天界面
│   └── Settings.jsx   # 系统设置
├── services/          # 服务
│   ├── api.js         # API 服务
│   └── socket.js      # WebSocket 服务
├── store/             # 状态管理
│   └── index.js       # Zustand store
├── App.jsx            # 应用入口组件
└── main.jsx           # 应用入口文件
```

### 后端架构

**技术栈**：
- Flask 3.0.0 - Web 框架
- Flask-CORS 4.0.0 - 跨域支持
- Flask-SocketIO 5.3.6 - WebSocket 支持
- APScheduler 3.10.4 - 任务调度
- SQLAlchemy 2.0.23 - 数据库 ORM
- OpenAI 1.6.1 - AI 服务
- pyttsx3 2.90 - 文本转语音

**目录结构**：
```
python/src/
├── adapters/          # 适配器模块
│   ├── base.py        # 适配器基类
│   ├── manager.py     # 适配器管理器
│   ├── netease_music/ # 网易云音乐适配器
│   └── rss_news/      # RSS 新闻适配器
├── ai/                # AI 模块
│   ├── manager.py     # AI 管理器
│   └── provider.py    # AI 提供者基类
├── api/               # API 模块
│   └── routes.py      # API 路由定义
├── audio/             # 音频模块
│   └── player.py      # 音频播放器
├── config/            # 配置模块
│   └── config.py      # 配置管理
├── scheduler/         # 调度器模块
│   └── scheduler.py   # 任务调度器
├── storage/           # 存储模块
│   └── database.py    # 数据库管理
└── main.py            # 后端入口文件
```

## 前后端交互逻辑

### 通信方式

1. **HTTP API**：前端通过 Axios 发送 RESTful 请求
2. **WebSocket**：通过 Socket.IO 实现实时通信

### API 接口定义

**主要接口文件**：`python/src/api/routes.py`

#### 健康检查接口
- `GET /api/health` - 检查后端服务状态

#### 任务管理接口
- `GET /api/tasks` - 获取所有任务
- `POST /api/tasks` - 创建新任务
- `GET /api/tasks/<task_id>` - 获取单个任务
- `PUT /api/tasks/<task_id>` - 更新任务
- `DELETE /api/tasks/<task_id>` - 删除任务
- `POST /api/tasks/<task_id>/execute` - 立即执行任务
- `GET /api/tasks/<task_id>/results` - 获取任务执行结果

#### 适配器管理接口
- `GET /api/adapters` - 获取所有可用适配器
- `GET /api/adapters/<adapter_name>/config` - 获取适配器配置
- `POST /api/adapters/<adapter_name>/config` - 更新适配器配置

#### AI 管理接口
- `GET /api/ai/providers` - 获取所有可用 AI 提供商
- `POST /api/ai/chat` - 与 AI 聊天
- `POST /api/ai/summarize` - 使用 AI 生成摘要

#### 音频管理接口
- `GET /api/audio/devices` - 获取音频设备列表
- `POST /api/audio/speak` - 文本转语音
- `POST /api/audio/stop` - 停止音频播放

#### 配置管理接口
- `GET /api/config` - 获取系统配置
- `POST /api/config` - 更新系统配置

### WebSocket 事件

**服务端事件**：
- `task_created` - 任务创建通知
- `task_updated` - 任务更新通知
- `task_deleted` - 任务删除通知
- `task_execution_started` - 任务开始执行通知
- `task_executed` - 任务执行完成通知
- `task_error` - 任务执行错误通知

**客户端事件**：
- `connect` - 连接到服务器
- `disconnect` - 断开连接
- `execute_task` - 请求执行任务

## 后端功能逻辑

### 核心模块

1. **TaskScheduler (任务调度器)** - `python/src/scheduler/scheduler.py`
   - 负责定时任务的创建、更新、删除和执行
   - 支持 cron 表达式和间隔时间两种调度方式
   - 任务执行时调用回调函数

2. **AIManager (AI 管理器)** - `python/src/ai/manager.py`
   - 管理多个 AI 提供商（OpenAI、Claude、本地模型）
   - 提供统一的聊天和摘要接口
   - 支持动态切换 AI 提供商

3. **AdapterManager (适配器管理器)** - `python/src/adapters/manager.py`
   - 管理不同的数据源适配器
   - 提供统一的数据获取接口
   - 支持动态加载和注册适配器

4. **AudioPlayer (音频播放器)** - `python/src/audio/player.py`
   - 提供文本转语音功能
   - 支持音频播放和停止
   - 可管理音频设备

5. **Database (数据库管理)** - `python/src/storage/database.py`
   - 管理 SQLite 数据库
   - 存储任务、配置、聊天历史等数据
   - 提供数据持久化接口

### 任务执行流程

1. **定时任务触发**：TaskScheduler 根据配置的时间触发任务
2. **获取数据源**：通过 AdapterManager 获取对应适配器的数据
3. **AI 摘要生成**：使用 AIManager 对数据进行智能摘要
4. **语音播报**：可选，通过 AudioPlayer 播放摘要
5. **保存结果**：将执行结果保存到 Database
6. **实时通知**：通过 WebSocket 通知前端任务执行状态

## 快速启动指南

### 环境要求

- **Python**: 3.8 或更高版本
- **Node.js**: 16.x 或更高版本
- **操作系统**: Windows 10+, macOS 10.15+, Linux

### 步骤 1：创建并激活 Python 虚拟环境

**重要**：项目使用项目根目录下的 `venv` 虚拟环境，而不是系统 Python。

#### Windows
```powershell
# 进入项目根目录
cd c:\project\smart_scheduler

# 创建虚拟环境（如果尚未创建）
python -m venv venv

# 激活虚拟环境
venv\Scripts\activate

# 验证虚拟环境已激活
# 命令行提示符前应显示 (venv)
```

#### macOS/Linux
```bash
# 进入项目根目录
cd /path/to/smart_scheduler

# 创建虚拟环境（如果尚未创建）
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 验证虚拟环境已激活
# 命令行提示符前应显示 (venv)
```

### 步骤 2：安装 Python 依赖

```bash
# 确保虚拟环境已激活
# 然后安装依赖
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

### 步骤 4：启动后端服务

**方法 1：使用虚拟环境直接运行（推荐用于开发）**
```bash
# 确保虚拟环境已激活
# 从项目根目录运行
python python/src/main.py
```

**方法 2：指定虚拟环境的 Python 解释器**
```bash
# Windows
& c:\project\smart_scheduler\venv\Scripts\python.exe c:\project\smart_scheduler\python\src\main.py

# macOS/Linux
/path/to/smart_scheduler/venv/bin/python /path/to/smart_scheduler/python/src/main.py
```

后端服务将启动在 `http://127.0.0.1:5000`

### 步骤 5：启动前端开发服务器

```bash
# 进入前端目录
cd electron/renderer

# 启动开发服务器
npm run dev
```

前端开发服务器将启动在 `http://localhost:5173` 或附近端口

### 步骤 6：验证服务

1. **检查后端健康状态**：
   ```bash
   # Windows PowerShell
   Invoke-WebRequest -Uri http://127.0.0.1:5000/api/health -Method GET -UseBasicParsing
   
   # 或使用 curl (如果可用)
   curl http://127.0.0.1:5000/api/health
   ```

2. **打开前端页面**：
   在浏览器中访问 `http://localhost:5173`（或前端服务器显示的地址）

3. **前端功能测试**：
   - 点击"检查健康状态"按钮，验证前后端通信
   - 点击"测试 AI 功能"按钮，测试 AI 响应（需要配置有效的 AI API Key）

## 常见问题解决

### 问题 1：`ModuleNotFoundError: No module named 'flask'`

**原因**：没有激活虚拟环境，或者在错误的环境中运行代码

**解决方案**：
1. 确保你在项目根目录
2. 激活虚拟环境：
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`
3. 验证虚拟环境已激活（命令行提示符前显示 `(venv)`）
4. 然后运行：`python python/src/main.py`

### 问题 2：虚拟环境未创建

**解决方案**：
```bash
# 在项目根目录创建虚拟环境
python -m venv venv

# 然后激活并安装依赖
venv\Scripts\activate  # Windows
# 或
source venv/bin/activate  # macOS/Linux

pip install -r python/requirements.txt
```

### 问题 3：端口冲突

**解决方案**：
```bash
# Windows
set PYTHON_PORT=5001
python python/src/main.py

# macOS/Linux
export PYTHON_PORT=5001
python python/src/main.py
```

### 问题 4：AI 服务无法连接

**解决方案**：
1. 确保在 `python/.env` 文件中正确配置了 API Key
2. 检查网络连接
3. 验证 API Key 是否有效

## 详细安装指南

请参阅 [INSTALL.md](INSTALL.md) 获取更详细的安装说明和配置指南。

## 技术栈总结

### 前端
- **框架**：React 18
- **构建工具**：Vite 5
- **UI 组件**：Ant Design 5
- **状态管理**：Zustand
- **HTTP 客户端**：Axios
- **WebSocket**：Socket.IO Client

### 后端
- **Web 框架**：Flask 3
- **WebSocket**：Flask-SocketIO
- **任务调度**：APScheduler
- **数据库**：SQLite + SQLAlchemy
- **AI 服务**：OpenAI API, Claude API
- **文本转语音**：pyttsx3

### 桌面应用
- **框架**：Electron 28
- **进程间通信**：Electron IPC
- **Python 桥接**：自定义 PythonBridge

## 许可证

MIT License
