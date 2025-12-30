from typing import Dict, Any
from app.services.openai_service import OpenAIService
from app.models.bidding import TenderInfo

async def generate_doc(openai_service: OpenAIService, prompt: str) -> str:
    """通用文档生成工具"""
    messages = [{"role": "user", "content": prompt}]
    return await openai_service._collect_stream_text(messages)

async def generate_technical_response(
    outline: Dict[str, Any], 
    tender_info: TenderInfo, 
    company_info: str, 
    openai_service: OpenAIService
) -> Dict[str, Any]:
    """生成技术响应文档"""
    project_overview = f"""项目名称：{tender_info.project_name}
项目背景与需求：{tender_info.technical_requirements}
企业优势：{company_info}
"""
    return await openai_service.generate_content_for_outline(outline, project_overview=project_overview)

