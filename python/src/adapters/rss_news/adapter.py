"""
RSS 新闻适配器实现
用于订阅和获取 RSS 新闻源内容
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..base import BaseAdapter, ContentItem

logger = logging.getLogger(__name__)


class RSSNewsAdapter(BaseAdapter):
    name = "rss_news"
    display_name = "RSS 新闻订阅"
    description = "订阅 RSS 新闻源，获取最新新闻内容"
    version = "1.0.0"
    
    requires_auth = False
    supported_time_ranges = ['1d', '7d', '30d']
    content_type = "news"
    
    DEFAULT_FEEDS = [
        {'name': '知乎热榜', 'url': 'https://www.zhihu.com/rss/hot'},
        {'name': '掘金', 'url': 'https://rsshub.app/juejin/trending/all/daily'},
        {'name': 'V2EX', 'url': 'https://www.v2ex.com/index.xml'},
    ]
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.feeds = config.get('feeds', self.DEFAULT_FEEDS)
        self._session = None
    
    def get_config_schema(self) -> Dict[str, Any]:
        return {
            'type': 'object',
            'properties': {
                'feeds': {
                    'type': 'array',
                    'title': 'RSS 订阅源',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'name': {'type': 'string', 'title': '订阅源名称'},
                            'url': {'type': 'string', 'title': 'RSS 地址', 'format': 'uri'}
                        },
                        'required': ['name', 'url']
                    },
                    'default': self.DEFAULT_FEEDS
                }
            },
            'required': ['feeds']
        }
    
    def initialize(self) -> bool:
        try:
            import requests
            self._session = requests.Session()
            self._is_initialized = True
            logger.info("RSSNews adapter initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize RSSNews adapter: {e}")
            return False
    
    def validate_config(self) -> bool:
        return len(self.feeds) > 0
    
    def is_available(self) -> bool:
        return self._is_initialized and self._session is not None
    
    def fetch_data(self, time_range: str) -> List[ContentItem]:
        if not self.is_available():
            raise RuntimeError("RSSNews adapter is not available")
        
        all_items = []
        
        for feed in self.feeds:
            try:
                items = self._fetch_feed(feed, time_range)
                all_items.extend(items)
            except Exception as e:
                logger.warning(f"Error fetching feed {feed.get('name')}: {e}")
        
        all_items.sort(key=lambda x: x.published_at, reverse=True)
        
        return all_items
    
    def _fetch_feed(self, feed: Dict[str, Any], time_range: str) -> List[ContentItem]:
        items = []
        
        try:
            import feedparser
            
            feed_name = feed.get('name', 'Unknown')
            feed_url = feed.get('url', '')
            
            if not feed_url:
                return items
            
            response = self._session.get(feed_url, timeout=30)
            response.encoding = 'utf-8'
            
            parsed = feedparser.parse(response.content)
            
            start_time, _ = self.get_time_boundaries(time_range)
            
            for entry in parsed.entries[:20]:
                pub_date = self._parse_pub_date(entry)
                
                if pub_date and pub_date >= start_time:
                    item = ContentItem(
                        id=entry.get('id', entry.get('link', '')),
                        title=entry.get('title', '无标题'),
                        description=self._clean_html(entry.get('summary', entry.get('description', ''))),
                        url=entry.get('link', ''),
                        published_at=pub_date,
                        source=f"{self.name}:{feed_name}",
                        metadata={
                            'feed_name': feed_name,
                            'feed_url': feed_url,
                            'author': entry.get('author', ''),
                            'tags': [tag.get('term', '') for tag in entry.get('tags', [])]
                        }
                    )
                    items.append(item)
                    
        except ImportError:
            logger.error("feedparser not installed")
        except Exception as e:
            logger.warning(f"Error parsing feed: {e}")
        
        return items
    
    def _parse_pub_date(self, entry) -> Optional[datetime]:
        date_fields = ['published_parsed', 'updated_parsed', 'created_parsed']
        
        for field in date_fields:
            parsed = entry.get(field)
            if parsed:
                try:
                    return datetime(*parsed[:6])
                except Exception:
                    pass
        
        pub_str = entry.get('published', entry.get('updated', ''))
        if pub_str:
            try:
                from email.utils import parsedate_to_datetime
                return parsedate_to_datetime(pub_str)
            except Exception:
                pass
        
        return None
    
    def _clean_html(self, html: str) -> str:
        if not html:
            return ''
        
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, 'html.parser')
            text = soup.get_text(separator=' ', strip=True)
            return text[:500] if len(text) > 500 else text
        except ImportError:
            import re
            text = re.sub(r'<[^>]+>', ' ', html)
            text = re.sub(r'\s+', ' ', text).strip()
            return text[:500] if len(text) > 500 else text
