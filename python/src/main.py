"""
Smart Scheduler 主入口文件
启动 Flask 服务和 WebSocket 通信
"""

import os
import sys
import eventlet
eventlet.monkey_patch()

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config.config import get_config
from scheduler.scheduler import TaskScheduler
from ai.manager import AIManager
from adapters.manager import AdapterManager
from audio.player import AudioPlayer
from storage.database import Database

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

config = get_config()
db = Database()
scheduler = TaskScheduler()
ai_manager = AIManager()
adapter_manager = AdapterManager()
audio_player = AudioPlayer()


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'version': '1.0.0'})


@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'GET':
        return jsonify(config.to_dict())
    else:
        data = request.json
        config.update(data)
        return jsonify({'status': 'success'})


@app.route('/api/tasks', methods=['GET', 'POST'])
def handle_tasks():
    if request.method == 'GET':
        tasks = db.get_all_tasks()
        return jsonify({'tasks': tasks})
    else:
        data = request.json
        task_id = db.create_task(data)
        scheduler.add_task(task_id, data)
        socketio.emit('task_created', {'task_id': task_id, 'task': data})
        return jsonify({'status': 'success', 'task_id': task_id})


@app.route('/api/tasks/<task_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_task(task_id):
    if request.method == 'GET':
        task = db.get_task(task_id)
        return jsonify({'task': task})
    elif request.method == 'PUT':
        data = request.json
        db.update_task(task_id, data)
        scheduler.update_task(task_id, data)
        socketio.emit('task_updated', {'task_id': task_id, 'task': data})
        return jsonify({'status': 'success'})
    else:
        db.delete_task(task_id)
        scheduler.remove_task(task_id)
        socketio.emit('task_deleted', {'task_id': task_id})
        return jsonify({'status': 'success'})


@app.route('/api/adapters', methods=['GET'])
def list_adapters():
    adapters = adapter_manager.list_available_adapters()
    return jsonify({'adapters': adapters})


@app.route('/api/adapters/<adapter_name>/config', methods=['GET', 'POST'])
def handle_adapter_config(adapter_name):
    if request.method == 'GET':
        adapter_config = adapter_manager.get_config(adapter_name)
        return jsonify({'config': adapter_config})
    else:
        data = request.json
        adapter_manager.set_config(adapter_name, data)
        return jsonify({'status': 'success'})


@app.route('/api/ai/providers', methods=['GET'])
def list_ai_providers():
    providers = ai_manager.list_available_providers()
    return jsonify({'providers': providers})


@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    data = request.json
    message = data.get('message')
    context = data.get('context', [])
    provider = data.get('provider', 'openai')
    
    try:
        response = ai_manager.chat(message, context, provider)
        return jsonify({'response': response})
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/ai/summarize', methods=['POST'])
def ai_summarize():
    data = request.json
    content = data.get('content')
    style = data.get('style', 'concise')
    provider = data.get('provider', 'openai')
    
    try:
        summary = ai_manager.summarize(content, style, provider)
        return jsonify({'summary': summary})
    except Exception as e:
        logger.error(f"AI summarize error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/audio/speak', methods=['POST'])
def audio_speak():
    data = request.json
    text = data.get('text')
    try:
        audio_player.speak(text)
        return jsonify({'status': 'success'})
    except Exception as e:
        logger.error(f"Audio speak error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/audio/play', methods=['POST'])
def audio_play():
    data = request.json
    file_path = data.get('file_path')
    try:
        audio_player.play_audio(file_path)
        return jsonify({'status': 'success'})
    except Exception as e:
        logger.error(f"Audio play error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/audio/stop', methods=['POST'])
def audio_stop():
    try:
        audio_player.stop()
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/audio/devices', methods=['GET'])
def list_audio_devices():
    devices = audio_player.list_devices()
    return jsonify({'devices': devices})


@socketio.on('connect')
def handle_connect():
    logger.info('Client connected')
    emit('connected', {'status': 'ok'})


@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected')


@socketio.on('execute_task')
def handle_execute_task(data):
    task_id = data.get('task_id')
    logger.info(f"Executing task: {task_id}")
    emit('task_execution_started', {'task_id': task_id})


def execute_task_callback(task_id, task_config):
    """定时任务执行回调"""
    try:
        logger.info(f"Executing scheduled task: {task_id}")
        
        adapter_name = task_config.get('adapter')
        time_range = task_config.get('time_range', '1d')
        
        data = adapter_manager.fetch_data(adapter_name, time_range)
        
        summary = ai_manager.summarize(
            str(data),
            task_config.get('summary_style', 'concise')
        )
        
        if task_config.get('enable_speech', True):
            audio_player.speak(summary)
        
        result = {
            'task_id': task_id,
            'data': data,
            'summary': summary,
            'executed_at': scheduler.get_current_time().isoformat()
        }
        
        db.save_task_result(task_id, result)
        
        with app.app_context():
            socketio.emit('task_executed', result)
            
    except Exception as e:
        logger.error(f"Task execution error: {e}")
        with app.app_context():
            socketio.emit('task_error', {'task_id': task_id, 'error': str(e)})


def start_scheduler():
    """启动定时任务调度器"""
    scheduler.set_callback(execute_task_callback)
    
    tasks = db.get_all_tasks()
    for task in tasks:
        if task.get('enabled', True):
            scheduler.add_task(task['id'], task)
    
    scheduler.start()
    logger.info("Scheduler started")


if __name__ == '__main__':
    try:
        db.initialize()
        logger.info("Database initialized")
        
        adapter_manager.load_adapters()
        logger.info("Adapters loaded")
        
        ai_manager.initialize()
        logger.info("AI manager initialized")
        
        start_scheduler()
        
        port = int(os.environ.get('PYTHON_PORT', 5000))
        logger.info(f"Starting server on port {port}")
        socketio.run(app, host='127.0.0.1', port=port, debug=False)
        
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        scheduler.shutdown()
        db.close()
