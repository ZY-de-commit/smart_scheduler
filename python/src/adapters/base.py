"""
适配器基类
所有第三方 App 适配器都需要继承这个基类
"""

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ContentItem:
    id: str
    title: str
    description: str
    url: str
    published_at: datetime
    source: str
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'url': self.url,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'source': self.source,
            'metadata': self.metadata
        }


@dataclass
class AudioContentItem(ContentItem):
    audio_url: str = ""
    duration: int = 0
    thumbnail_url: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        result.update({
            'audio_url': self.audio_url,
            'duration': self.duration,
            'thumbnail_url': self.thumbnail_url
        })
        return result


class BaseAdapter(ABC):
    name: str = "base"
    display_name: str = "基础适配器"
    description: str = "适配器基类"
    version: str = "1.0.0"
    
    requires_auth: bool = False
    supported_time_ranges: List[str] = ['1d', '7d', '30d']
    content_type: str = "general"
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self._is_initialized = False
    
    @abstractmethod
    def initialize(self) -> bool:
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        pass
    
    @abstractmethod
    def fetch_data(self, time_range: str) -> List[ContentItem]:
        pass
    
    @abstractmethod
    def validate_config(self) -> bool:
        pass
    
    def get_config_schema(self) -> Dict[str, Any]:
        return {
            'type': 'object',
            'properties': {},
            'required': []
        }
    
    def parse_time_range(self, time_range: str) -> timedelta:
        range_map = {
            '1h': timedelta(hours=1),
            '6h': timedelta(hours=6),
            '12h': timedelta(hours=12),
            '1d': timedelta(days=1),
            '2d': timedelta(days=2),
            '3d': timedelta(days=3),
            '7d': timedelta(days=7),
            '14d': timedelta(days=14),
            '30d': timedelta(days=30),
        }
        return range_map.get(time_range, timedelta(days=1))
    
    def get_time_boundaries(self, time_range: str) -> tuple:
        now = datetime.now()
        delta = self.parse_time_range(time_range)
        start_time = now - delta
        return start_time, now
    
    def filter_by_time_range(self, items: List[ContentItem], time_range: str) -> List[ContentItem]:
        start_time, end_time = self.get_time_boundaries(time_range)
        
        filtered = []
        for item in items:
            if item.published_at and start_time <= item.published_at <= end_time:
                filtered.append(item)
        
        return filtered
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'display_name': self.display_name,
            'description': self.description,
            'version': self.version,
            'requires_auth': self.requires_auth,
            'supported_time_ranges': self.supported_time_ranges,
            'content_type': self.content_type,
            'config_schema': self.get_config_schema(),
            'is_available': self.is_available()
        }
