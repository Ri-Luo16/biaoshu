import traceback
from fastapi import APIRouter, HTTPException, Depends
from app.agents.bidding_agent import BiddingAgent
from app.models.bidding import (
    ParseTenderRequest, TenderInfo, 
    RiskAnalysisResponse, AnalysisRequest, 
    GoNoGoDecision, ScoringSimulationResponse
)

router = APIRouter(
    prefix="/api/bidding",
    tags=["bidding-agent"],
    responses={404: {"description": "Not found"}},
)

# 依赖注入 BiddingAgent
def get_bidding_agent():
    return BiddingAgent()

@router.post("/parse", response_model=TenderInfo)
async def parse_tender(request: ParseTenderRequest, agent: BiddingAgent = Depends(get_bidding_agent)):
    """解析招标文件"""
    try:
        return await agent.parse_tender(request.file_content)
    except Exception as e:
        print(f"解析招标文件失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"解析失败: {str(e)}")

@router.post("/risk-analysis", response_model=RiskAnalysisResponse)
async def analyze_risk(request: ParseTenderRequest, agent: BiddingAgent = Depends(get_bidding_agent)):
    """风险分析"""
    try:
        return await agent.risk_analysis(request.file_content)
    except Exception as e:
        print(f"风险分析失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"风险分析失败: {str(e)}")

@router.post("/analyze-bid", response_model=GoNoGoDecision)
async def analyze_bid(request: AnalysisRequest, agent: BiddingAgent = Depends(get_bidding_agent)):
    """Go/No-Go 分析"""
    try:
        return await agent.analyze_bid(request.tender_info, request.company_info)
    except Exception as e:
        print(f"Go/No-Go 分析失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")

@router.post("/scoring-simulation", response_model=ScoringSimulationResponse)
async def scoring_simulation(request: AnalysisRequest, agent: BiddingAgent = Depends(get_bidding_agent)):
    """评分模拟"""
    try:
        return await agent.scoring_simulation(request.tender_info, request.company_info)
    except Exception as e:
        print(f"评分模拟失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"模拟失败: {str(e)}")

