"""
AI 管理器
管理多个 AI 提供者，提供统一的接口
"""

import logging
from typing import Any, Dict, List, Optional, Type

from .provider import AIProvider, OpenAIProvider, ClaudeProvider, LocalProvider

logger = logging.getLogger(__name__)


class AIManager:
    def __init__(self):
        self._providers: Dict[str, AIProvider] = {}
        self._provider_classes: Dict[str, Type[AIProvider]] = {
            'openai': OpenAIProvider,
            'claude': ClaudeProvider,
            'local': LocalProvider
        }
        self._default_provider: str = 'openai'
    
    def initialize(self):
        pass
    
    def register_provider_class(self, name: str, provider_class: Type[AIProvider]):
        self._provider_classes[name] = provider_class
        logger.info(f"Registered provider class: {name}")
    
    def register_provider(self, name: str, provider: AIProvider):
        self._providers[name] = provider
        logger.info(f"Registered provider: {name}")
    
    def get_provider(self, name: str) -> Optional[AIProvider]:
        return self._providers.get(name)
    
    def get_or_create_provider(self, name: str, config: Dict[str, Any]) -> Optional[AIProvider]:
        if name in self._providers:
            return self._providers[name]
        
        provider_class = self._provider_classes.get(name)
        if not provider_class:
            logger.error(f"Unknown provider: {name}")
            return None
        
        try:
            provider = provider_class(config)
            self._providers[name] = provider
            logger.info(f"Created provider: {name}")
            return provider
        except Exception as e:
            logger.error(f"Failed to create provider {name}: {e}")
            return None
    
    def list_available_providers(self) -> List[Dict[str, Any]]:
        result = []
        
        for name, provider_class in self._provider_classes.items():
            is_registered = name in self._providers
            is_available = False
            
            if is_registered:
                is_available = self._providers[name].is_available()
            
            result.append({
                'name': name,
                'class_name': provider_class.name,
                'is_registered': is_registered,
                'is_available': is_available
            })
        
        return result
    
    def chat(
        self,
        message: str,
        context: List[Dict[str, str]] = None,
        provider_name: str = None
    ) -> str:
        if context is None:
            context = []
        
        provider_name = provider_name or self._default_provider
        
        provider = self.get_provider(provider_name)
        if not provider:
            raise ValueError(f"Provider not found: {provider_name}")
        
        if not provider.is_available():
            raise RuntimeError(f"Provider {provider_name} is not available")
        
        return provider.chat(message, context)
    
    def summarize(
        self,
        content: str,
        style: str = 'concise',
        provider_name: str = None
    ) -> str:
        provider_name = provider_name or self._default_provider
        
        provider = self.get_provider(provider_name)
        if not provider:
            raise ValueError(f"Provider not found: {provider_name}")
        
        if not provider.is_available():
            raise RuntimeError(f"Provider {provider_name} is not available")
        
        return provider.summarize(content, style)
    
    def set_default_provider(self, name: str):
        if name in self._provider_classes:
            self._default_provider = name
            logger.info(f"Set default provider to: {name}")
        else:
            logger.warning(f"Unknown provider class: {name}")
    
    def get_default_provider(self) -> str:
        return self._default_provider
    
    def init_from_config(self, config: Dict[str, Any]):
        ai_config = config.get('ai', {})
        
        if 'provider' in ai_config:
            self.set_default_provider(ai_config['provider'])
        
        provider_configs = ai_config.get('providers', {})
        
        for provider_name, provider_config in provider_configs.items():
            self.get_or_create_provider(provider_name, provider_config)
        
        if self._default_provider not in self._providers:
            self.get_or_create_provider(self._default_provider, ai_config)
        
        logger.info(f"Initialized AI manager with default provider: {self._default_provider}")
