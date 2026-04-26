"""
定时任务调度器
使用 APScheduler 管理定时任务的执行
"""

import logging
from datetime import datetime
from typing import Any, Callable, Dict, Optional
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger

logger = logging.getLogger(__name__)


class TaskScheduler:
    def __init__(self, timezone: str = "Asia/Shanghai"):
        self.timezone = ZoneInfo(timezone)
        self.scheduler = BackgroundScheduler(timezone=self.timezone)
        self._tasks: Dict[str, Dict[str, Any]] = {}
        self._callback: Optional[Callable] = None
    
    def set_callback(self, callback: Callable[[str, Dict[str, Any]], None]):
        self._callback = callback
    
    def start(self):
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scheduler started")
    
    def shutdown(self, wait: bool = True):
        if self.scheduler.running:
            self.scheduler.shutdown(wait=wait)
            logger.info("Scheduler shut down")
    
    def add_task(self, task_id: str, task_config: Dict[str, Any]) -> bool:
        if task_id in self._tasks:
            logger.warning(f"Task already exists: {task_id}")
            return False
        
        if not task_config.get('enabled', True):
            logger.info(f"Task is disabled, not scheduling: {task_id}")
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
        
        logger.info(f"Added task: {task_id} with trigger: {trigger}")
        return True
    
    def update_task(self, task_id: str, task_config: Dict[str, Any]) -> bool:
        if task_id not in self._tasks:
            logger.warning(f"Task not found for update: {task_id}")
            return False
        
        self.remove_task(task_id)
        
        if task_config.get('enabled', True):
            return self.add_task(task_id, task_config)
        
        logger.info(f"Task {task_id} is disabled after update")
        return True
    
    def remove_task(self, task_id: str) -> bool:
        if task_id not in self._tasks:
            return False
        
        try:
            self.scheduler.remove_job(task_id)
        except Exception as e:
            logger.warning(f"Error removing job: {e}")
        
        del self._tasks[task_id]
        logger.info(f"Removed task: {task_id}")
        return True
    
    def pause_task(self, task_id: str) -> bool:
        if task_id not in self._tasks:
            return False
        
        try:
            self.scheduler.pause_job(task_id)
            logger.info(f"Paused task: {task_id}")
            return True
        except Exception as e:
            logger.error(f"Error pausing task: {e}")
            return False
    
    def resume_task(self, task_id: str) -> bool:
        if task_id not in self._tasks:
            return False
        
        try:
            self.scheduler.resume_job(task_id)
            logger.info(f"Resumed task: {task_id}")
            return True
        except Exception as e:
            logger.error(f"Error resuming task: {e}")
            return False
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        if task_id not in self._tasks:
            return None
        
        task_info = self._tasks[task_id]
        job = task_info['job']
        
        next_run_time = job.next_run_time
        if next_run_time:
            next_run_time = next_run_time.isoformat()
        
        return {
            'task_id': task_id,
            'config': task_info['config'],
            'next_run_time': next_run_time
        }
    
    def get_all_tasks(self) -> Dict[str, Dict[str, Any]]:
        result = {}
        for task_id in self._tasks:
            status = self.get_task_status(task_id)
            if status:
                result[task_id] = status
        return result
    
    def run_task_now(self, task_id: str) -> bool:
        if task_id not in self._tasks:
            return False
        
        task_info = self._tasks[task_id]
        config = task_info['config']
        
        if self._callback:
            try:
                self._callback(task_id, config)
                logger.info(f"Manually executed task: {task_id}")
                return True
            except Exception as e:
                logger.error(f"Error executing task manually: {e}")
                return False
        
        return False
    
    def get_current_time(self) -> datetime:
        return datetime.now(self.timezone)
    
    def _parse_trigger(self, task_config: Dict[str, Any]):
        schedule_type = task_config.get('schedule_type', 'cron')
        cron_expression = task_config.get('cron_expression')
        interval_config = task_config.get('interval', {})
        
        if schedule_type == 'cron' and cron_expression:
            return self._parse_cron_expression(cron_expression)
        elif schedule_type == 'interval':
            return self._parse_interval(interval_config)
        elif schedule_type == 'once':
            run_time = task_config.get('run_time')
            if run_time:
                if isinstance(run_time, str):
                    run_time = datetime.fromisoformat(run_time)
                return DateTrigger(run_date=run_time, timezone=self.timezone)
        
        logger.warning(f"Unknown schedule type, using default daily at 8:00")
        return CronTrigger(hour=8, minute=0, timezone=self.timezone)
    
    def _parse_cron_expression(self, cron_expr: str):
        parts = cron_expr.strip().split()
        
        if len(parts) == 5:
            minute, hour, day, month, day_of_week = parts
            return CronTrigger(
                minute=minute,
                hour=hour,
                day=day,
                month=month,
                day_of_week=day_of_week,
                timezone=self.timezone
            )
        elif len(parts) == 6:
            second, minute, hour, day, month, day_of_week = parts
            return CronTrigger(
                second=second,
                minute=minute,
                hour=hour,
                day=day,
                month=month,
                day_of_week=day_of_week,
                timezone=self.timezone
            )
        
        logger.error(f"Invalid cron expression: {cron_expr}")
        return None
    
    def _parse_interval(self, interval_config: Dict[str, Any]):
        kwargs = {}
        
        if 'weeks' in interval_config:
            kwargs['weeks'] = interval_config['weeks']
        if 'days' in interval_config:
            kwargs['days'] = interval_config['days']
        if 'hours' in interval_config:
            kwargs['hours'] = interval_config['hours']
        if 'minutes' in interval_config:
            kwargs['minutes'] = interval_config['minutes']
        if 'seconds' in interval_config:
            kwargs['seconds'] = interval_config['seconds']
        
        if not kwargs:
            kwargs = {'hours': 24}
        
        return IntervalTrigger(**kwargs, timezone=self.timezone)
