"""应用配置管理"""
from pathlib import Path
from typing import Optional
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings


class Settings(BaseSettings):
    """应用设置"""
    app_name: str = "AI标书"
    app_version: str = "2.0.0"
    debug: bool = False
    
    # CORS设置
    cors_origins: list = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3001",
        "http://localhost:3002", 
        "http://127.0.0.1:3002",
        "http://localhost:3003", 
        "http://127.0.0.1:3003",
        "http://localhost:3004", 
        "http://127.0.0.1:3004"
    ]
    
    # 文件上传设置
    max_file_size: int = 20 * 1024 * 1024  # 20MB
    upload_dir: str = "uploads"
    
    # OpenAI默认设置
    default_model: str = "gpt-3.5-turbo"
    
    # Milvus 默认设置
    # 如果使用 Docker 部署的 Milvus，请将 uri 改为 "http://localhost:19530"
    # 如果使用本地 Lite 版，保持 "./milvus_demo.db"
    milvus_uri: str = "http://localhost:19530" 
    milvus_collection: str = "bid_documents"

    # Ollama 设置
    ollama_base_url: str = "http://localhost:11434"
    ollama_embedding_model: str = "nomic-embed-text" # 推荐的 embedding 模型

    class Config:
        env_file = ".env"


# 全局设置实例
settings = Settings()

# 确保上传目录存在
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)