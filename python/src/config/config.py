"""
配置管理模块
"""

import os
from typing import Dict, Any


def get_config() -> Dict[str, Any]:
    """
    获取配置
    """
    return {
        'server': {
            'port': int(os.environ.get('PYTHON_PORT', 5000)),
            'host': os.environ.get('PYTHON_HOST', '0.0.0.0'),
            'debug': os.environ.get('FLASK_ENV') == 'development'
        },
        'database': {
            'type': 'sqlite',
            'path': os.environ.get('DATABASE_PATH', 'smart_scheduler.db')
        },
        'ai': {
            'provider': os.environ.get('AI_PROVIDER', 'yunwu'),
            'openai': {
                'api_key': os.environ.get('OPENAI_API_KEY', ''),
                'model': os.environ.get('AI_MODEL', 'gpt-3.5-turbo'),
                'base_url': os.environ.get('AI_BASE_URL', '')
            },
            'yunwu': {
                'api_key': os.environ.get('YUNWU_API_KEY', ''),
                'model': os.environ.get('YUNWU_MODEL', 'gpt-4'),
                'base_url': os.environ.get('YUNWU_BASE_URL', 'https://api.yunwu.ai/v1')
            },
            'anthropic': {
                'api_key': os.environ.get('ANTHROPIC_API_KEY', ''),
                'model': os.environ.get('ANTHROPIC_MODEL', 'claude-3-sonnet-20240229')
            },
            'ollama': {
                'model': os.environ.get('OLLAMA_MODEL', 'llama2'),
                'base_url': os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434')
            }
        },
        'audio': {
            'output_device': os.environ.get('AUDIO_OUTPUT_DEVICE', ''),
            'bluetooth_device': os.environ.get('AUDIO_BLUETOOTH_DEVICE', ''),
            'speech_rate': int(os.environ.get('AUDIO_SPEECH_RATE', 150)),
            'volume': float(os.environ.get('AUDIO_VOLUME', 1.0))
        },
        'scheduler': {
            'max_concurrent_tasks': int(os.environ.get('SCHEDULER_MAX_CONCURRENT_TASKS', 5)),
            'timezone': os.environ.get('SCHEDULER_TIMEZONE', 'Asia/Shanghai')
        }
    }
