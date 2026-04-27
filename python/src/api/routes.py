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
    
    # AI 配置管理
    @app.route('/api/ai/configs', methods=['GET'])
    def ai_configs():
        """获取所有 AI 配置"""
        try:
            configs = db.get_all_ai_configs()
            return jsonify({'configs': configs})
        except Exception as e:
            logger.error(f"Error getting AI configs: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/ai/configs', methods=['POST'])
    def create_ai_config():
        """创建或更新 AI 配置"""
        try:
            data = request.json
            name = data.get('name')
            if not name:
                return jsonify({'error': 'Name is required'}), 400
            
            # 保存到数据库
            db.save_ai_config({
                'name': name,
                'display_name': data.get('display_name', name),
                'provider_type': data.get('provider_type', 'openai'),
                'config': data.get('config', {}),
                'is_default': data.get('is_default', False),
                'enabled': data.get('enabled', True)
            })
            
            # 如果设置为默认，更新数据库
            if data.get('is_default'):
                db.set_default_ai_config(name)
            
            # 动态添加到 AI 管理器
            provider_type = data.get('provider_type', 'openai')
            config = data.get('config', {})
            success = ai_manager.add_provider(name, provider_type, config)
            
            if success:
                return jsonify({'status': 'success', 'message': 'AI config created successfully'})
            else:
                return jsonify({'error': 'Failed to add AI provider'}), 500
        except Exception as e:
            logger.error(f"Error creating AI config: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/ai/configs/<config_name>', methods=['GET'])
    def get_ai_config(config_name):
        """获取单个 AI 配置"""
        try:
            config = db.get_ai_config(config_name)
            if config:
                return jsonify({'config': config})
            else:
                return jsonify({'error': 'Config not found'}), 404
        except Exception as e:
            logger.error(f"Error getting AI config: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/ai/configs/<config_name>', methods=['DELETE'])
    def delete_ai_config(config_name):
        """删除 AI 配置"""
        try:
            # 从 AI 管理器移除
            ai_manager.remove_provider(config_name)
            
            # 从数据库删除
            db.delete_ai_config(config_name)
            
            return jsonify({'status': 'success'})
        except Exception as e:
            logger.error(f"Error deleting AI config: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/ai/configs/<config_name>/default', methods=['POST'])
    def set_default_ai_config(config_name):
        """设置默认 AI 配置"""
        try:
            db.set_default_ai_config(config_name)
            return jsonify({'status': 'success'})
        except Exception as e:
            logger.error(f"Error setting default AI config: {e}")
            return jsonify({'error': str(e)}), 500
    
    # AI 测试 API
    @app.route('/api/ai/test', methods=['POST'])
    def test_ai_provider():
        """测试 AI 提供商连接"""
        try:
            data = request.json
            provider_type = data.get('provider_type', 'openai')
            config = data.get('config', {})
            
            result = ai_manager.test_provider(provider_type, config)
            return jsonify(result)
        except Exception as e:
            logger.error(f"Error testing AI provider: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # 适配器测试 API
    @app.route('/api/adapters/<adapter_name>/test', methods=['POST'])
    def test_adapter(adapter_name):
        """测试适配器"""
        try:
            adapter = adapter_manager.get_adapter(adapter_name)
            if not adapter:
                return jsonify({
                    'success': False,
                    'error': f'Adapter {adapter_name} not found'
                }), 404
            
            # 检查是否可用
            if not adapter.is_available():
                return jsonify({
                    'success': False,
                    'error': f'Adapter {adapter_name} is not available'
                })
            
            # 尝试获取数据
            try:
                time_range = request.json.get('time_range', '1d') if request.json else '1d'
                items = adapter.fetch_data(time_range)
                
                return jsonify({
                    'success': True,
                    'message': f'Adapter {adapter_name} test successful',
                    'items_count': len(items),
                    'items': [
                        {
                            'id': item.id,
                            'title': item.title,
                            'source': item.source,
                            'timestamp': item.timestamp
                        }
                        for item in items[:5]  # 只返回前5个用于预览
                    ] if items else []
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': f'Failed to fetch data: {str(e)}'
                })
        except Exception as e:
            logger.error(f"Error testing adapter: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # 适配器数据获取 API
    @app.route('/api/adapters/<adapter_name>/fetch', methods=['POST'])
    def fetch_adapter_data(adapter_name):
        """从适配器获取数据"""
        try:
            adapter = adapter_manager.get_adapter(adapter_name)
            if not adapter:
                return jsonify({'error': f'Adapter {adapter_name} not found'}), 404
            
            if not adapter.is_available():
                return jsonify({'error': f'Adapter {adapter_name} is not available'}), 400
            
            data = request.json or {}
            time_range = data.get('time_range', '1d')
            
            items = adapter.fetch_data(time_range)
            
            # 转换为可序列化的格式
            serialized_items = []
            for item in items:
                serialized_items.append({
                    'id': item.id,
                    'title': item.title,
                    'content': item.content,
                    'source': item.source,
                    'url': item.url,
                    'timestamp': item.timestamp,
                    'metadata': item.metadata
                })
            
            return jsonify({
                'success': True,
                'items_count': len(serialized_items),
                'items': serialized_items
            })
        except Exception as e:
            logger.error(f"Error fetching adapter data: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # 组合功能：适配器数据 + AI 处理
    @app.route('/api/combined/process', methods=['POST'])
    def process_with_adapter_and_ai():
        """
        组合功能：从适配器获取数据，然后使用 AI 处理
        请求体格式：
        {
            "adapter_name": "obsidian",
            "time_range": "1d",
            "ai_provider": "yunwu",  // 可选，默认使用默认配置
            "prompt": "请总结以下内容",
            "system_prompt": "你是一个专业的助手"  // 可选
        }
        """
        try:
            data = request.json
            adapter_name = data.get('adapter_name')
            time_range = data.get('time_range', '1d')
            ai_provider = data.get('ai_provider')
            prompt = data.get('prompt', '请总结以下内容')
            system_prompt = data.get('system_prompt')
            
            if not adapter_name:
                return jsonify({'error': 'Adapter name is required'}), 400
            
            # 1. 从适配器获取数据
            adapter = adapter_manager.get_adapter(adapter_name)
            if not adapter:
                return jsonify({'error': f'Adapter {adapter_name} not found'}), 404
            
            if not adapter.is_available():
                return jsonify({'error': f'Adapter {adapter_name} is not available'}), 400
            
            items = adapter.fetch_data(time_range)
            if not items:
                return jsonify({
                    'success': False,
                    'message': 'No data found from adapter',
                    'items_count': 0
                })
            
            # 2. 准备上下文数据
            context_items = []
            for item in items:
                context_items.append({
                    'title': item.title,
                    'content': item.content,
                    'source': item.source
                })
            
            # 3. 使用 AI 处理
            response = ai_manager.chat_with_context(
                message=prompt,
                context_items=context_items,
                system_prompt=system_prompt,
                provider=ai_provider
            )
            
            return jsonify({
                'success': True,
                'items_count': len(items),
                'adapter_name': adapter_name,
                'ai_response': response,
                'items_preview': [
                    {'title': item.title, 'source': item.source}
                    for item in items[:5]
                ]
            })
        except Exception as e:
            logger.error(f"Error processing with adapter and AI: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # 获取初始配置（从 .env 或环境变量）
    @app.route('/api/ai/initial-config', methods=['GET'])
    def get_initial_config():
        """获取初始配置（从环境变量读取）"""
        from src.config.config import get_config
        config = get_config()
        ai_config = config.get('ai', {})
        
        initial_configs = []
        
        # 检查 OpenAI 配置
        openai_config = ai_config.get('openai', {})
        if openai_config.get('api_key'):
            initial_configs.append({
                'name': 'openai_initial',
                'display_name': 'OpenAI (初始配置)',
                'provider_type': 'openai',
                'config': {
                    'api_key': openai_config.get('api_key', ''),
                    'model': openai_config.get('model', 'gpt-3.5-turbo'),
                    'base_url': openai_config.get('base_url', '')
                }
            })
        
        # 检查云雾 AI 配置
        yunwu_config = ai_config.get('yunwu', {})
        if yunwu_config.get('api_key'):
            initial_configs.append({
                'name': 'yunwu_initial',
                'display_name': '云雾 AI (初始配置)',
                'provider_type': 'yunwu',
                'config': {
                    'api_key': yunwu_config.get('api_key', ''),
                    'model': yunwu_config.get('model', 'gpt-4'),
                    'base_url': yunwu_config.get('base_url', 'https://api.yunwu.ai/v1')
                }
            })
        
        # 检查 Anthropic 配置
        anthropic_config = ai_config.get('anthropic', {})
        if anthropic_config.get('api_key'):
            initial_configs.append({
                'name': 'anthropic_initial',
                'display_name': 'Anthropic Claude (初始配置)',
                'provider_type': 'anthropic',
                'config': {
                    'api_key': anthropic_config.get('api_key', ''),
                    'model': anthropic_config.get('model', 'claude-3-sonnet-20240229')
                }
            })
        
        # 检查 Ollama 配置
        ollama_config = ai_config.get('ollama', {})
        initial_configs.append({
            'name': 'ollama_initial',
            'display_name': 'Ollama (初始配置)',
            'provider_type': 'ollama',
            'config': {
                'model': ollama_config.get('model', 'llama2'),
                'base_url': ollama_config.get('base_url', 'http://localhost:11434')
            }
        })
        
        return jsonify({
            'initial_configs': initial_configs,
            'current_provider': ai_config.get('provider', 'yunwu')
        })
    
    # 获取所有可用的提供商类型
    @app.route('/api/ai/provider-types', methods=['GET'])
    def get_provider_types():
        """获取支持的 AI 提供商类型"""
        return jsonify({
            'provider_types': [
                {
                    'type': 'openai',
                    'display_name': 'OpenAI 兼容',
                    'description': '支持 OpenAI API 格式的提供商，包括云雾AI等',
                    'config_schema': {
                        'api_key': {
                            'type': 'string',
                            'required': True,
                            'title': 'API 密钥',
                            'description': 'API 访问密钥'
                        },
                        'model': {
                            'type': 'string',
                            'required': True,
                            'title': '模型名称',
                            'description': '要使用的模型名称，如 gpt-4, claude-3 等'
                        },
                        'base_url': {
                            'type': 'string',
                            'required': False,
                            'title': 'API 地址',
                            'description': '自定义 API 地址（可选）'
                        }
                    }
                },
                {
                    'type': 'yunwu',
                    'display_name': '云雾 AI',
                    'description': '云雾 AI 服务（OpenAI 兼容格式）',
                    'config_schema': {
                        'api_key': {
                            'type': 'string',
                            'required': True,
                            'title': 'API 密钥',
                            'description': '云雾 AI 的 API 密钥'
                        },
                        'model': {
                            'type': 'string',
                            'required': True,
                            'title': '模型名称',
                            'description': '要使用的模型名称'
                        },
                        'base_url': {
                            'type': 'string',
                            'required': False,
                            'title': 'API 地址',
                            'description': '自定义 API 地址，默认 https://api.yunwu.ai/v1',
                            'default': 'https://api.yunwu.ai/v1'
                        }
                    }
                },
                {
                    'type': 'anthropic',
                    'display_name': 'Anthropic Claude',
                    'description': 'Anthropic Claude 系列模型',
                    'config_schema': {
                        'api_key': {
                            'type': 'string',
                            'required': True,
                            'title': 'API 密钥',
                            'description': 'Anthropic API 密钥'
                        },
                        'model': {
                            'type': 'string',
                            'required': True,
                            'title': '模型名称',
                            'description': 'Claude 模型名称，如 claude-3-sonnet-20240229'
                        }
                    }
                },
                {
                    'type': 'ollama',
                    'display_name': 'Ollama 本地模型',
                    'description': '本地运行的 Ollama 模型',
                    'config_schema': {
                        'model': {
                            'type': 'string',
                            'required': True,
                            'title': '模型名称',
                            'description': 'Ollama 模型名称，如 llama2, mistral 等'
                        },
                        'base_url': {
                            'type': 'string',
                            'required': False,
                            'title': 'API 地址',
                            'description': 'Ollama 服务地址，默认 http://localhost:11434',
                            'default': 'http://localhost:11434'
                        }
                    }
                }
            ]
        })
