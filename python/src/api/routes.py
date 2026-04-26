"""
API 路由模块
"""

from flask import jsonify, request
from flask_socketio import SocketIO
from typing import Dict, Any


def register_routes(app, socketio: SocketIO, db, scheduler, ai_manager, adapter_manager, audio_player):
    """
    注册 API 路由
    """
    
    # 健康检查
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'healthy',
            'scheduler_running': scheduler.is_running(),
            'ai_available': ai_manager.is_available(),
            'adapters_available': len(adapter_manager.get_available_adapters())
        })
    
    # 任务管理
    @app.route('/api/tasks', methods=['GET', 'POST'])
    def tasks():
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
    def task_detail(task_id):
        if request.method == 'GET':
            task = db.get_task(task_id)
            if task:
                return jsonify({'task': task})
            else:
                return jsonify({'error': 'Task not found'}), 404
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
    
    @app.route('/api/tasks/<task_id>/execute', methods=['POST'])
    def execute_task(task_id):
        success = scheduler.execute_task(task_id)
        return jsonify({'status': 'success' if success else 'failed'})
    
    # 任务结果
    @app.route('/api/tasks/<task_id>/results', methods=['GET'])
    def task_results(task_id):
        results = db.get_task_results(task_id, limit=20)
        return jsonify({'results': results})
    
    # 适配器管理
    @app.route('/api/adapters', methods=['GET'])
    def adapters():
        available_adapters = adapter_manager.get_available_adapters()
        return jsonify({'adapters': available_adapters})
    
    @app.route('/api/adapters/<adapter_name>/config', methods=['GET', 'POST'])
    def adapter_config(adapter_name):
        if request.method == 'GET':
            config = db.get_adapter_config(adapter_name)
            return jsonify({'config': config or {}})
        else:
            data = request.json
            db.save_adapter_config(adapter_name, data.get('config', {}), data.get('enabled', True))
            return jsonify({'status': 'success'})
    
    # AI 管理
    @app.route('/api/ai/providers', methods=['GET'])
    def ai_providers():
        providers = ai_manager.get_available_providers()
        return jsonify({'providers': providers})
    
    @app.route('/api/ai/chat', methods=['POST'])
    def ai_chat():
        data = request.json
        message = data.get('message', '')
        context = data.get('context', [])
        provider = data.get('provider')
        
        response = ai_manager.chat(message, context, provider)
        return jsonify({'response': response})
    
    @app.route('/api/ai/summarize', methods=['POST'])
    def ai_summarize():
        data = request.json
        content = data.get('content', '')
        style = data.get('style', 'concise')
        provider = data.get('provider')
        
        summary = ai_manager.summarize(content, style, provider)
        return jsonify({'summary': summary})
    
    # 音频管理
    @app.route('/api/audio/devices', methods=['GET'])
    def audio_devices():
        devices = audio_player.list_devices()
        device_list = [{
            'id': device.id,
            'name': device.name,
            'is_default': device.is_default,
            'is_bluetooth': device.is_bluetooth,
            'description': device.description
        } for device in devices]
        return jsonify({'devices': device_list})
    
    @app.route('/api/audio/speak', methods=['POST'])
    def audio_speak():
        data = request.json
        text = data.get('text', '')
        
        success = audio_player.speak(text)
        return jsonify({'status': 'success' if success else 'failed'})
    
    @app.route('/api/audio/stop', methods=['POST'])
    def audio_stop():
        audio_player.stop()
        return jsonify({'status': 'success'})
    
    # 聊天历史
    @app.route('/api/chat/history/<session_id>', methods=['GET'])
    def chat_history(session_id):
        history = db.get_chat_history(session_id)
        return jsonify({'history': history})
    
    @app.route('/api/chat/message', methods=['POST'])
    def chat_message():
        data = request.json
        session_id = data.get('session_id')
        role = data.get('role')
        content = data.get('content')
        context = data.get('context')
        
        db.save_chat_message(session_id, role, content, context)
        return jsonify({'status': 'success'})
    
    # 配置管理
    @app.route('/api/config', methods=['GET', 'POST'])
    def config():
        if request.method == 'GET':
            from src.config.config import get_config
            config = get_config()
            return jsonify({'config': config})
        else:
            # 这里可以添加配置更新逻辑
            return jsonify({'status': 'success'})
