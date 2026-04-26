# Python 虚拟环境配置指南

## 问题分析

**pygame 构建失败的原因：**
- pygame 需要编译 C 扩展，在 Windows 上需要 Visual Studio 构建工具
- 对于我们的音频功能，pygame 不是必须的
- 已替换为更轻量的音频库

## 步骤 1：创建虚拟环境

### Windows
```powershell
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
venv\Scripts\activate

# 升级 pip
python -m pip install --upgrade pip
```

### macOS/Linux
```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 升级 pip
pip install --upgrade pip
```

## 步骤 2：安装依赖

```bash
# 安装基础依赖
pip install -r requirements.txt

# 可选：安装额外的音频依赖（如果需要）
pip install sounddevice soundfile

# 可选：安装本地模型支持
pip install ollama
```

## 步骤 3：验证安装

```bash
# 验证关键依赖
python -c "import flask; print('Flask:', flask.__version__)"
python -c "import openai; print('OpenAI:', openai.__version__)"
python -c "import pyttsx3; print('pyttsx3:', pyttsx3.__version__)"
python -c "from apscheduler.schedulers.background import BackgroundScheduler; print('APScheduler: OK')"
```

## 步骤 4：启动服务

```bash
# 启动 Python 后端服务
python src/main.py
```

## 常见问题解决

### 1. pyttsx3 无法找到语音引擎
**解决方案：**
- Windows: 系统已内置 SAPI5
- macOS: 系统已内置 NSSpeechSynthesizer
- Linux: 需要安装 espeak 或 speech-dispatcher

### 2. 端口冲突
**解决方案：**
```bash
# 修改端口
set PYTHON_PORT=5001  # Windows
# 或
export PYTHON_PORT=5001  # macOS/Linux

python src/main.py
```

### 3. 权限问题
**解决方案：**
- 以管理员/root 权限运行终端
- 或使用 `--user` 选项安装依赖

### 4. 网络问题
**解决方案：**
- 配置代理
- 使用国内镜像源
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

## 依赖说明

| 依赖 | 版本 | 用途 |
|------|------|------|
| Flask | 3.0.0 | Web 框架 |
| APScheduler | 3.10.4 | 定时任务调度 |
| OpenAI | 1.6.1 | OpenAI API 集成 |
| pyttsx3 | 2.90 | 跨平台 TTS |
| SQLAlchemy | 2.0.23 | 数据库 ORM |
| feedparser | 6.0.10 | RSS 解析 |
