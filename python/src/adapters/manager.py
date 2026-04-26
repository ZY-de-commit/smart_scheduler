"""
适配器管理器
管理所有注册的适配器，提供统一的调用接口
"""

import importlib
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Type

from .base import BaseAdapter, ContentItem

logger = logging.getLogger(__name__)


class AdapterManager:
    def __init__(self):
        self._adapters: Dict[str, BaseAdapter] = {}
        self._adapter_classes: Dict[str, Type[BaseAdapter]] = {}
        self._adapter_configs: Dict[str, Dict[str, Any]] = {}
    
    def register_adapter_class(self, name: str, adapter_class: Type[BaseAdapter]):
        self._adapter_classes[name] = adapter_class
        logger.info(f"Registered adapter class: {name}")
    
    def get_adapter_class(self, name: str) -> Optional[Type[BaseAdapter]]:
        return self._adapter_classes.get(name)
    
    def create_adapter(self, name: str, config: Dict[str, Any] = None) -> Optional[BaseAdapter]:
        adapter_class = self.get_adapter_class(name)
        if not adapter_class:
            logger.error(f"Adapter class not found: {name}")
            return None
        
        try:
            config = config or self._adapter_configs.get(name, {})
            adapter = adapter_class(config)
            
            if adapter.initialize():
                self._adapters[name] = adapter
                logger.info(f"Created and initialized adapter: {name}")
                return adapter
            else:
                logger.warning(f"Failed to initialize adapter: {name}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating adapter {name}: {e}")
            return None
    
    def get_adapter(self, name: str) -> Optional[BaseAdapter]:
        if name in self._adapters:
            return self._adapters[name]
        
        return self.create_adapter(name)
    
    def list_available_adapters(self) -> List[Dict[str, Any]]:
        result = []
        
        for name, adapter_class in self._adapter_classes.items():
            is_registered = name in self._adapters
            is_available = False
            
            if is_registered:
                is_available = self._adapters[name].is_available()
            
            temp_adapter = adapter_class(self._adapter_configs.get(name, {}))
            
            result.append({
                'name': name,
                'display_name': temp_adapter.display_name,
                'description': temp_adapter.description,
                'version': temp_adapter.version,
                'requires_auth': temp_adapter.requires_auth,
                'supported_time_ranges': temp_adapter.supported_time_ranges,
                'content_type': temp_adapter.content_type,
                'config_schema': temp_adapter.get_config_schema(),
                'is_registered': is_registered,
                'is_available': is_available
            })
        
        return result
    
    def fetch_data(self, adapter_name: str, time_range: str) -> List[ContentItem]:
        adapter = self.get_adapter(adapter_name)
        
        if not adapter:
            raise ValueError(f"Adapter not found: {adapter_name}")
        
        if not adapter.is_available():
            raise RuntimeError(f"Adapter {adapter_name} is not available")
        
        return adapter.fetch_data(time_range)
    
    def set_config(self, adapter_name: str, config: Dict[str, Any]):
        self._adapter_configs[adapter_name] = config
        
        if adapter_name in self._adapters:
            del self._adapters[adapter_name]
        
        logger.info(f"Updated config for adapter: {adapter_name}")
    
    def get_config(self, adapter_name: str) -> Dict[str, Any]:
        return self._adapter_configs.get(adapter_name, {})
    
    def load_adapters(self, adapters_dir: str = None):
        if adapters_dir is None:
            adapters_dir = str(Path(__file__).parent)
        
        adapters_path = Path(adapters_dir)
        
        for item in adapters_path.iterdir():
            if item.is_dir() and not item.name.startswith('__'):
                self._load_adapter_module(item.name)
        
        logger.info(f"Loaded {len(self._adapter_classes)} adapter classes")
    
    def _load_adapter_module(self, module_name: str):
        try:
            module_path = f"{__package__}.{module_name}"
            module = importlib.import_module(module_path)
            
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (isinstance(attr, type) and 
                    issubclass(attr, BaseAdapter) and 
                    attr != BaseAdapter):
                    
                    adapter_name = getattr(attr, 'name', attr_name.lower())
                    self.register_adapter_class(adapter_name, attr)
                    logger.info(f"Found adapter class: {adapter_name}")
                    
        except Exception as e:
            logger.warning(f"Failed to load adapter module {module_name}: {e}")
    
    def initialize_all(self):
        for name in self._adapter_classes:
            if name not in self._adapters:
                self.create_adapter(name)
