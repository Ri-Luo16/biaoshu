import json
from typing import Dict, Any, List
from app.services.openai_service import OpenAIService
from app.models.procurement import (
    ProcurementRequirement, TenderDocumentDraft, 
    BidEvaluationCriteria, BidEvaluationResult
)
from app.utils.json_util import clean_json_string

SYSTEM_PROMPT_PROCUREMENT = """你是一个专业的政府采购与招标专家，名为"招标助手"。你的职责是帮助采购人编制招标文件、检查合规性以及辅助评标。"""

async def generate_tender_document_structure(
    requirement: ProcurementRequirement, 
    openai_service: OpenAIService
) -> TenderDocumentDraft:
    """根据采购需求生成招标文件结构草稿"""
    
    prompt = f"""请根据以下采购需求，编制一份标准招标文件的结构草稿。
    
    采购需求信息：
    - 项目名称: {requirement.project_name}
    - 预算金额: {requirement.budget}
    - 采购方式: {requirement.procurement_type}
    - 技术需求概要: {requirement.technical_requirements}
    - 资格要求: {requirement.qualification_requirements}
    - 评分标准概要: {requirement.scoring_criteria}
    
    请输出符合标准招标文件格式的章节结构（通常包含招标公告、投标人须知、评标办法、合同条款、技术需求等）。
    返回格式要求为JSON，符合 TenderDocumentDraft 模型结构。
    """
    
    schema = TenderDocumentDraft.model_json_schema()
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_PROCUREMENT},
        {"role": "user", "content": prompt}
    ]
    
    response = await openai_service._generate_with_json_check(
        messages=messages,
        schema=schema,
        response_format={"type": "json_object"},
        log_prefix="Tool-GenerateTenderDoc"
    )
    
    data = json.loads(clean_json_string(response))
    return TenderDocumentDraft(**data)

async def check_tender_compliance(
    tender_draft: TenderDocumentDraft, 
    openai_service: OpenAIService
) -> Dict[str, Any]:
    """检查招标文件的合规性与公平性"""
    
    prompt = f"""请仔细审查以下招标文件草稿结构，检查是否存在违反《政府采购法》或《招标投标法》的内容。
    重点检查：
    1. 是否存在以不合理的条件限制或者排斥潜在投标人（如指定品牌、地域限制）。
    2. 评分标准是否客观、公正，是否存在倾向性。
    3. 资格要求是否过高，与项目实际需求不符。
    
    招标文件草稿摘要：
    标题: {tender_draft.title}
    章节概览: {json.dumps(tender_draft.sections[:5], ensure_ascii=False)}... (内容较多，仅展示部分)
    
    请输出检查报告，包含合规状态、风险点及修改建议。
    """
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_PROCUREMENT},
        {"role": "user", "content": prompt}
    ]
    
    response = await openai_service._collect_stream_text(messages)
    
    # 简单包装返回
    return {
        "is_compliant": "违规" not in response and "风险" not in response, # 简单逻辑，实际应由AI判断
        "report": response
    }

async def auto_screen_bids(
    bid_content: str, 
    criteria: BidEvaluationCriteria, 
    openai_service: OpenAIService
) -> BidEvaluationResult:
    """自动初筛与辅助评分"""
    
    prompt = f"""请根据以下评分标准，对投标文件内容进行初步评审。
    
    评分标准：
    - 技术权重: {criteria.technical_weight}
    - 价格权重: {criteria.price_weight}
    - 商务权重: {criteria.business_weight}
    - 细则: {json.dumps(criteria.items, ensure_ascii=False)}
    
    投标文件摘要：
    {bid_content[:5000]}
    
    请输出评审结果，包含各项得分预估、合规性判断及点评。
    返回格式必须为JSON，符合 BidEvaluationResult 模型结构。
    """
    
    schema = BidEvaluationResult.model_json_schema()
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_PROCUREMENT},
        {"role": "user", "content": prompt}
    ]
    
    response = await openai_service._generate_with_json_check(
        messages=messages,
        schema=schema,
        response_format={"type": "json_object"},
        log_prefix="Tool-EvaluateBid"
    )
    
    data = json.loads(clean_json_string(response))
    return BidEvaluationResult(**data)

