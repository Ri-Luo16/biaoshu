/**
 * 投标分析与决策页面
 */
import React, { useState } from 'react';
import { 
  ChartBarIcon, 
  ShieldExclamationIcon, 
  CheckBadgeIcon, 
  BanknotesIcon,
  BuildingOfficeIcon,
  PlayCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { 
  parseTender, 
  analyzeRisk, 
  analyzeBid, 
  simulateScoring 
} from '../services/api';
import type { 
  TenderInfo, 
  RiskAnalysisResponse, 
  GoNoGoDecision, 
  ScoringSimulationResponse 
} from '../types';

interface BiddingAnalysisProps {
  fileContent: string;
  tenderInfo: TenderInfo | null;
  riskAnalysis: RiskAnalysisResponse | null;
  bidDecision: GoNoGoDecision | null;
  scoringSimulation: ScoringSimulationResponse | null;
  companyInfo: string;
  onUpdateTenderInfo: (info: TenderInfo) => void;
  onUpdateAnalysis: (data: { 
    riskAnalysis?: RiskAnalysisResponse;
    bidDecision?: GoNoGoDecision;
    scoringSimulation?: ScoringSimulationResponse;
  }) => void;
  onUpdateCompanyInfo: (info: string) => void;
}

export default function BiddingAnalysis({
  fileContent,
  tenderInfo,
  riskAnalysis,
  bidDecision,
  scoringSimulation,
  companyInfo,
  onUpdateTenderInfo,
  onUpdateAnalysis,
  onUpdateCompanyInfo
}: BiddingAnalysisProps) {
  const [parsing, setParsing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // 1. 解析招标文件
  const handleParseTender = async () => {
    if (!fileContent) {
      setError('未找到文件内容，请先在第一步上传文件');
      return;
    }
    setParsing(true);
    setError('');
    try {
      const info = await parseTender(fileContent);
      onUpdateTenderInfo(info);
    } catch (err: any) {
      setError(err.message || '解析失败');
    } finally {
      setParsing(false);
    }
  };

  // 2. 综合分析 (风险、决策、评分)
  const handleComprehensiveAnalysis = async () => {
    if (!tenderInfo) {
      setError('请先完成标书解析');
      return;
    }
    if (!companyInfo.trim()) {
      setError('请输入企业资质与优势信息，以便进行匹配分析');
      return;
    }
    
    setAnalyzing(true);
    setError('');
    
    try {
      // 并行执行三个分析任务
      const [riskRes, bidRes, scoreRes] = await Promise.all([
        analyzeRisk(fileContent),
        analyzeBid(tenderInfo, companyInfo),
        simulateScoring(tenderInfo, companyInfo)
      ]);

      onUpdateAnalysis({
        riskAnalysis: riskRes,
        bidDecision: bidRes,
        scoringSimulation: scoreRes
      });
    } catch (err: any) {
      setError(err.message || '分析过程发生错误');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <ChartBarIcon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">投标决策智能中台</h1>
          <p className="text-slate-500 mt-1">AI 辅助风险评估、Go/No-Go 决策与评分模拟</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* 步骤 1: 标书信息解析 */}
      <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" />
            项目基础信息
          </h2>
          {!tenderInfo && !parsing && (
            <button 
              onClick={handleParseTender}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-lg hover:bg-indigo-100 transition-colors"
            >
              开始提取信息
            </button>
          )}
        </div>

        {parsing && (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-3">
            <ArrowPathIcon className="w-6 h-6 animate-spin" />
            <span>正在提取结构化信息...</span>
          </div>
        )}

        {tenderInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard label="项目名称" value={tenderInfo.project_name} />
            <InfoCard label="项目编号" value={tenderInfo.project_number} />
            <InfoCard label="采购人" value={tenderInfo.purchaser} />
            <InfoCard label="预算金额" value={tenderInfo.budget} highlight />
            <InfoCard label="投标截止" value={tenderInfo.tender_deadline} />
            <InfoCard label="评标办法" value={tenderInfo.evaluation_method} />
            
            <div className="md:col-span-2 lg:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs font-bold text-slate-400 block mb-2">资格要求</span>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                {tenderInfo.qualifications?.map((q, i) => (
                  <li key={i}>{q}</li>
                )) || <li className="text-slate-400">未提取到明确资格要求</li>}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* 步骤 2: 企业信息输入 & 综合分析 */}
      <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
          <BuildingOfficeIcon className="w-5 h-5 text-emerald-600" />
          企业能力匹配与决策
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            请输入企业资质与核心优势 (用于匹配分析)
          </label>
          <textarea
            className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-slate-700 text-sm"
            placeholder="例如：具有建筑工程施工总承包一级资质，类似项目业绩5个，自有资金充足，拥有专业技术团队..."
            value={companyInfo}
            onChange={(e) => onUpdateCompanyInfo(e.target.value)}
          />
        </div>

        <div className="flex justify-end mb-8">
          <button
            onClick={handleComprehensiveAnalysis}
            disabled={analyzing || !tenderInfo}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${
              analyzing || !tenderInfo
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
            }`}
          >
            {analyzing ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                正在进行全维分析...
              </>
            ) : (
              <>
                <PlayCircleIcon className="w-5 h-5" />
                开始综合决策分析
              </>
            )}
          </button>
        </div>

        {/* 分析结果展示区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Go/No-Go 决策 */}
          <AnalysisCard title="Go/No-Go 决策" icon={CheckBadgeIcon} color="blue">
            {bidDecision ? (
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-4 rounded-xl ${bidDecision.decision ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  <span className="font-bold text-lg">{bidDecision.decision ? '建议投标 (GO)' : '建议放弃 (NO-GO)'}</span>
                  <span className="text-2xl font-black">{bidDecision.score}分</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{bidDecision.reasoning}</p>
                <div className="text-xs space-y-2">
                  <div className="font-bold text-emerald-600">有利因素:</div>
                  <ul className="list-disc list-inside text-slate-500">{bidDecision.pros.slice(0, 3).map((p,i)=> <li key={i}>{p}</li>)}</ul>
                  <div className="font-bold text-rose-600 mt-2">不利/缺失:</div>
                  <ul className="list-disc list-inside text-slate-500">{bidDecision.missing_capabilities.length > 0 ? bidDecision.missing_capabilities.map((c,i)=> <li key={i}>{c}</li>) : <li>无明显缺失</li>}</ul>
                </div>
              </div>
            ) : <EmptyState text="等待分析..." />}
          </AnalysisCard>

          {/* 2. 风险评估 */}
          <AnalysisCard title="风险评估" icon={ShieldExclamationIcon} color="rose">
            {riskAnalysis ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">整体风险等级</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    riskAnalysis.overall_risk === 'low' ? 'bg-emerald-100 text-emerald-700' :
                    riskAnalysis.overall_risk === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>{riskAnalysis.overall_risk}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3" title={riskAnalysis.summary}>
                  {riskAnalysis.summary}
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {riskAnalysis.risks.map((risk, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <div className="flex justify-between font-bold mb-1">
                        <span className="text-slate-700 line-clamp-1">{risk.clause}</span>
                        <span className={risk.level === 'high' ? 'text-rose-500' : 'text-amber-500'}>{risk.level}</span>
                      </div>
                      <p className="text-slate-500">{risk.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyState text="等待分析..." />}
          </AnalysisCard>

          {/* 3. 评分模拟 */}
          <AnalysisCard title="评分模拟" icon={BanknotesIcon} color="amber">
            {scoringSimulation ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="text-amber-800">
                    <div className="text-xs font-bold uppercase opacity-70">预测总分</div>
                    <div className="text-3xl font-black">{scoringSimulation.total_score}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-amber-800 uppercase opacity-70">中标概率</div>
                    <div className="text-lg font-bold text-amber-600">{scoringSimulation.win_probability}</div>
                  </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {scoringSimulation.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-2 border-b border-slate-50 last:border-0">
                      <span className="text-xs font-medium text-slate-700 truncate w-2/3" title={item.item_name}>{item.item_name}</span>
                      <span className="text-xs font-bold text-slate-900">{item.predicted_score} / {item.max_score}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyState text="等待分析..." />}
          </AnalysisCard>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value, highlight = false }: { label: string; value?: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
      <p className="text-xs font-bold text-slate-400 mb-1">{label}</p>
      <p className={`font-bold truncate ${highlight ? 'text-indigo-700 text-lg' : 'text-slate-800'}`}>
        {value || '-'}
      </p>
    </div>
  );
}

function AnalysisCard({ title, icon: Icon, children, color }: any) {
  const colorClass = {
    blue: 'text-indigo-600 bg-indigo-50',
    rose: 'text-rose-600 bg-rose-50',
    amber: 'text-amber-600 bg-amber-50',
  }[color as string] || 'text-slate-600 bg-slate-50';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-slate-800">{title}</h3>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-300 min-h-[150px]">
      <div className="w-12 h-12 rounded-full bg-slate-50 mb-2"></div>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

