"""
Obsidian 适配器模块
"""

import os
import re
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from .manager import BaseAdapter, ContentItem


class ObsidianAdapter(BaseAdapter):
    """Obsidian 适配器"""
    
    name = "obsidian"
    display_name = "Obsidian 文档"
    description = "抓取本地 Obsidian 文档"
    version = "1.0.0"
    
    requires_auth = False
    supported_time_ranges = ['1d', '7d', '30d']
    content_type = "document"
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.vault_path = config.get('vault_path', '')
        self.include_folders = config.get('include_folders', [])
        self.exclude_folders = config.get('exclude_folders', ['.git', '.obsidian'])
        self._is_initialized = False
    
    def initialize(self) -> bool:
        """初始化适配器"""
        if not self.vault_path:
            return False
        
        if not os.path.exists(self.vault_path):
            return False
        
        self._is_initialized = True
        return True
    
    def is_available(self) -> bool:
        """检查适配器是否可用"""
        return self._is_initialized and os.path.exists(self.vault_path)
    
    def fetch_data(self, time_range: str) -> List[ContentItem]:
        """获取数据"""
        items = []
        
        # 计算时间范围
        now = datetime.now()
        if time_range == '1d':
            start_time = now - timedelta(days=1)
        elif time_range == '7d':
            start_time = now - timedelta(days=7)
        elif time_range == '30d':
            start_time = now - timedelta(days=30)
        else:
            # 默认为7天
            start_time = now - timedelta(days=7)
        
        # 遍历文件夹
        for root, dirs, files in os.walk(self.vault_path):
            # 排除不需要的文件夹
            dirs[:] = [d for d in dirs if d not in self.exclude_folders]
            
            # 如果指定了包含文件夹，则只处理指定的文件夹
            if self.include_folders:
                current_folder = os.path.relpath(root, self.vault_path)
                if current_folder != '.' and current_folder not in self.include_folders:
                    continue
            
            for file in files:
                if file.endswith('.md'):
                    file_path = os.path.join(root, file)
                    # 获取文件修改时间
                    mtime = os.path.getmtime(file_path)
                    file_modified_time = datetime.fromtimestamp(mtime)
                    
                    # 检查是否在时间范围内
                    if file_modified_time >= start_time:
                        # 提取文件名中的日期
                        date_match = re.search(r'\\d{4}-\\d{2}-\\d{2}', file)
                        if date_match:
                            file_date = date_match.group(0)
                        else:
                            file_date = file_modified_time.strftime('%Y-%m-%d')
                        
                        # 读取文件内容
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                        except Exception as e:
                            content = f"Error reading file: {str(e)}"
                        
                        # 创建 ContentItem
                        item = ContentItem(
                            id=f"obsidian_{int(mtime)}_{hash(file_path)}",
                            title=os.path.splitext(file)[0],
                            content=content,
                            source="Obsidian",
                            url=f"file://{file_path}",
                            timestamp=mtime,
                            metadata={
                                "file_path": file_path,
                                "date": file_date,
                                "folder": os.path.relpath(root, self.vault_path)
                            }
                        )
                        items.append(item)
        
        return items
    
    def get_config_schema(self) -> Dict[str, Any]:
        """获取配置 schema"""
        return {
            "vault_path": {
                "type": "string",
                "required": True,
                "title": "Obsidian 库路径",
                "description": "Obsidian 库的本地路径"
            },
            "include_folders": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "title": "包含的文件夹",
                "description": "只抓取指定文件夹中的文档（留空则抓取所有文件夹）"
            },
            "exclude_folders": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "title": "排除的文件夹",
                "description": "不抓取的文件夹"
            }
        }
