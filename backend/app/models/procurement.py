from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ProcurementRequirement(BaseModel):
    """采购需求"""
    project_name: str = Field(..., description="项目名称")
    budget: float = Field(..., description="预算金额")
    procurement_type: str = Field(..., description="采购方式 (公开招标/邀请招标/竞争性谈判等)")
    technical_requirements: str = Field(..., description="技术需求描述")
    qualification_requirements: str = Field(..., description="供应商资格要求")
    scoring_criteria: str = Field(..., description="评分标准概要")

class TenderDocumentDraft(BaseModel):
    """招标文件草稿"""
    title: str
    sections: List[Dict[str, Any]] = Field(..., description="章节内容，如 {'heading': '第一章 招标公告', 'content': '...'}")
    compliance_check_result: Optional[str] = Field(None, description="合规性检查结果")

class BidEvaluationCriteria(BaseModel):
    """评标标准"""
    technical_weight: float = Field(..., description="技术分权重 (0-1)")
    price_weight: float = Field(..., description="价格分权重 (0-1)")
    business_weight: float = Field(..., description="商务分权重 (0-1)")
    items: List[Dict[str, Any]] = Field(..., description="具体评分细则")

class BidEvaluationResult(BaseModel):
    """投标评审结果"""
    bidder_name: str
    total_score: float
    technical_score: float
    price_score: float
    business_score: float
    compliance_status: bool = Field(..., description="是否符合资格要求")
    risk_flags: List[str] = Field(default_factory=list, description="风险提示")
    comments: str = Field(..., description="专家/AI点评")

