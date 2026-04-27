"""
数据库操作类
使用 SQLAlchemy 操作 SQLite 数据库
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import create_engine, Column, String, Text, Boolean, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

logger = logging.getLogger(__name__)

Base = declarative_base()


class Task(Base):
    __tablename__ = 'tasks'
    
    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    adapter = Column(String(100), nullable=False)
    enabled = Column(Boolean, default=True)
    
    cron_expression = Column(String(100))
    time_range = Column(String(20), default='1d')
    
    summary_style = Column(String(50), default='concise')
    enable_speech = Column(Boolean, default=True)
    speech_template = Column(Text)
    
    config = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TaskResult(Base):
    __tablename__ = 'task_results'
    
    id = Column(String(36), primary_key=True)
    task_id = Column(String(36), nullable=False)
    data = Column(JSON)
    summary = Column(Text)
    executed_at = Column(DateTime, default=datetime.utcnow)
    success = Column(Boolean, default=True)
    error_message = Column(Text)


class ChatHistory(Base):
    __tablename__ = 'chat_history'
    
    id = Column(String(36), primary_key=True)
    session_id = Column(String(36), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    context = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class AdapterConfig(Base):
    __tablename__ = 'adapter_configs'
    
    id = Column(String(36), primary_key=True)
    adapter_name = Column(String(100), unique=True, nullable=False)
    config = Column(JSON, default={})
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AIConfig(Base):
    __tablename__ = 'ai_configs'
    
    id = Column(String(36), primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    provider_type = Column(String(50), nullable=False)
    config = Column(JSON, default={})
    is_default = Column(Boolean, default=False)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Database:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        config = config or {}
        db_config = config.get('database', {})
        
        if db_config.get('type') == 'sqlite':
            db_path = db_config.get('path')
            if db_path is None:
                app_data = Path.home() / ".smart-scheduler"
                app_data.mkdir(parents=True, exist_ok=True)
                db_path = str(app_data / "app.db")
            
            self.db_path = db_path
            self.engine = create_engine(f'sqlite:///{db_path}', echo=False)
        else:
            # 支持其他数据库类型
            db_url = db_config.get('url')
            if not db_url:
                raise ValueError("Database URL is required")
            self.engine = create_engine(db_url, echo=False)
        
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self._session: Optional[Session] = None
        
        # 自动初始化
        self.initialize()
    
    def initialize(self):
        Base.metadata.create_all(bind=self.engine)
        logger.info(f"Database initialized at {self.db_path if hasattr(self, 'db_path') else 'custom URL'}")
    
    def get_session(self) -> Session:
        if self._session is None:
            self._session = self.SessionLocal()
        return self._session
    
    def close(self):
        if self._session:
            self._session.close()
            self._session = None
    
    def create_task(self, task_data: Dict[str, Any]) -> str:
        session = self.get_session()
        task_id = str(uuid4())
        
        task = Task(
            id=task_id,
            name=task_data.get('name', 'Untitled Task'),
            description=task_data.get('description', ''),
            adapter=task_data.get('adapter', ''),
            enabled=task_data.get('enabled', True),
            cron_expression=task_data.get('cron_expression', ''),
            time_range=task_data.get('time_range', '1d'),
            summary_style=task_data.get('summary_style', 'concise'),
            enable_speech=task_data.get('enable_speech', True),
            speech_template=task_data.get('speech_template', ''),
            config=task_data.get('config', {})
        )
        
        session.add(task)
        session.commit()
        logger.info(f"Created task: {task_id}")
        return task_id
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        session = self.get_session()
        task = session.query(Task).filter(Task.id == task_id).first()
        
        if task is None:
            return None
        
        return self._task_to_dict(task)
    
    def get_all_tasks(self) -> List[Dict[str, Any]]:
        session = self.get_session()
        tasks = session.query(Task).order_by(Task.created_at.desc()).all()
        return [self._task_to_dict(task) for task in tasks]
    
    def update_task(self, task_id: str, task_data: Dict[str, Any]):
        session = self.get_session()
        task = session.query(Task).filter(Task.id == task_id).first()
        
        if task is None:
            raise ValueError(f"Task not found: {task_id}")
        
        update_fields = [
            'name', 'description', 'adapter', 'enabled',
            'cron_expression', 'time_range', 'summary_style',
            'enable_speech', 'speech_template', 'config'
        ]
        
        for field in update_fields:
            if field in task_data:
                setattr(task, field, task_data[field])
        
        session.commit()
        logger.info(f"Updated task: {task_id}")
    
    def delete_task(self, task_id: str):
        session = self.get_session()
        task = session.query(Task).filter(Task.id == task_id).first()
        
        if task:
            session.delete(task)
            session.commit()
            logger.info(f"Deleted task: {task_id}")
    
    def save_task_result(self, task_id: str, result: Dict[str, Any]):
        session = self.get_session()
        
        result_entry = TaskResult(
            id=str(uuid4()),
            task_id=task_id,
            data=result.get('data'),
            summary=result.get('summary'),
            success=result.get('success', True),
            error_message=result.get('error_message')
        )
        
        session.add(result_entry)
        session.commit()
        logger.info(f"Saved result for task: {task_id}")
    
    def get_task_results(self, task_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        session = self.get_session()
        results = session.query(TaskResult).filter(
            TaskResult.task_id == task_id
        ).order_by(TaskResult.executed_at.desc()).limit(limit).all()
        
        return [self._result_to_dict(r) for r in results]
    
    def save_chat_message(self, session_id: str, role: str, content: str, context: Dict = None):
        session = self.get_session()
        
        chat = ChatHistory(
            id=str(uuid4()),
            session_id=session_id,
            role=role,
            content=content,
            context=context or {}
        )
        
        session.add(chat)
        session.commit()
    
    def get_chat_history(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        session = self.get_session()
        history = session.query(ChatHistory).filter(
            ChatHistory.session_id == session_id
        ).order_by(ChatHistory.created_at).limit(limit).all()
        
        return [
            {
                'role': h.role,
                'content': h.content,
                'context': h.context,
                'created_at': h.created_at.isoformat()
            }
            for h in history
        ]
    
    def save_adapter_config(self, adapter_name: str, config: Dict[str, Any], enabled: bool = True):
        session = self.get_session()
        
        existing = session.query(AdapterConfig).filter(
            AdapterConfig.adapter_name == adapter_name
        ).first()
        
        if existing:
            existing.config = config
            existing.enabled = enabled
        else:
            adapter_config = AdapterConfig(
                id=str(uuid4()),
                adapter_name=adapter_name,
                config=config,
                enabled=enabled
            )
            session.add(adapter_config)
        
        session.commit()
        logger.info(f"Saved config for adapter: {adapter_name}")
    
    def get_adapter_config(self, adapter_name: str) -> Optional[Dict[str, Any]]:
        session = self.get_session()
        adapter_config = session.query(AdapterConfig).filter(
            AdapterConfig.adapter_name == adapter_name
        ).first()
        
        if adapter_config is None:
            return None
        
        return {
            'adapter_name': adapter_config.adapter_name,
            'config': adapter_config.config,
            'enabled': adapter_config.enabled
        }
    
    def save_ai_config(self, config_data: Dict[str, Any]) -> str:
        session = self.get_session()
        
        existing = session.query(AIConfig).filter(
            AIConfig.name == config_data.get('name')
        ).first()
        
        if existing:
            existing.display_name = config_data.get('display_name', existing.display_name)
            existing.provider_type = config_data.get('provider_type', existing.provider_type)
            existing.config = config_data.get('config', existing.config)
            existing.is_default = config_data.get('is_default', existing.is_default)
            existing.enabled = config_data.get('enabled', existing.enabled)
            config_id = existing.id
        else:
            config_id = str(uuid4())
            ai_config = AIConfig(
                id=config_id,
                name=config_data.get('name'),
                display_name=config_data.get('display_name', config_data.get('name')),
                provider_type=config_data.get('provider_type', 'openai'),
                config=config_data.get('config', {}),
                is_default=config_data.get('is_default', False),
                enabled=config_data.get('enabled', True)
            )
            session.add(ai_config)
        
        session.commit()
        logger.info(f"Saved AI config: {config_data.get('name')}")
        return config_id
    
    def get_ai_config(self, config_name: str) -> Optional[Dict[str, Any]]:
        session = self.get_session()
        ai_config = session.query(AIConfig).filter(
            AIConfig.name == config_name
        ).first()
        
        if ai_config is None:
            return None
        
        return self._ai_config_to_dict(ai_config)
    
    def get_all_ai_configs(self) -> List[Dict[str, Any]]:
        session = self.get_session()
        configs = session.query(AIConfig).order_by(AIConfig.created_at.desc()).all()
        return [self._ai_config_to_dict(config) for config in configs]
    
    def get_default_ai_config(self) -> Optional[Dict[str, Any]]:
        session = self.get_session()
        ai_config = session.query(AIConfig).filter(
            AIConfig.is_default == True,
            AIConfig.enabled == True
        ).first()
        
        if ai_config is None:
            return None
        
        return self._ai_config_to_dict(ai_config)
    
    def delete_ai_config(self, config_name: str):
        session = self.get_session()
        ai_config = session.query(AIConfig).filter(
            AIConfig.name == config_name
        ).first()
        
        if ai_config:
            session.delete(ai_config)
            session.commit()
            logger.info(f"Deleted AI config: {config_name}")
    
    def set_default_ai_config(self, config_name: str):
        session = self.get_session()
        
        session.query(AIConfig).update({AIConfig.is_default: False})
        
        ai_config = session.query(AIConfig).filter(
            AIConfig.name == config_name
        ).first()
        
        if ai_config:
            ai_config.is_default = True
            session.commit()
            logger.info(f"Set default AI config: {config_name}")
    
    def _ai_config_to_dict(self, ai_config: AIConfig) -> Dict[str, Any]:
        return {
            'id': ai_config.id,
            'name': ai_config.name,
            'display_name': ai_config.display_name,
            'provider_type': ai_config.provider_type,
            'config': ai_config.config,
            'is_default': ai_config.is_default,
            'enabled': ai_config.enabled,
            'created_at': ai_config.created_at.isoformat() if ai_config.created_at else None,
            'updated_at': ai_config.updated_at.isoformat() if ai_config.updated_at else None
        }
    
    def _task_to_dict(self, task: Task) -> Dict[str, Any]:
        return {
            'id': task.id,
            'name': task.name,
            'description': task.description,
            'adapter': task.adapter,
            'enabled': task.enabled,
            'cron_expression': task.cron_expression,
            'time_range': task.time_range,
            'summary_style': task.summary_style,
            'enable_speech': task.enable_speech,
            'speech_template': task.speech_template,
            'config': task.config,
            'created_at': task.created_at.isoformat() if task.created_at else None,
            'updated_at': task.updated_at.isoformat() if task.updated_at else None
        }
    
    def _result_to_dict(self, result: TaskResult) -> Dict[str, Any]:
        return {
            'id': result.id,
            'task_id': result.task_id,
            'data': result.data,
            'summary': result.summary,
            'executed_at': result.executed_at.isoformat() if result.executed_at else None,
            'success': result.success,
            'error_message': result.error_message
        }
