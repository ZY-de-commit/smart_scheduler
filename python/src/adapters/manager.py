"""
适配器管理模块
"""

import logging
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ContentItem:
    """内容项"""
    id: str
    title: str
    content: str
    source: str
    url: str = ""
    timestamp: float = 0.0
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class BaseAdapter(ABC):
    """适配器基类"""
    
    name: str = "base"
    display_name: str = "基础适配器"
    description: str = "适配器基类"
    version: str = "1.0.0"
    
    requires_auth: bool = False
    supported_time_ranges: List[str] = ['1d', '7d', '30d']
    content_type: str = "general"
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config or {}
        self._is_initialized = False
    
    @abstractmethod
    def initialize(self) -> bool:
        """初始化适配器"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """检查适配器是否可用"""
        pass
    
    @abstractmethod
    def fetch_data(self, time_range: str) -> List[ContentItem]:
        """获取数据"""
        pass
    
    def get_config_schema(self) -> Dict[str, Any]:
        """获取配置 schema"""
        return {}
    
    def get_display_info(self) -> Dict[str, Any]:
        """获取显示信息"""
        return {
            'name': self.name,
            'display_name': self.display_name,
            'description': self.description,
            'version': self.version,
            'requires_auth': self.requires_auth,
            'supported_time_ranges': self.supported_time_ranges,
            'content_type': self.content_type
        }


class MockAdapter(BaseAdapter):
    """模拟适配器"""
    
    name = "mock"
    display_name = "模拟适配器"
    description = "用于测试的模拟适配器"
    
    def initialize(self) -> bool:
        self._is_initialized = True
        return True
    
    def is_available(self) -> bool:
        return self._is_initialized
    
    def fetch_data(self, time_range: str) -> List[ContentItem]:
        """模拟数据"""
        import time
        current_time = time.time()
        
        items = []
        for i in range(5):
            items.append(ContentItem(
                id=f"mock_{i}",
                title=f"测试标题 {i}",
                content=f"这是测试内容 {i}，用于模拟数据获取。",
                source="Mock Adapter",
                url=f"http://example.com/{i}",
                timestamp=current_time - i * 3600,
                metadata={"category": "test"}
            ))
        
        return items


class AdapterManager:
    """适配器管理器"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.adapters: Dict[str, BaseAdapter] = {}
        self._init_adapters()
    
    def _init_adapters(self):
        """初始化适配器"""
        # 注册内置适配器
        self.adapters['mock'] = MockAdapter({})
        
        # 添加 Obsidian 适配器
        from .obsidian import ObsidianAdapter
        self.adapters['obsidian'] = ObsidianAdapter(self.config.get('adapters', {}).get('obsidian', {}))
        
        # 可以在这里添加更多适配器
        # 例如：
        # self.adapters['netease'] = NeteaseMusicAdapter(self.config.get('adapters', {}).get('netease', {}))
        # self.adapters['wechat'] = WeChatAdapter(self.config.get('adapters', {}).get('wechat', {}))
        
        # 初始化所有适配器
        for name, adapter in self.adapters.items():
            try:
                success = adapter.initialize()
                if success:
                    logger.info(f"Initialized adapter: {name}")
                else:
                    logger.warning(f"Failed to initialize adapter: {name}")
            except Exception as e:
                logger.error(f"Error initializing adapter {name}: {e}")
        
        logger.info(f"Initialized {len(self.adapters)} adapters")
    
    def get_adapter(self, name: str) -> Optional[BaseAdapter]:
        """获取适配器"""
        return self.adapters.get(name)
    
    def get_adapters(self) -> Dict[str, BaseAdapter]:
        """获取所有适配器"""
        return self.adapters
    
    def get_available_adapters(self) -> List[Dict[str, Any]]:
        """获取可用的适配器信息"""
        available = []
        for name, adapter in self.adapters.items():
            info = adapter.get_display_info()
            available.append(info)
        return available
    
    def add_adapter(self, name: str, adapter: BaseAdapter):
        """添加适配器"""
        self.adapters[name] = adapter
        try:
            success = adapter.initialize()
            if success:
                logger.info(f"Added and initialized adapter: {name}")
            else:
                logger.warning(f"Added adapter {name} but failed to initialize")
        except Exception as e:
            logger.error(f"Error adding adapter {name}: {e}")
    
    def remove_adapter(self, name: str):
        """移除适配器"""
        if name in self.adapters:
            del self.adapters[name]
            logger.info(f"Removed adapter: {name}")
