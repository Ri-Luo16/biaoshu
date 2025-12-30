import json
from typing import Dict, Any, List

from app.services.openai_service import OpenAIService
from app.models.bidding import (
    TenderInfo, RiskAnalysisResponse, GoNoGoDecision, 
    ScoringSimulationResponse
)

# 导入工具集
from app.agents.tools.parsing_tools import parse_tender_structure, read_tender_file
from app.agents.tools.analysis_tools import (
    go_nogo_analysis, detect_risk_clauses, simulate_evaluation
)
from app.agents.tools.generation_tools import generate_technical_response
from app.agents.tools.export_tools import export_response_to_docx

class BiddingAgent:
    """
    BiddingAgent 投标响应智能体
    核心功能：标书解析、风险分析、Go/No-Go 决策、评分模拟、文档生成
    
    架构升级：使用 Tool-based 架构
    """
    
    def __init__(self):
        self.openai_service = OpenAIService()

    async def load_and_parse_tender(self, file_path: str) -> TenderInfo:
        """
        读取文件并解析招标文件
        """
        file_content = await read_tender_file(file_path)
        return await self.parse_tender(file_content)

    async def parse_tender(self, file_content: str) -> TenderInfo:
        """
        招标文件解析
        """
        return await parse_tender_structure(file_content, self.openai_service)

    async def risk_analysis(self, tender_content: str) -> RiskAnalysisResponse:
        """
        风险条款识别
        """
        return await detect_risk_clauses(tender_content, self.openai_service)

    async def analyze_bid(self, tender_info: TenderInfo, company_info: str) -> GoNoGoDecision:
        """
        Go/No-Go 分析
        """
        return await go_nogo_analysis(tender_info, company_info, self.openai_service)

    async def scoring_simulation(self, tender_info: TenderInfo, company_info: str) -> ScoringSimulationResponse:
        """
        评分模拟
        """
        return await simulate_evaluation(tender_info, company_info, self.openai_service)

    async def generate_response(self, outline: Dict[str, Any], tender_info: TenderInfo, company_info: str = ""):
        """
        投标文档内容生成
        """
        return await generate_technical_response(outline, tender_info, company_info, self.openai_service)

    async def export_response(self, content_structure: Dict[str, Any], file_name: str = "tender_response.docx") -> str:
        """
        导出投标文档为 Word
        """
        return export_response_to_docx(content_structure, file_name)
