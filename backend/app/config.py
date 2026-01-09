from pathlib import Path

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AI标书"
    app_version: str = "2.0.0"
    debug: bool = False
    
    cors_origins: list = [
        f"http://{host}:{port}" 
        for host in ["localhost", "127.0.0.1"] 
        for port in range(3000, 3005)
    ]
    
    max_file_size: int = 20 * 1024 * 1024
    upload_dir: str = "uploads"
    default_model: str = "gpt-3.5-turbo"
    
    milvus_uri: str = "http://localhost:19530"
    milvus_collection: str = "bid_documents"
    ollama_base_url: str = "http://localhost:11434"
    ollama_embedding_model: str = "nomic-embed-text"

    class Config:
        env_file = ".env"


settings = Settings()
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)