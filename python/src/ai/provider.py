"""
AI 提供者基类和具体实现
"""

import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class AIProvider(ABC):
    name: str = "base"
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.api_key = config.get('api_key', '')
        self.model = config.get('model', 'gpt-3.5-turbo')
        self.base_url = config.get('base_url', '')
    
    @abstractmethod
    def chat(self, message: str, context: List[Dict[str, str]]) -> str:
        pass
    
    @abstractmethod
    def summarize(self, content: str, style: str) -> str:
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        pass
    
    def _build_summarize_prompt(self, content: str, style: str) -> str:
        style_prompts = {
            'concise': "请用简洁的语言总结以下内容，控制在100字以内：",
            'detailed': "请详细总结以下内容，保留关键信息和细节：",
            'bullet': "请用要点列表的形式总结以下内容，使用• 标记每个要点：",
            'news': "请以新闻播报的风格总结以下内容，适合语音播报：",
            'story': "请以讲故事的方式总结以下内容，让内容更生动有趣："
        }
        
        prompt_template = style_prompts.get(style, style_prompts['concise'])
        
        return f"""{prompt_template}

{content}

总结："""
    
    def _build_chat_system_prompt(self) -> str:
        return """你是一个智能助手，帮助用户了解和讨论他们感兴趣的内容。
你会根据用户提供的上下文信息进行回答，回答要简洁、准确、有帮助。
如果用户询问关于他们订阅内容的问题，请结合上下文信息进行回答。"""


class OpenAIProvider(AIProvider):
    name = "openai"
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = None
        self._init_client()
    
    def _init_client(self):
        try:
            from openai import OpenAI
            
            client_kwargs = {}
            if self.api_key:
                client_kwargs['api_key'] = self.api_key
            if self.base_url:
                client_kwargs['base_url'] = self.base_url
            
            self.client = OpenAI(**client_kwargs)
            logger.info("OpenAI client initialized")
        except ImportError:
            logger.error("OpenAI package not installed")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
    
    def is_available(self) -> bool:
        return self.client is not None and bool(self.api_key)
    
    def chat(self, message: str, context: List[Dict[str, str]]) -> str:
        if not self.is_available():
            raise RuntimeError("OpenAI provider is not available")
        
        messages = [{"role": "system", "content": self._build_chat_system_prompt()}]
        
        for msg in context:
            messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
        
        messages.append({"role": "user", "content": message})
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2000
            )
            
            return response.choices[0].message.content or ""
            
        except Exception as e:
            logger.error(f"OpenAI chat error: {e}")
            raise
    
    def summarize(self, content: str, style: str) -> str:
        if not self.is_available():
            raise RuntimeError("OpenAI provider is not available")
        
        prompt = self._build_summarize_prompt(content, style)
        
        messages = [
            {"role": "system", "content": "你是一个专业的内容总结助手，能够准确提取关键信息并用清晰的语言进行总结。"},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.5,
                max_tokens=1000
            )
            
            return response.choices[0].message.content or ""
            
        except Exception as e:
            logger.error(f"OpenAI summarize error: {e}")
            raise


class ClaudeProvider(AIProvider):
    name = "claude"
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = None
        self._init_client()
    
    def _init_client(self):
        try:
            import anthropic
            
            client_kwargs = {}
            if self.api_key:
                client_kwargs['api_key'] = self.api_key
            
            self.client = anthropic.Anthropic(**client_kwargs)
            logger.info("Claude client initialized")
        except ImportError:
            logger.error("Anthropic package not installed")
        except Exception as e:
            logger.error(f"Failed to initialize Claude client: {e}")
    
    def is_available(self) -> bool:
        return self.client is not None and bool(self.api_key)
    
    def chat(self, message: str, context: List[Dict[str, str]]) -> str:
        if not self.is_available():
            raise RuntimeError("Claude provider is not available")
        
        messages = []
        for msg in context:
            messages.append({
                "role": msg.get('role', 'user'),
                "content": msg.get('content', '')
            })
        
        messages.append({"role": "user", "content": message})
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=self._build_chat_system_prompt(),
                messages=messages
            )
            
            if response.content and len(response.content) > 0:
                return response.content[0].text or ""
            return ""
            
        except Exception as e:
            logger.error(f"Claude chat error: {e}")
            raise
    
    def summarize(self, content: str, style: str) -> str:
        if not self.is_available():
            raise RuntimeError("Claude provider is not available")
        
        prompt = self._build_summarize_prompt(content, style)
        
        system_prompt = "你是一个专业的内容总结助手，能够准确提取关键信息并用清晰的语言进行总结。"
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}]
            )
            
            if response.content and len(response.content) > 0:
                return response.content[0].text or ""
            return ""
            
        except Exception as e:
            logger.error(f"Claude summarize error: {e}")
            raise


class LocalProvider(AIProvider):
    name = "local"
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.ollama_base = config.get('base_url', 'http://localhost:11434')
        self.model = config.get('model', 'llama2')
    
    def is_available(self) -> bool:
        try:
            import requests
            response = requests.get(f"{self.ollama_base}/api/tags", timeout=5)
            return response.status_code == 200
        except Exception:
            return False
    
    def chat(self, message: str, context: List[Dict[str, str]]) -> str:
        import requests
        
        messages = [{"role": "system", "content": self._build_chat_system_prompt()}]
        
        for msg in context:
            messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
        
        messages.append({"role": "user", "content": message})
        
        try:
            response = requests.post(
                f"{self.ollama_base}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False
                },
                timeout=60
            )
            
            response.raise_for_status()
            data = response.json()
            
            return data.get('message', {}).get('content', '')
            
        except Exception as e:
            logger.error(f"Local Ollama chat error: {e}")
            raise
    
    def summarize(self, content: str, style: str) -> str:
        import requests
        
        prompt = self._build_summarize_prompt(content, style)
        
        try:
            response = requests.post(
                f"{self.ollama_base}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "system": "你是一个专业的内容总结助手，能够准确提取关键信息并用清晰的语言进行总结。",
                    "stream": False
                },
                timeout=60
            )
            
            response.raise_for_status()
            data = response.json()
            
            return data.get('response', '')
            
        except Exception as e:
            logger.error(f"Local Ollama summarize error: {e}")
            raise
