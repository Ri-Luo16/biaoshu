import os
from typing import List, Dict, Any
from langchain_openai import OpenAIEmbeddings
from langchain_ollama import OllamaEmbeddings
from langchain_milvus import Milvus
from langchain_core.documents import Document
from ..utils.config_manager import config_manager

class MilvusService:
    def __init__(self):
        # 优先使用 pydantic settings，因为 config_manager 可能加载的是旧的本地文件配置
        from ..config import settings
        
        config = config_manager.load_config()
        self.api_key = config.get('api_key', '')
        self.base_url = config.get('base_url', '')
        
        # 强制使用 settings 中的值，除非 config_manager 中有明确覆盖
        self.milvus_uri = settings.milvus_uri
        self.collection_name = settings.milvus_collection
        
        # 打印调试信息
        print(f"Milvus 连接地址: {self.milvus_uri}")
        
        # 优先使用 Ollama 如果配置了 embedding 模型，否则回退到 OpenAI
        self.ollama_base_url = config.get('ollama_base_url', 'http://localhost:11434')
        self.ollama_model = config.get('ollama_embedding_model', 'nomic-embed-text')
        
        try:
            # 尝试初始化 Ollama Embeddings
            print(f"尝试连接 Ollama Embeddings ({self.ollama_model})...")
            self.embeddings = OllamaEmbeddings(
                base_url=self.ollama_base_url,
                model=self.ollama_model
            )
            # 测试一下是否可用 (可选)
            # self.embeddings.embed_query("test")
            print("使用 Ollama Embeddings")
        except Exception as e:
            print(f"Ollama 连接失败，回退到 OpenAI Embeddings: {e}")
            # 初始化 OpenAI Embeddings
            self.embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=self.api_key,
                openai_api_base=self.base_url
            )
        
        # 初始化 Milvus 向量存储
        # 注意：第一次使用时会自动创建集合
        self.vector_store = Milvus(
            embedding_function=self.embeddings,
            connection_args={"uri": self.milvus_uri},
            collection_name=self.collection_name,
            auto_id=True,
        )

    async def add_documents(self, texts: List[str], metadatas: List[Dict[str, Any]] = None):
        """添加文档到向量数据库"""
        documents = [
            Document(page_content=text, metadata=meta if meta else {})
            for text, meta in zip(texts, metadatas or [{} for _ in texts])
        ]
        await self.vector_store.aadd_documents(documents)
        return True

    async def search_similar(self, query: str, k: int = 4, expr: str = None) -> List[Document]:
        """搜索相似文档"""
        # LangChain Milvus 实现支持 expr 参数进行过滤
        kwargs = {}
        if expr:
            kwargs["expr"] = expr
            
        docs = await self.vector_store.asimilarity_search(query, k=k, **kwargs)
        return docs

    def delete_collection(self):
        """删除集合（慎用）"""
        self.vector_store.drop()

