"""配置管理工具"""
import json
from pathlib import Path
from typing import Dict


class ConfigManager:
    """用户配置管理器"""
    
    def __init__(self) -> None:
        # 配置文件路径 - 存储到用户家目录中
        self.config_dir = Path.home() / ".ai_write_helper"
        self.config_file = self.config_dir / "user_config.json"
        
        # 确保配置目录存在
        self.config_dir.mkdir(parents=True, exist_ok=True)
    
    def load_config(self) -> Dict:
        """从本地JSON文件加载配置"""
        default_config = {
            'api_key': '',
            'base_url': '',
            'model_name': 'gpt-3.5-turbo'
        }
        
        if self.config_file.exists():
            try:
                loaded_config = json.loads(self.config_file.read_text(encoding='utf-8'))
                default_config.update(loaded_config)
            except Exception:
                pass  # 如果读取失败，使用默认配置
        
        return default_config
    
    def save_config(self, api_key: str, base_url: str, model_name: str) -> bool:
        """保存配置到本地JSON文件"""
        config = {
            'api_key': api_key,
            'base_url': base_url,
            'model_name': model_name
        }
        
        try:
            self.config_file.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding='utf-8')
            return True
        except Exception:
            return False


# 全局配置管理器实例
config_manager = ConfigManager()
