from typing import List, Dict, Any
from app.services.milvus_service import MilvusService
from langchain_core.documents import Document

async def kb_search(query: str, k: int = 4, category: str = None) -> List[Document]:
    """通用知识库搜索，支持分类过滤"""
    try:
        service = MilvusService()
        expr = f'category == "{category}"' if category else None
        return await service.search_similar(query, k=k, expr=expr)
    except Exception as e:
        print(f"知识库搜索失败: {e}")
        return []

async def add_knowledge_to_kb(texts: List[str], category: str, source: str = "manual_entry") -> bool:
    """添加知识到知识库"""
    try:
        service = MilvusService()
        metadatas = [{"category": category, "source": source} for _ in texts]
        await service.add_documents(texts, metadatas=metadatas)
        return True
    except Exception as e:
        print(f"添加知识失败: {e}")
        return False

async def search_company_capabilities(query: str, k: int = 4) -> str:
    """搜索企业能力/资质"""
    docs = await kb_search(query, k=k, category="qualification")
    # 如果没有特定分类的，尝试通用搜索作为兜底
    if not docs:
        docs = await kb_search(f"企业资质 能力 案例 {query}", k=k)
    return "\n\n".join([d.page_content for d in docs])

async def search_similar_cases(project_type: str, k: int = 3) -> str:
    """搜索相似案例 (历史标书)"""
    docs = await kb_search(project_type, k=k, category="history")
    if not docs:
         docs = await kb_search(f"相似项目案例 {project_type}", k=k)
    return "\n\n".join([d.page_content for d in docs])

async def search_regulations(query: str, k: int = 3) -> str:
    """搜索政策法规"""
    docs = await kb_search(query, k=k, category="regulation")
    return "\n\n".join([d.page_content for d in docs])
