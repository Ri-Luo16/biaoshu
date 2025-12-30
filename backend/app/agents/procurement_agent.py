from typing import Dict, Any, List

from app.services.openai_service import OpenAIService
from app.models.procurement import (
    ProcurementRequirement, TenderDocumentDraft, 
    BidEvaluationCriteria, BidEvaluationResult
)
from app.agents.tools.procurement_tools import (
    generate_tender_document_structure,
    check_tender_compliance,
    auto_screen_bids
)

class ProcurementAgent:
    """
    ProcurementAgent 采购方智能体
    核心功能：招标文件生成、合规性检查、投标评审辅助
    """
    
    def __init__(self):
        self.openai_service = OpenAIService()

    async def create_tender_document(self, requirement: ProcurementRequirement) -> TenderDocumentDraft:
        """
        生成招标文件草稿
        """
        draft = await generate_tender_document_structure(requirement, self.openai_service)
        
        # 自动进行一次合规性预检
        check_result = await self.validate_tender(draft)
        draft.compliance_check_result = check_result.get("report", "")
        
        return draft

    async def validate_tender(self, tender_draft: TenderDocumentDraft) -> Dict[str, Any]:
        """
        校验招标文件合规性
        """
        return await check_tender_compliance(tender_draft, self.openai_service)

    async def evaluate_bid(self, bid_content: str, criteria: BidEvaluationCriteria) -> BidEvaluationResult:
        """
        投标评审辅助
        """
        return await auto_screen_bids(bid_content, criteria, self.openai_service)

