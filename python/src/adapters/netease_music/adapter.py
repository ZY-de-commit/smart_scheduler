"""
网易云音乐适配器实现
用于获取用户的播放记录、推荐歌曲、每日推荐等内容
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..base import BaseAdapter, AudioContentItem

logger = logging.getLogger(__name__)


class NetEaseMusicAdapter(BaseAdapter):
    name = "netease_music"
    display_name = "网易云音乐"
    description = "获取网易云音乐的播放记录、推荐歌曲、每日推荐等内容"
    version = "1.0.0"
    
    requires_auth = True
    supported_time_ranges = ['1d', '7d', '30d']
    content_type = "audio"
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.user_id = config.get('user_id', '')
        self.api_base = config.get('api_base', 'http://localhost:3000')
        self._session = None
    
    def get_config_schema(self) -> Dict[str, Any]:
        return {
            'type': 'object',
            'properties': {
                'user_id': {
                    'type': 'string',
                    'title': '用户ID',
                    'description': '网易云音乐用户ID'
                },
                'api_base': {
                    'type': 'string',
                    'title': 'API地址',
                    'description': '网易云音乐API服务地址（需自行部署 NeteaseCloudMusicApi）',
                    'default': 'http://localhost:3000'
                }
            },
            'required': ['user_id']
        }
    
    def initialize(self) -> bool:
        if not self.validate_config():
            return False
        
        try:
            import requests
            self._session = requests.Session()
            self._is_initialized = True
            logger.info("NetEaseMusic adapter initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize NetEaseMusic adapter: {e}")
            return False
    
    def validate_config(self) -> bool:
        if not self.user_id:
            logger.warning("NetEaseMusic: user_id not configured")
            return False
        return True
    
    def is_available(self) -> bool:
        if not self._is_initialized:
            return False
        
        if not self._session:
            return False
        
        try:
            response = self._session.get(f"{self.api_base}/personalized", timeout=5)
            return response.status_code == 200
        except Exception:
            return False
    
    def fetch_data(self, time_range: str) -> List[AudioContentItem]:
        if not self.is_available():
            raise RuntimeError("NetEaseMusic adapter is not available")
        
        items = []
        
        try:
            records = self._get_play_records(time_range)
            items.extend(records)
            
            daily_songs = self._get_daily_recommend()
            items.extend(daily_songs)
            
            personalized = self._get_personalized()
            items.extend(personalized)
            
        except Exception as e:
            logger.error(f"Error fetching NetEaseMusic data: {e}")
        
        return items
    
    def _get_play_records(self, time_range: str) -> List[AudioContentItem]:
        items = []
        
        try:
            type_param = 1 if time_range == '1d' else 0
            response = self._session.get(
                f"{self.api_base}/record/recent/song",
                params={'limit': 100},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                records = data.get('data', {}).get('list', [])
                
                for record in records:
                    song = record.get('data', {})
                    
                    item = AudioContentItem(
                        id=str(song.get('id', '')),
                        title=song.get('name', '未知歌曲'),
                        description=f"播放记录 - {self._get_artists(song)}",
                        url=f"https://music.163.com/#/song?id={song.get('id', '')}",
                        published_at=datetime.fromtimestamp(record.get('playTime', 0) / 1000),
                        source=self.name,
                        metadata={
                            'play_count': record.get('playCount', 0),
                            'duration': song.get('dt', 0) // 1000,
                            'album': song.get('al', {}).get('name', '')
                        },
                        audio_url="",
                        duration=song.get('dt', 0) // 1000,
                        thumbnail_url=song.get('al', {}).get('picUrl', '')
                    )
                    items.append(item)
                    
        except Exception as e:
            logger.warning(f"Error getting play records: {e}")
        
        return items
    
    def _get_daily_recommend(self) -> List[AudioContentItem]:
        items = []
        
        try:
            response = self._session.get(
                f"{self.api_base}/recommend/songs",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                songs = data.get('data', {}).get('dailySongs', [])
                
                for song in songs[:10]:
                    item = AudioContentItem(
                        id=str(song.get('id', '')),
                        title=song.get('name', '未知歌曲'),
                        description=f"每日推荐 - {self._get_artists(song)}",
                        url=f"https://music.163.com/#/song?id={song.get('id', '')}",
                        published_at=datetime.now(),
                        source=self.name,
                        metadata={
                            'type': 'daily_recommend',
                            'duration': song.get('dt', 0) // 1000,
                            'album': song.get('al', {}).get('name', '')
                        },
                        audio_url="",
                        duration=song.get('dt', 0) // 1000,
                        thumbnail_url=song.get('al', {}).get('picUrl', '')
                    )
                    items.append(item)
                    
        except Exception as e:
            logger.warning(f"Error getting daily recommend: {e}")
        
        return items
    
    def _get_personalized(self) -> List[AudioContentItem]:
        items = []
        
        try:
            response = self._session.get(
                f"{self.api_base}/personalized",
                params={'limit': 10},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                playlists = data.get('result', [])
                
                for playlist in playlists:
                    item = AudioContentItem(
                        id=str(playlist.get('id', '')),
                        title=playlist.get('name', '未知歌单'),
                        description=f"推荐歌单 - {playlist.get('copywriter', '')}",
                        url=f"https://music.163.com/#/playlist?id={playlist.get('id', '')}",
                        published_at=datetime.now(),
                        source=self.name,
                        metadata={
                            'type': 'personalized_playlist',
                            'play_count': playlist.get('playCount', 0),
                            'track_count': playlist.get('trackCount', 0)
                        },
                        audio_url="",
                        duration=0,
                        thumbnail_url=playlist.get('picUrl', '')
                    )
                    items.append(item)
                    
        except Exception as e:
            logger.warning(f"Error getting personalized: {e}")
        
        return items
    
    def _get_artists(self, song: Dict[str, Any]) -> str:
        artists = song.get('ar', [])
        if not artists:
            return '未知歌手'
        
        names = [artist.get('name', '') for artist in artists]
        return '、'.join(filter(None, names))
