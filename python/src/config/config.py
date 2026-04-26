"""
配置管理类
支持从文件、环境变量和用户设置中读取配置
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional
from dataclasses import dataclass, field, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class AIConfig:
    provider: str = "openai"
    api_key: str = ""
    model: str = "gpt-3.5-turbo"
    base_url: str = ""


@dataclass
class AudioConfig:
    output_device: str = ""
    speech_rate: int = 150
    volume: float = 1.0
    bluetooth_device: str = ""


@dataclass
class SchedulerConfig:
    max_concurrent_tasks: int = 5
    timezone: str = "Asia/Shanghai"


@dataclass
class Config:
    ai: AIConfig = field(default_factory=AIConfig)
    audio: AudioConfig = field(default_factory=AudioConfig)
    scheduler: SchedulerConfig = field(default_factory=SchedulerConfig)
    
    _config_path: Optional[Path] = None
    _default_path: Optional[Path] = None
    
    def __post_init__(self):
        self._setup_paths()
        self._load_from_env()
    
    def _setup_paths(self):
        app_data = Path.home() / ".smart-scheduler"
        app_data.mkdir(parents=True, exist_ok=True)
        
        self._config_path = app_data / "config.json"
        self._default_path = Path(__file__).parent / "default.json"
    
    def _load_from_env(self):
        if os.getenv("AI_PROVIDER"):
            self.ai.provider = os.getenv("AI_PROVIDER")
        if os.getenv("OPENAI_API_KEY"):
            self.ai.api_key = os.getenv("OPENAI_API_KEY")
        if os.getenv("AI_MODEL"):
            self.ai.model = os.getenv("AI_MODEL")
        if os.getenv("AI_BASE_URL"):
            self.ai.base_url = os.getenv("AI_BASE_URL")
    
    def load(self):
        if self._default_path and self._default_path.exists():
            try:
                with open(self._default_path, 'r', encoding='utf-8') as f:
                    defaults = json.load(f)
                    self._update_from_dict(defaults)
                logger.info("Loaded default config")
            except Exception as e:
                logger.warning(f"Failed to load default config: {e}")
        
        if self._config_path and self._config_path.exists():
            try:
                with open(self._config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    self._update_from_dict(user_config)
                logger.info("Loaded user config")
            except Exception as e:
                logger.warning(f"Failed to load user config: {e}")
        
        self._load_from_env()
    
    def _update_from_dict(self, data: Dict[str, Any]):
        if 'ai' in data:
            ai_data = data['ai']
            if 'provider' in ai_data:
                self.ai.provider = ai_data['provider']
            if 'api_key' in ai_data:
                self.ai.api_key = ai_data['api_key']
            if 'model' in ai_data:
                self.ai.model = ai_data['model']
            if 'base_url' in ai_data:
                self.ai.base_url = ai_data['base_url']
        
        if 'audio' in data:
            audio_data = data['audio']
            if 'output_device' in audio_data:
                self.audio.output_device = audio_data['output_device']
            if 'speech_rate' in audio_data:
                self.audio.speech_rate = audio_data['speech_rate']
            if 'volume' in audio_data:
                self.audio.volume = audio_data['volume']
            if 'bluetooth_device' in audio_data:
                self.audio.bluetooth_device = audio_data['bluetooth_device']
        
        if 'scheduler' in data:
            scheduler_data = data['scheduler']
            if 'max_concurrent_tasks' in scheduler_data:
                self.scheduler.max_concurrent_tasks = scheduler_data['max_concurrent_tasks']
            if 'timezone' in scheduler_data:
                self.scheduler.timezone = scheduler_data['timezone']
    
    def save(self):
        if not self._config_path:
            raise RuntimeError("Config path not initialized")
        
        try:
            with open(self._config_path, 'w', encoding='utf-8') as f:
                json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
            logger.info(f"Saved config to {self._config_path}")
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
            raise
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'ai': asdict(self.ai),
            'audio': asdict(self.audio),
            'scheduler': asdict(self.scheduler)
        }
    
    def update(self, data: Dict[str, Any]):
        self._update_from_dict(data)
        self.save()


_config_instance: Optional[Config] = None


def get_config() -> Config:
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()
        _config_instance.load()
    return _config_instance
