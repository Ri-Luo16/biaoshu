import json
from typing import Dict, Any
from app.services.openai_service import OpenAIService
from app.models.bidding import (
    TenderInfo, RiskAnalysisResponse, GoNoGoDecision, 
    ScoringSimulationResponse
)
from app.utils.json_util import clean_json_string

SYSTEM_PROMPT = """你是一个专业的投标文件编制助手，名为"标书助手"。你的职责是帮助企业分析招标文件并生成投标响应。"""

async def go_nogo_analysis(tender_info: TenderInfo, company_info: str, openai_service: OpenAIService) -> GoNoGoDecision:
    """Go/No-Go 分析"""
    prompt = f"""请根据招标文件要求和企业信息，进行 Go/No-Go 分析。

招标文件信息：
{tender_info.model_dump_json(indent=2)}

企业信息：
{company_info}

请评估匹配度，返回JSON格式：
- decision: true (Go) / false (No-Go)
- score: 匹配度评分 (0-100的整数)
- reasoning: 决策理由
- pros: 有利因素列表
- cons: 不利因素列表
- missing_capabilities: 缺失资质/能力列表
"""
    schema = {
        "decision": True,
        "score": 85,
        "reasoning": "示例理由",
        "pros": ["优势1"],
        "cons": ["劣势1"],
        "missing_capabilities": ["缺失1"]
    }
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ]
    
    response = await openai_service._generate_with_json_check(
        messages=messages,
        schema=schema,
        response_format={"type": "json_object"},
        log_prefix="Tool-GoNoGo"
    )
    
    data = json.loads(clean_json_string(response))
    return GoNoGoDecision(**data)

async def detect_risk_clauses(tender_content: str, openai_service: OpenAIService) -> RiskAnalysisResponse:
    """识别风险条款"""
    prompt = f"""请对以下招标文件内容进行风险分析。识别其中的风险条款（如严苛的付款条件、不合理的工期、模糊的验收标准、高额违约金等）。

请返回JSON格式，包含：
- overall_risk: 整体风险等级 (low, medium, high, critical)
- risks: 风险项列表，每项包含:
    - clause: 相关条款
    - description: 风险描述
    - level: 风险等级
    - suggestion: 应对建议
- summary: 风险综述

招标文件内容片段：
{tender_content[:15000]}
"""
    schema = {
        "overall_risk": "low",
        "risks": [{
            "clause": "示例条款",
            "description": "示例描述",
            "level": "low",
            "suggestion": "示例建议"
        }],
        "summary": "示例综述"
    }
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ]
    
    response = await openai_service._generate_with_json_check(
        messages=messages,
        schema=schema,
        response_format={"type": "json_object"},
        log_prefix="Tool-RiskAnalysis"
    )
    
    data = json.loads(clean_json_string(response))
    return RiskAnalysisResponse(**data)

async def simulate_evaluation(tender_info: TenderInfo, company_info: str, openai_service: OpenAIService) -> ScoringSimulationResponse:
    """模拟评分"""
    prompt = f"""请根据评标办法（在tender_info中）和企业信息，模拟技术和商务评分。

招标文件信息：
{tender_info.model_dump_json(indent=2)}

企业信息：
{company_info}

请返回JSON格式：
- total_score: 预测总分 (整数)
- win_probability: 中标概率预估 (高/中/低)
- items: 评分项列表，每项包含:
    - item_name: 评分项名称
    - max_score: 满分 (整数)
    - predicted_score: 预测得分 (整数)
    - analysis: 分析
    - optimization_suggestion: 提分建议
"""
    schema = {
        "total_score": 90,
        "win_probability": "高",
        "items": [{
            "item_name": "评分项1",
            "max_score": 10,
            "predicted_score": 8,
            "analysis": "分析内容",
            "optimization_suggestion": "建议内容"
        }]
    }
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ]
    
    response = await openai_service._generate_with_json_check(
        messages=messages,
        schema=schema,
        response_format={"type": "json_object"},
        log_prefix="Tool-Scoring"
    )
    
    data = json.loads(clean_json_string(response))
    return ScoringSimulationResponse(**data)

