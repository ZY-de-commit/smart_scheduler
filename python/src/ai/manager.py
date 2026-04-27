"""
AI 管理模块
"""

import logging
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class AIProvider(ABC):
    """AI 提供商基类"""
    
    name: str = "base"
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self._is_available = False
    
    @abstractmethod
    def is_available(self) -> bool:
        """检查提供商是否可用"""
        pass
    
    @abstractmethod
    def chat(self, message: str, context: List[Dict[str, str]]) -> str:
        """聊天"""
        pass
    
    @abstractmethod
    def summarize(self, content: str, style: str = "concise") -> str:
        """总结"""
        pass
    
    def _build_chat_system_prompt(self) -> str:
        """构建系统提示词"""
        return "你是一个智能助手，帮助用户总结信息并回答问题。"
    
    def _build_summary_system_prompt(self, style: str) -> str:
        """构建总结系统提示词"""
        prompts = {
            "concise": "请简要总结以下内容，控制在200字以内，重点突出核心信息。",
            "detailed": "请详细总结以下内容，包括关键细节和重要信息。",
            "bullet": "请使用 bullet points 总结以下内容，每个要点不超过一行。",
            "executive": "请提供一份 executive summary，简洁明了地概括核心内容。"
        }
        return prompts.get(style, prompts["concise"])


class OpenAIProvider(AIProvider):
    """OpenAI 提供商"""
    
    name = "openai"
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = None
        self.api_key = config.get('api_key', '')
        self.model = config.get('model', 'gpt-3.5-turbo')
        self.base_url = config.get('base_url', '')
        self._init_client()
    
    def _init_client(self):
        """初始化客户端"""
        try:
            from openai import OpenAI
            
            client_kwargs = {}
            if self.api_key:
                client_kwargs['api_key'] = self.api_key
            if self.base_url:
                client_kwargs['base_url'] = self.base_url
            
            self.client = OpenAI(**client_kwargs)
            self._is_available = True
            logger.info("OpenAI client initialized")
        except ImportError:
            logger.error("OpenAI package not installed")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
    
    def is_available(self) -> bool:
        return self._is_available and self.client is not None
    
    def chat(self, message: str, context: List[Dict[str, str]]) -> str:
        if not self.is_available():
            raise RuntimeError("OpenAI provider is not available")
        
        messages = [{"role": "system", "content": self._build_chat_system_prompt()}]
        
        for msg in context:
            messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
        
        messages.append({"role": "user", "content": message})
        
        try:
            # 尝试使用 YunWu AI 的参数格式
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_completion_tokens=2000
                )
            except Exception:
                # 如果失败，回退到 OpenAI 标准参数
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2000
                )
            
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI chat error: {e}")
            return ""  
    
    def summarize(self, content: str, style: str = "concise") -> str:
        if not self.is_available():
            raise RuntimeError("OpenAI provider is not available")
        
        messages = [
            {"role": "system", "content": self._build_summary_system_prompt(style)},
            {"role": "user", "content": content}
        ]
        
        try:
            # 尝试使用 YunWu AI 的参数格式
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.3,
                    max_completion_tokens=1000
                )
            except Exception:
                # 如果失败，回退到 OpenAI 标准参数
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.3,
                    max_tokens=1000
                )
            
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI summarize error: {e}")
            return ""


class AnthropicProvider(AIProvider):
    """Anthropic 提供商"""
    
    name = "anthropic"
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = None
        self.api_key = config.get('api_key', '')
        self.model = config.get('model', 'claude-3-sonnet-20240229')
        self._init_client()
    
    def _init_client(self):
        """初始化客户端"""
        try:
            from anthropic import Anthropic
            
            if self.api_key:
                self.client = Anthropic(api_key=self.api_key)
                self._is_available = True
                logger.info("Anthropic client initialized")
            else:
                logger.warning("Anthropic API key not provided")
        except ImportError:
            logger.error("Anthropic package not installed")
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic client: {e}")
    
    def is_available(self) -> bool:
        return self._is_available and self.client is not None
    
    def chat(self, message: str, context: List[Dict[str, str]]) -> str:
        if not self.is_available():
            raise RuntimeError("Anthropic provider is not available")
        
        messages = []
        for msg in context:
            messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
        messages.append({"role": "user", "content": message})
        
        try:
            response = self.client.messages.create(
                model=self.model,
                messages=messages,
                system=self._build_chat_system_prompt(),
                temperature=0.7,
                max_tokens=2000
            )
            
            return response.content[0].text if response.content else ""
        except Exception as e:
            logger.error(f"Anthropic chat error: {e}")
            return ""
    
    def summarize(self, content: str, style: str = "concise") -> str:
        if not self.is_available():
            raise RuntimeError("Anthropic provider is not available")
        
        messages = [{"role": "user", "content": content}]
        
        try:
            response = self.client.messages.create(
                model=self.model,
                messages=messages,
                system=self._build_summary_system_prompt(style),
                temperature=0.3,
                max_tokens=1000
            )
            
            return response.content[0].text if response.content else ""
        except Exception as e:
            logger.error(f"Anthropic summarize error: {e}")
            return ""


class OllamaProvider(AIProvider):
    """Ollama 本地模型提供商"""
    
    name = "ollama"
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_url = config.get('base_url', 'http://localhost:11434')
        self.model = config.get('model', 'llama2')
        self._is_available = self._check_availability()
    
    def _check_availability(self) -> bool:
        """检查 Ollama 是否可用"""
        try:
            import requests
            response = requests.get(f"{self.base_url}/api/tags")
            return response.status_code == 200
        except Exception:
            return False
    
    def is_available(self) -> bool:
        return self._is_available
    
    def chat(self, message: str, context: List[Dict[str, str]]) -> str:
        if not self.is_available():
            raise RuntimeError("Ollama provider is not available")
        
        try:
            import requests
            
            messages = [{"role": "system", "content": self._build_chat_system_prompt()}]
            for msg in context:
                messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
            messages.append({"role": "user", "content": message})
            
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                return response.json().get('message', {}).get('content', '')
            else:
                logger.error(f"Ollama chat error: {response.status_code}")
                return ""
        except Exception as e:
            logger.error(f"Ollama chat error: {e}")
            return ""
    
    def summarize(self, content: str, style: str = "concise") -> str:
        if not self.is_available():
            raise RuntimeError("Ollama provider is not available")
        
        try:
            import requests
            
            messages = [
                {"role": "system", "content": self._build_summary_system_prompt(style)},
                {"role": "user", "content": content}
            ]
            
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                return response.json().get('message', {}).get('content', '')
            else:
                logger.error(f"Ollama summarize error: {response.status_code}")
                return ""
        except Exception as e:
            logger.error(f"Ollama summarize error: {e}")
            return ""


class AIManager:
    """AI 管理器"""
    
    def __init__(self, config: Dict[str, Any] = None, db=None):
        self.config = config or {}
        self.db = db
        self.providers: Dict[str, AIProvider] = {}
        self._init_providers()
    
    def _init_providers(self):
        """初始化 AI 提供商"""
        ai_config = self.config.get('ai', {})
        
        # 初始化 OpenAI
        openai_config = ai_config.get('openai', {})
        if openai_config.get('api_key'):
            self.providers['openai'] = OpenAIProvider(openai_config)
        
        # 初始化 YunWu AI
        yunwu_config = ai_config.get('yunwu', {})
        if yunwu_config.get('api_key'):
            self.providers['yunwu'] = OpenAIProvider(yunwu_config)
        
        # 初始化 Anthropic
        anthropic_config = ai_config.get('anthropic', {})
        if anthropic_config.get('api_key'):
            self.providers['anthropic'] = AnthropicProvider(anthropic_config)
        
        # 初始化 Ollama
        ollama_config = ai_config.get('ollama', {})
        self.providers['ollama'] = OllamaProvider(ollama_config)
        
        # 从数据库加载配置
        if self.db:
            self._load_configs_from_db()
        
        logger.info(f"Initialized {len(self.providers)} AI providers")
    
    def _load_configs_from_db(self):
        """从数据库加载 AI 配置"""
        try:
            configs = self.db.get_all_ai_configs()
            for config_data in configs:
                if config_data.get('enabled'):
                    name = config_data.get('name')
                    provider_type = config_data.get('provider_type', 'openai')
                    config = config_data.get('config', {})
                    
                    # 创建提供商实例
                    provider = self._create_provider(provider_type, config)
                    if provider:
                        self.providers[name] = provider
                        logger.info(f"Loaded AI config from DB: {name}")
        except Exception as e:
            logger.error(f"Error loading AI configs from DB: {e}")
    
    def _create_provider(self, provider_type: str, config: Dict[str, Any]) -> Optional[AIProvider]:
        """根据类型创建 AI 提供商"""
        try:
            provider_type = provider_type.lower()
            if provider_type in ['openai', 'yunwu']:
                return OpenAIProvider(config)
            elif provider_type == 'anthropic':
                return AnthropicProvider(config)
            elif provider_type == 'ollama':
                return OllamaProvider(config)
            else:
                # 默认使用 OpenAI 兼容格式
                logger.warning(f"Unknown provider type: {provider_type}, using OpenAI compatible")
                return OpenAIProvider(config)
        except Exception as e:
            logger.error(f"Error creating provider: {e}")
            return None
    
    def add_provider(self, name: str, provider_type: str, config: Dict[str, Any]) -> bool:
        """动态添加 AI 提供商"""
        try:
            provider = self._create_provider(provider_type, config)
            if provider and provider.is_available():
                self.providers[name] = provider
                
                # 保存到数据库
                if self.db:
                    self.db.save_ai_config({
                        'name': name,
                        'display_name': config.get('display_name', name),
                        'provider_type': provider_type,
                        'config': config,
                        'enabled': True
                    })
                
                logger.info(f"Added AI provider: {name}")
                return True
            else:
                logger.error(f"Failed to add AI provider: {name} - provider not available")
                return False
        except Exception as e:
            logger.error(f"Error adding AI provider: {e}")
            return False
    
    def remove_provider(self, name: str) -> bool:
        """移除 AI 提供商"""
        try:
            if name in self.providers:
                del self.providers[name]
                
                # 从数据库删除
                if self.db:
                    self.db.delete_ai_config(name)
                
                logger.info(f"Removed AI provider: {name}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error removing AI provider: {e}")
            return False
    
    def test_provider(self, provider_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """测试 AI 提供商连接"""
        try:
            provider = self._create_provider(provider_type, config)
            if not provider:
                return {
                    'success': False,
                    'error': 'Failed to create provider instance'
                }
            
            if not provider.is_available():
                return {
                    'success': False,
                    'error': 'Provider is not available'
                }
            
            # 尝试发送一个简单的测试消息
            try:
                response = provider.chat("Hello, please reply with 'OK' if you receive this message.", [])
                if response:
                    return {
                        'success': True,
                        'message': 'Connection successful',
                        'response': response
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Empty response from provider'
                    }
            except Exception as e:
                return {
                    'success': False,
                    'error': f'Chat test failed: {str(e)}'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_provider(self, provider_name: str) -> Optional[AIProvider]:
        """获取 AI 提供商"""
        return self.providers.get(provider_name)
    
    def get_available_providers(self) -> List[str]:
        """获取可用的 AI 提供商"""
        return [name for name, provider in self.providers.items() if provider.is_available()]
    
    def get_all_providers_info(self) -> List[Dict[str, Any]]:
        """获取所有提供商的详细信息"""
        info_list = []
        for name, provider in self.providers.items():
            info_list.append({
                'name': name,
                'provider_type': provider.name,
                'is_available': provider.is_available()
            })
        return info_list
    
    def chat(self, message: str, context: List[Dict[str, str]] = None, provider: str = None) -> str:
        """聊天"""
        context = context or []
        
        # 选择提供商
        target_provider = self._get_target_provider(provider)
        if not target_provider:
            logger.error("No available AI provider")
            return ""
        
        try:
            return target_provider.chat(message, context)
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return ""
    
    def summarize(self, content: str, style: str = "concise", provider: str = None) -> str:
        """总结"""
        # 选择提供商
        target_provider = self._get_target_provider(provider)
        if not target_provider:
            logger.error("No available AI provider")
            return ""
        
        try:
            return target_provider.summarize(content, style)
        except Exception as e:
            logger.error(f"Summarize error: {e}")
            return ""
    
    def chat_with_context(self, message: str, context_items: List[Dict[str, Any]], 
                          system_prompt: str = None, provider: str = None) -> str:
        """
        带有上下文的聊天
        context_items: 适配器获取的内容项列表
        system_prompt: 自定义系统提示词
        """
        # 构建上下文
        context = []
        
        # 添加系统提示词
        if system_prompt:
            context.append({
                'role': 'system',
                'content': system_prompt
            })
        
        # 添加内容项作为上下文
        for item in context_items:
            item_content = f"标题: {item.get('title', 'N/A')}\n"
            item_content += f"来源: {item.get('source', 'N/A')}\n"
            item_content += f"内容:\n{item.get('content', '')}\n"
            item_content += "---\n"
            
            context.append({
                'role': 'user',
                'content': item_content
            })
        
        # 调用聊天
        return self.chat(message, context, provider)
    
    def is_available(self) -> bool:
        """检查是否有可用的 AI 提供商"""
        return len(self.get_available_providers()) > 0
    
    def _get_target_provider(self, provider: str = None) -> Optional[AIProvider]:
        """获取目标 AI 提供商"""
        if provider and provider in self.providers and self.providers[provider].is_available():
            return self.providers[provider]
        
        # 尝试从数据库获取默认配置
        if self.db:
            try:
                default_config = self.db.get_default_ai_config()
                if default_config:
                    default_name = default_config.get('name')
                    if default_name in self.providers and self.providers[default_name].is_available():
                        return self.providers[default_name]
            except Exception as e:
                logger.error(f"Error getting default AI config: {e}")
        
        # 按优先级选择
        priority = ['yunwu', 'openai', 'anthropic', 'ollama']
        for p in priority:
            if p in self.providers and self.providers[p].is_available():
                return self.providers[p]
        
        # 最后尝试任何可用的提供商
        for name, provider in self.providers.items():
            if provider.is_available():
                return provider
        
        return None
