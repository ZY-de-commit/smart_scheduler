"""
音频播放器
支持文本转语音、音频播放、蓝牙音箱连接
"""

import logging
import platform
import threading
import tempfile
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class AudioDevice:
    id: str
    name: str
    is_default: bool
    is_bluetooth: bool
    description: str = ""


class AudioPlayer:
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self._tts_engine = None
        self._current_process = None
        self._lock = threading.Lock()
        self._is_playing = False
        self._temp_dir = tempfile.mkdtemp(prefix="smart_scheduler_audio_")
        
        self.speech_rate = self.config.get('speech_rate', 150)
        self.volume = self.config.get('volume', 1.0)
        self.output_device = self.config.get('output_device', '')
        self.bluetooth_device = self.config.get('bluetooth_device', '')
    
    def speak(self, text: str, blocking: bool = True) -> bool:
        if not text:
            logger.warning("Empty text provided for speak")
            return False
        
        logger.info(f"Speaking text: {text[:50]}...")
        
        system = platform.system()
        
        try:
            if system == "Windows":
                return self._speak_windows(text, blocking)
            elif system == "Darwin":
                return self._speak_macos(text, blocking)
            elif system == "Linux":
                return self._speak_linux(text, blocking)
            else:
                logger.warning(f"Unsupported OS: {system}")
                return False
                
        except Exception as e:
            logger.error(f"Speech error: {e}")
            return False
    
    def _speak_windows(self, text: str, blocking: bool) -> bool:
        try:
            import pyttsx3
            
            with self._lock:
                if self._tts_engine is None:
                    self._tts_engine = pyttsx3.init()
                
                self._tts_engine.setProperty('rate', self.speech_rate)
                self._tts_engine.setProperty('volume', self.volume)
                
                self._is_playing = True
                self._tts_engine.say(text)
                self._tts_engine.runAndWait()
                self._is_playing = False
                
                return True
                
        except Exception as e:
            logger.error(f"Windows TTS error: {e}")
            return False
    
    def _speak_macos(self, text: str, blocking: bool) -> bool:
        import subprocess
        
        try:
            cmd = ['say']
            
            if self.speech_rate:
                cmd.extend(['-r', str(self.speech_rate)])
            
            if self.bluetooth_device or self.output_device:
                device = self.bluetooth_device or self.output_device
                cmd.extend(['-a', device])
            
            cmd.append(text)
            
            with self._lock:
                self._is_playing = True
                process = subprocess.Popen(cmd)
                
                if blocking:
                    process.wait()
                else:
                    self._current_process = process
                
                self._is_playing = False
                return True
                
        except Exception as e:
            logger.error(f"macOS TTS error: {e}")
            return False
    
    def _speak_linux(self, text: str, blocking: bool) -> bool:
        import subprocess
        
        try:
            cmd = ['espeak']
            
            if self.speech_rate:
                cmd.extend(['-s', str(self.speech_rate)])
            
            cmd.extend(['-v', 'zh'])
            cmd.append(text)
            
            with self._lock:
                self._is_playing = True
                process = subprocess.Popen(cmd)
                
                if blocking:
                    process.wait()
                else:
                    self._current_process = process
                
                self._is_playing = False
                return True
                
        except FileNotFoundError:
            try:
                cmd = ['spd-say', '-l', 'zh', text]
                process = subprocess.Popen(cmd)
                if blocking:
                    process.wait()
                return True
            except Exception as e:
                logger.error(f"Linux TTS error: {e}")
                return False
        except Exception as e:
            logger.error(f"Linux TTS error: {e}")
            return False
    
    def speak_to_file(self, text: str, output_path: str = None) -> Optional[str]:
        if not text:
            return None
        
        system = platform.system()
        
        try:
            if output_path is None:
                output_path = os.path.join(self._temp_dir, f"speech_{hash(text)}.wav")
            
            if system == "Windows":
                import pyttsx3
                
                if self._tts_engine is None:
                    self._tts_engine = pyttsx3.init()
                
                self._tts_engine.save_to_file(text, output_path)
                self._tts_engine.runAndWait()
                
                return output_path
                
            elif system == "Darwin":
                import subprocess
                
                cmd = ['say', '-o', output_path, '--data-format=LEI16@22050', text]
                subprocess.run(cmd, check=True)
                
                return output_path
                
            else:
                logger.warning(f"speak_to_file not supported on {system}")
                return None
                
        except Exception as e:
            logger.error(f"speak_to_file error: {e}")
            return None
    
    def play_audio(self, file_path: str, blocking: bool = True) -> bool:
        if not os.path.exists(file_path):
            logger.error(f"Audio file not found: {file_path}")
            return False
        
        system = platform.system()
        
        try:
            if system == "Windows":
                return self._play_audio_windows(file_path, blocking)
            elif system == "Darwin":
                return self._play_audio_macos(file_path, blocking)
            elif system == "Linux":
                return self._play_audio_linux(file_path, blocking)
            else:
                return False
                
        except Exception as e:
            logger.error(f"Play audio error: {e}")
            return False
    
    def _play_audio_windows(self, file_path: str, blocking: bool) -> bool:
        try:
            from playsound import playsound
            
            with self._lock:
                self._is_playing = True
                playsound(file_path, block=blocking)
                self._is_playing = False
                return True
                
        except Exception as e:
            logger.error(f"Windows play audio error: {e}")
            try:
                import subprocess
                os.startfile(file_path)
                return True
            except Exception:
                return False
    
    def _play_audio_macos(self, file_path: str, blocking: bool) -> bool:
        import subprocess
        
        try:
            cmd = ['afplay', file_path]
            
            with self._lock:
                self._is_playing = True
                process = subprocess.Popen(cmd)
                
                if blocking:
                    process.wait()
                else:
                    self._current_process = process
                
                self._is_playing = False
                return True
                
        except Exception as e:
            logger.error(f"macOS play audio error: {e}")
            return False
    
    def _play_audio_linux(self, file_path: str, blocking: bool) -> bool:
        import subprocess
        
        try:
            cmd = ['aplay', file_path]
            
            with self._lock:
                self._is_playing = True
                process = subprocess.Popen(cmd)
                
                if blocking:
                    process.wait()
                else:
                    self._current_process = process
                
                self._is_playing = False
                return True
                
        except FileNotFoundError:
            try:
                cmd = ['mpg123', file_path]
                process = subprocess.Popen(cmd)
                if blocking:
                    process.wait()
                return True
            except Exception:
                return False
        except Exception as e:
            logger.error(f"Linux play audio error: {e}")
            return False
    
    def stop(self):
        with self._lock:
            if self._current_process:
                try:
                    self._current_process.terminate()
                    self._current_process = None
                except Exception:
                    pass
            
            self._is_playing = False
            logger.info("Audio stopped")
    
    def is_playing(self) -> bool:
        return self._is_playing
    
    def list_devices(self) -> List[AudioDevice]:
        devices = []
        system = platform.system()
        
        try:
            if system == "Windows":
                devices = self._list_devices_windows()
            elif system == "Darwin":
                devices = self._list_devices_macos()
            elif system == "Linux":
                devices = self._list_devices_linux()
        except Exception as e:
            logger.error(f"Error listing audio devices: {e}")
        
        return devices
    
    def _list_devices_windows(self) -> List[AudioDevice]:
        devices = []
        
        try:
            import pyttsx3
            
            engine = pyttsx3.init()
            voices = engine.getProperty('voices')
            
            for i, voice in enumerate(voices):
                devices.append(AudioDevice(
                    id=str(i),
                    name=voice.name,
                    is_default=i == 0,
                    is_bluetooth='bluetooth' in voice.name.lower(),
                    description=f"Language: {voice.language}"
                ))
        except Exception:
            pass
        
        if not devices:
            devices.append(AudioDevice(
                id="default",
                name="默认音频设备",
                is_default=True,
                is_bluetooth=False
            ))
        
        return devices
    
    def _list_devices_macos(self) -> List[AudioDevice]:
        import subprocess
        
        devices = []
        
        try:
            result = subprocess.run(
                ['system_profiler', 'SPAudioDataType'],
                capture_output=True,
                text=True
            )
            
            output = result.stdout
            lines = output.split('\n')
            
            current_device = None
            in_output_section = False
            
            for line in lines:
                if 'Default Output Device' in line:
                    continue
                
                if 'Output:' in line:
                    in_output_section = True
                    continue
                
                if in_output_section and line.strip() and ':' in line:
                    name = line.split(':')[0].strip()
                    is_bluetooth = 'bluetooth' in name.lower() or 'Bluetooth' in name
                    
                    devices.append(AudioDevice(
                        id=name,
                        name=name,
                        is_default=len(devices) == 0,
                        is_bluetooth=is_bluetooth
                    ))
        except Exception:
            pass
        
        if not devices:
            devices.append(AudioDevice(
                id="default",
                name="默认音频设备",
                is_default=True,
                is_bluetooth=False
            ))
        
        return devices
    
    def _list_devices_linux(self) -> List[AudioDevice]:
        import subprocess
        
        devices = []
        
        try:
            result = subprocess.run(
                ['pactl', 'list', 'sinks'],
                capture_output=True,
                text=True
            )
            
            output = result.stdout
            
            import re
            
            sink_pattern = r'Sink #(\d+)'
            name_pattern = r'Name: (.+)'
            desc_pattern = r'Description: (.+)'
            
            sinks = re.split(sink_pattern, output)
            
            for i in range(1, len(sinks), 2):
                sink_id = sinks[i]
                sink_info = sinks[i + 1]
                
                name_match = re.search(name_pattern, sink_info)
                desc_match = re.search(desc_pattern, sink_info)
                
                name = name_match.group(1) if name_match else f"Sink {sink_id}"
                description = desc_match.group(1) if desc_match else ""
                
                is_bluetooth = 'bluez' in name.lower() or 'bluetooth' in name.lower()
                
                devices.append(AudioDevice(
                    id=sink_id,
                    name=name,
                    is_default=len(devices) == 0,
                    is_bluetooth=is_bluetooth,
                    description=description
                ))
        except Exception:
            pass
        
        if not devices:
            devices.append(AudioDevice(
                id="default",
                name="默认音频设备",
                is_default=True,
                is_bluetooth=False
            ))
        
        return devices
    
    def set_volume(self, volume: float):
        if 0.0 <= volume <= 1.0:
            self.volume = volume
            logger.info(f"Volume set to {volume}")
    
    def set_speech_rate(self, rate: int):
        if rate > 0:
            self.speech_rate = rate
            logger.info(f"Speech rate set to {rate}")
    
    def cleanup(self):
        try:
            import shutil
            shutil.rmtree(self._temp_dir, ignore_errors=True)
        except Exception:
            pass
        
        self.stop()
