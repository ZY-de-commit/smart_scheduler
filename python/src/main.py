"""
Smart Scheduler 后端主入口
"""

import logging
import os
import sys
from pathlib import Path

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('smart_scheduler.log')
    ]
)

logger = logging.getLogger(__name__)

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv

from src.config.config import get_config
from src.storage.database import Database
from src.scheduler.scheduler import TaskScheduler
from src.ai.manager import AIManager
from src.adapters.manager import AdapterManager
from src.audio.player import AudioPlayer
from src.api.routes import register_routes

# 加载环境变量
load_dotenv()

# 创建 Flask 应用
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# 初始化核心组件
config = get_config()
db = Database(config)
scheduler = TaskScheduler()
try:
    ai_manager = AIManager(config)
except Exception as e:
    logger.error(f"Failed to initialize AI manager: {e}")
    from src.ai.manager import AIManager
    ai_manager = AIManager({})
adapter_manager = AdapterManager(config)
audio_player = AudioPlayer(config.get('audio', {}))

# 注册 API 路由
register_routes(app, socketio, db, scheduler, ai_manager, adapter_manager, audio_player)

# 任务执行回调
def task_callback(task_id: str, task_config: dict):
    """任务执行回调"""
    logger.info(f"Executing task: {task_id}")
    
    try:
        # 获取适配器
        adapter_name = task_config.get('adapter')
        if not adapter_name:
            logger.error(f"Task {task_id} missing adapter")
            return
        
        adapter = adapter_manager.get_adapter(adapter_name)
        if not adapter:
            logger.error(f"Adapter {adapter_name} not found")
            return
        
        # 获取时间范围
        time_range = task_config.get('time_range', '1d')
        
        # 获取数据
        logger.info(f"Fetching data from {adapter_name} for time range: {time_range}")
        content_items = adapter.fetch_data(time_range)
        
        if not content_items:
            logger.info(f"No data found from {adapter_name}")
            return
        
        # 生成摘要
        logger.info(f"Generating summary for {len(content_items)} items")
        content_text = '\n'.join([item.title for item in content_items])
        summary = ai_manager.summarize(content_text, style='concise')
        
        # 语音播报
        if task_config.get('play_audio', True):
            logger.info("Playing audio summary")
            audio_player.speak(summary)
        
        # 发送通知
        socketio.emit('task_completed', {
            'task_id': task_id,
            'summary': summary,
            'items_count': len(content_items)
        })
        
        logger.info(f"Task {task_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Task {task_id} execution error: {e}")
        socketio.emit('task_error', {
            'task_id': task_id,
            'error': str(e)
        })

# 启动调度器
scheduler.set_callback(task_callback)
scheduler.start()

# 健康检查
@app.route('/health')
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'scheduler_running': scheduler.is_running()
    })

if __name__ == '__main__':
    # 获取端口
    port = os.environ.get('PYTHON_PORT', 5000)
    
    logger.info(f"Starting Smart Scheduler backend on port {port}")
    logger.info(f"Scheduler initialized: {scheduler.is_running()}")
    logger.info(f"AI manager initialized: {ai_manager.is_available()}")
    logger.info(f"Adapter manager initialized: {len(adapter_manager.get_adapters())} adapters available")
    
    # 启动应用
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
