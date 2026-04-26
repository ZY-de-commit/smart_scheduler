"""
任务调度器模块
"""

import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)


class TaskScheduler:
    def __init__(self, timezone: str = "Asia/Shanghai"):
        self.timezone = ZoneInfo(timezone)
        self.scheduler = BackgroundScheduler(timezone=self.timezone)
        self._tasks: Dict[str, Dict[str, Any]] = {}
        self._callback: Optional[Callable] = None
        
    def set_callback(self, callback: Callable[[str, Dict[str, Any]], None]):
        """
        设置任务执行回调函数
        """
        self._callback = callback
    
    def add_task(self, task_id: str, task_config: Dict[str, Any]) -> bool:
        """
        添加任务
        """
        if task_id in self._tasks:
            logger.warning(f"Task already exists: {task_id}")
            return False
        
        trigger = self._parse_trigger(task_config)
        if trigger is None:
            logger.error(f"Failed to parse trigger for task: {task_id}")
            return False
        
        def task_wrapper():
            if self._callback:
                try:
                    self._callback(task_id, task_config)
                except Exception as e:
                    logger.error(f"Task execution error: {e}")
        
        job = self.scheduler.add_job(
            task_wrapper,
            trigger=trigger,
            id=task_id,
            name=task_config.get('name', task_id),
            replace_existing=True
        )
        
        self._tasks[task_id] = {
            'config': task_config,
            'job': job
        }
        
        logger.info(f"Added task: {task_id} - {task_config.get('name', 'Untitled')}")
        return True
    
    def update_task(self, task_id: str, task_config: Dict[str, Any]) -> bool:
        """
        更新任务
        """
        if task_id not in self._tasks:
            logger.warning(f"Task not found: {task_id}")
            return False
        
        # 先移除旧任务
        self.remove_task(task_id)
        # 再添加新任务
        return self.add_task(task_id, task_config)
    
    def remove_task(self, task_id: str) -> bool:
        """
        移除任务
        """
        if task_id not in self._tasks:
            logger.warning(f"Task not found: {task_id}")
            return False
        
        try:
            self.scheduler.remove_job(task_id)
            del self._tasks[task_id]
            logger.info(f"Removed task: {task_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove task: {e}")
            return False
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        获取任务
        """
        return self._tasks.get(task_id)
    
    def get_all_tasks(self) -> Dict[str, Dict[str, Any]]:
        """
        获取所有任务
        """
        return self._tasks
    
    def start(self):
        """
        启动调度器
        """
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scheduler started")
    
    def stop(self):
        """
        停止调度器
        """
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scheduler stopped")
    
    def is_running(self) -> bool:
        """
        检查调度器是否运行
        """
        return self.scheduler.running
    
    def execute_task(self, task_id: str) -> bool:
        """
        立即执行任务
        """
        task = self._tasks.get(task_id)
        if not task:
            logger.warning(f"Task not found: {task_id}")
            return False
        
        if self._callback:
            try:
                self._callback(task_id, task['config'])
                logger.info(f"Executed task immediately: {task_id}")
                return True
            except Exception as e:
                logger.error(f"Failed to execute task: {e}")
                return False
        
        return False
    
    def _parse_trigger(self, task_config: Dict[str, Any]):
        """
        解析触发器配置
        """
        cron_expr = task_config.get('cron_expression')
        if cron_expr:
            return self._parse_cron_trigger(cron_expr)
        
        interval = task_config.get('interval')
        if interval:
            return self._parse_interval_trigger(interval)
        
        return None
    
    def _parse_cron_trigger(self, cron_expr: str):
        """
        解析 cron 表达式
        """
        try:
            # 支持标准 cron 表达式：分 时 日 月 周
            parts = cron_expr.split()
            if len(parts) == 5:
                return CronTrigger(
                    minute=parts[0],
                    hour=parts[1],
                    day=parts[2],
                    month=parts[3],
                    day_of_week=parts[4],
                    timezone=self.timezone
                )
            else:
                logger.error(f"Invalid cron expression: {cron_expr}")
                return None
        except Exception as e:
            logger.error(f"Failed to parse cron expression: {e}")
            return None
    
    def _parse_interval_trigger(self, interval: Dict[str, Any]):
        """
        解析间隔触发器
        """
        try:
            seconds = interval.get('seconds', 0)
            minutes = interval.get('minutes', 0)
            hours = interval.get('hours', 0)
            days = interval.get('days', 0)
            
            return IntervalTrigger(
                seconds=seconds,
                minutes=minutes,
                hours=hours,
                days=days,
                timezone=self.timezone
            )
        except Exception as e:
            logger.error(f"Failed to parse interval trigger: {e}")
            return None
