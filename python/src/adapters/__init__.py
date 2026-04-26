"""
第三方 App 适配器模块
提供统一的接口来接入不同的应用
"""

from .manager import AdapterManager
from .base import BaseAdapter

__all__ = ['AdapterManager', 'BaseAdapter']
