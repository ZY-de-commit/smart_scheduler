"""
AI 大模型集成模块
支持多种 AI 提供商：OpenAI、Claude、本地模型等
"""

from .manager import AIManager
from .provider import AIProvider, OpenAIProvider, ClaudeProvider

__all__ = ['AIManager', 'AIProvider', 'OpenAIProvider', 'ClaudeProvider']
