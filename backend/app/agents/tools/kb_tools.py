from typing import List, Dict, Any
from app.services.milvus_service import MilvusService
from langchain_core.documents import Document

async def kb_search(query: str, k: int = 4) -> List[Document]:
    """通用知识库搜索"""
    try:
        service = MilvusService()
        return await service.search_similar(query, k=k)
    except Exception as e:
        print(f"知识库搜索失败: {e}")
        return []

async def search_company_capabilities(query: str, k: int = 4) -> str:
    """搜索企业能力/资质"""
    # 假设 Milvus 中有区分 source 或 metadata，这里简化为通用搜索，
    # 实际应用中可能需要 filter metadata={'type': 'capability'}
    docs = await kb_search(f"企业资质 能力 案例 {query}", k=k)
    return "\n\n".join([d.page_content for d in docs])

async def search_similar_cases(project_type: str, k: int = 3) -> str:
    """搜索相似案例"""
    docs = await kb_search(f"相似项目案例 {project_type}", k=k)
    return "\n\n".join([d.page_content for d in docs])

