from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

class TenderInfo(BaseModel):
    """招标文件解析结果"""
    project_name: str = Field(..., description="项目名称")
    project_number: Optional[str] = Field(None, description="项目编号")
    tender_deadline: Optional[str] = Field(None, description="投标截止时间")
    budget: Optional[str] = Field(None, description="项目预算/招标控制价")
    purchaser: Optional[str] = Field(None, description="采购人")
    agency: Optional[str] = Field(None, description="代理机构")
    qualifications: List[str] = Field(default_factory=list, description="资格要求")
    evaluation_method: Optional[str] = Field(None, description="评标办法描述")
    technical_requirements: List[str] = Field(default_factory=list, description="主要技术规范/需求")
    
class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RiskItem(BaseModel):
    """单个风险项"""
    clause: str = Field(..., description="相关条款内容")
    description: str = Field(..., description="风险描述")
    level: RiskLevel = Field(..., description="风险等级")
    suggestion: str = Field(..., description="应对建议")

class RiskAnalysisResponse(BaseModel):
    """风险分析报告"""
    overall_risk: RiskLevel = Field(..., description="整体风险等级")
    risks: List[RiskItem] = Field(..., description="风险列表")
    summary: str = Field(..., description="风险综述")

class GoNoGoDecision(BaseModel):
    """Go/No-Go 决策结果"""
    decision: bool = Field(..., description="是否建议投标 (Go=True, No-Go=False)")
    score: int = Field(..., description="匹配度评分 (0-100)")
    reasoning: str = Field(..., description="决策理由")
    pros: List[str] = Field(..., description="有利因素")
    cons: List[str] = Field(..., description="不利因素")
    missing_capabilities: List[str] = Field(default_factory=list, description="缺失能力/资质")

class ScoringItem(BaseModel):
    """评分项模拟"""
    item_name: str = Field(..., description="评分项名称")
    max_score: int = Field(..., description="满分")
    predicted_score: int = Field(..., description="预测得分")
    analysis: str = Field(..., description="得分分析")
    optimization_suggestion: str = Field(..., description="提分建议")

class ScoringSimulationResponse(BaseModel):
    """评分模拟结果"""
    total_score: int = Field(..., description="预测总分")
    items: List[ScoringItem] = Field(..., description="各分项评分模拟")
    win_probability: str = Field(..., description="中标概率预估 (如: 高, 中, 低)")

class ParseTenderRequest(BaseModel):
    file_content: str = Field(..., description="招标文件文本内容")

class AnalysisRequest(BaseModel):
    tender_info: TenderInfo = Field(..., description="招标文件信息")
    company_info: str = Field(..., description="企业介绍/资质/案例库信息")

class GenerateResponseRequest(BaseModel):
    tender_info: TenderInfo = Field(..., description="招标文件信息")
    outline: Dict[str, Any] = Field(..., description="目录结构")
    company_info: str = Field("", description="企业信息")

