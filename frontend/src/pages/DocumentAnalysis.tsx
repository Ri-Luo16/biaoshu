/**
 * 文档分析页面
 */
import React, { useState, useCallback } from 'react';
import { 
  CloudArrowUpIcon, 
  SparklesIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ListBulletIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  ScaleIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { uploadDocument, analyzeDocumentOverview, analyzeDocumentRequirements, analyzeDocumentStructural } from '../services/api';
import type { StructuralAnalysis } from '../types';

interface DocumentAnalysisProps {
  filename: string;
  fileContent: string;
  fileUrl: string;
  projectOverview: string;
  techRequirements: string;
  structuralAnalysis: string;
  onFileUpload: (filename: string, content: string, fileUrl: string) => void;
  onAnalysisComplete: (projectOverview: string, techRequirements: string, structuralAnalysis: string) => void;
}

// 技术要求渲染组件
const RequirementsView = ({ data }: { data: string }) => {
  if (!data || data.includes('正在解析')) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-100 rounded-full blur-3xl animate-pulse"></div>
          <ArrowPathIcon className="w-20 h-20 animate-spin text-indigo-500 relative z-10 opacity-20" />
        </div>
        <p className="text-lg font-bold text-slate-500">正在提取技术评分项...</p>
        <p className="text-sm mt-2 text-slate-400">AI 正在逐条核对招标文件中的得分细则</p>
      </div>
    );
  }

  const items = data.split(/(?=【评分项名称】：)/g).filter(item => item.trim() && item.includes('【评分项名称】：'));

  if (items.length === 0) {
    return (
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 leading-relaxed text-slate-700 prose prose-indigo max-w-none" translate="no">
        <ReactMarkdown>{data}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8">
      {items.map((item, index) => {
        const name = item.match(/【评分项名称】：(.*?)(?=\n|【|$)/)?.[1] || '未提取名称';
        const weight = item.match(/【权重\/分值】：(.*?)(?=\n|【|$)/)?.[1] || '0';
        const standard = item.match(/【评分标准】：(.*?)(?=\n|【|$)/s)?.[1] || '未提及';

        return (
          <div key={`req-${index}`} className="group bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-100/30">
            <div className="flex flex-col md:flex-row">
              {/* 左侧分值区域 */}
              <div className="md:w-48 bg-slate-50 p-8 flex flex-col items-center justify-center border-r border-slate-100 group-hover:bg-indigo-50 transition-colors duration-500">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-slate-400">章节得分</span>
                <div className="relative flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {weight.replace(/[^0-9.]/g, '') || '0'}
                  </span>
                  <span className="text-sm font-bold text-slate-400 group-hover:text-indigo-400 transition-colors">
                    {weight.includes('%') ? '%' : '分'}
                  </span>
                </div>
              </div>
              
              {/* 右侧内容区域 */}
              <div className="flex-1 p-10">
                <div className="flex items-start justify-between gap-6 mb-6">
                  <h4 className="text-xl font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                    {name}
                  </h4>
                  <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 border border-indigo-100">
                    要求-{String(index + 1).padStart(2, '0')}
                  </div>
                </div>
                
                <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 group-hover:bg-white group-hover:border-indigo-100 transition-all duration-500">
                  <div className="flex items-center gap-2 mb-3">
                    <ScaleIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">评分标准</span>
                  </div>
                  <div className="text-[15px] text-slate-600 leading-relaxed font-medium">
                    {standard.trim()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 结构化分析渲染组件
const StructuralView = ({ data }: { data: string }) => {
  const [lastValidParsed, setLastValidParsed] = useState<StructuralAnalysis | null>(null);

  React.useEffect(() => {
    try {
      const cleanJson = data.replace(/```json/g, '').replace(/```/g, '').trim();
      if (cleanJson.startsWith('{')) {
        const parsed = JSON.parse(cleanJson);
        setLastValidParsed(parsed);
      }
    } catch (e) {
      // 忽略解析错误，保持上一个有效的解析结果
    }
  }, [data]);

  if (!lastValidParsed) {
    return (
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
        <ReactMarkdown>{data}</ReactMarkdown>
      </div>
    );
  }

  const parsed = lastValidParsed;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
        {/* 第一层：关键指标看板 - 极简排版 */}
        {parsed.project_summary && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400">项目预算</p>
              <p className="text-xl font-black text-slate-900 truncate" title={parsed.project_summary.budget}>{parsed.project_summary.budget || '未明确预算'}</p>
            </div>
            <div className="space-y-1 border-l border-slate-100 pl-6">
              <p className="text-xs font-bold text-slate-400">强制条款</p>
              <p className="text-xl font-black text-rose-600 tabular-nums">{parsed.project_summary.mandatory_count} <span className="text-xs font-normal text-slate-400">项</span></p>
            </div>
            <div className="space-y-1 border-l border-slate-100 pl-6">
              <p className="text-xs font-bold text-slate-400">资质门槛</p>
              <p className="text-xl font-black text-amber-600 tabular-nums">{parsed.project_summary.qualification_count} <span className="text-xs font-normal text-slate-400">个</span></p>
            </div>
            <div className="space-y-1 border-l border-slate-100 pl-6">
              <p className="text-xs font-bold text-slate-400">总分分值</p>
              <p className="text-xl font-black text-indigo-600 tabular-nums">{parsed.project_summary.total_score}</p>
            </div>
          </div>
        )}

        {/* 第二层：项目核心洞察 - 重点突出 */}
        {(parsed.executive_summary || (parsed.action_items && parsed.action_items.length > 0)) && (
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl translate-x-32 translate-y-[-32px]"></div>
            
            {parsed.executive_summary && (
              <div className="relative z-10 mb-8">
                <div className="flex items-center gap-2 text-indigo-400 mb-3">
                  <SparklesIcon className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-300">核心洞察 / 智能分析</span>
                </div>
                <p className="text-xl font-medium leading-relaxed tracking-tight text-indigo-50">
                  {parsed.executive_summary}
                </p>
              </div>
            )}

            {parsed.action_items && parsed.action_items.length > 0 && (
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                {parsed.action_items.map((item, i) => (
                  <div key={`action-${i}-${item.substring(0, 20)}`} className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">{i+1}</span>
                    <span className="text-sm font-bold text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 第三层：分类详细需求 (两列式清晰布局) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 🔴 废标风险与预警 - 列表式 */}
          {(parsed.technical_requirements?.some(r => r.mandatory) || (parsed.risk_flags && parsed.risk_flags.length > 0)) && (
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
              <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-rose-600" />
                <h4 className="text-sm font-black text-rose-900">废标风险与强制项</h4>
              </div>
              <div className="p-2 space-y-1">
                {parsed.technical_requirements?.filter(r => r.mandatory).map((req, i) => (
                  <div key={`mandatory-${req.item}`} className="p-4 hover:bg-slate-50 rounded-2xl transition-colors flex justify-between items-start gap-4 border border-transparent hover:border-slate-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-rose-600 px-1.5 py-0.5 bg-rose-50 rounded">★ 强制</span>
                        <p className="text-sm font-bold text-slate-800">{req.item}</p>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{typeof req.value === 'object' ? JSON.stringify(req.value) : req.value}</p>
                    </div>
                  </div>
                ))}
                {parsed.risk_flags?.map((risk, i) => (
                  <div key={`risk-${i}-${String(risk).substring(0, 20)}`} className="mx-2 p-3 bg-rose-50/30 rounded-xl flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 shrink-0 animate-pulse"></div>
                    <span className="text-xs text-rose-900 font-medium leading-relaxed">{typeof risk === 'object' ? JSON.stringify(risk) : risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🟡 核心资质门槛 */}
          {parsed.qualification?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-amber-600" />
                <h4 className="text-sm font-black text-amber-900">核心资质门槛</h4>
              </div>
              <div className="p-2 space-y-1">
                {parsed.qualification.map((item, i) => (
                  <div key={`qual-${i}-${String(item).substring(0, 20)}`} className="p-4 hover:bg-slate-50 rounded-2xl transition-colors flex justify-between items-center gap-4 border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black shrink-0">{i+1}</div>
                      <span className="text-sm font-bold text-slate-700 leading-snug">{typeof item === 'object' ? JSON.stringify(item) : item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🔵 评分权重概览 */}
          {parsed.scoring_criteria && Object.keys(parsed.scoring_criteria).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                <ScaleIcon className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-black text-indigo-900">评分权重概览</h4>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                {Object.entries(parsed.scoring_criteria).map(([key, val], i) => (
                  <div key={`score-${key}`} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-bold mb-1">{key}</p>
                    <p className="text-lg font-black text-indigo-900">
                      {typeof val === 'object' ? '详见表单' : val}
                      {typeof val === 'number' && <span className="text-[10px] ml-0.5 opacity-50">分</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🟢 隐性需求策略 */}
          {parsed.implicit_needs?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                <LightBulbIcon className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-black text-emerald-900">加分策略与隐性需求</h4>
              </div>
              <div className="p-4 space-y-2">
                {parsed.implicit_needs.map((need, i) => (
                  <div key={`need-${i}-${String(need).substring(0, 20)}`} className="flex items-center gap-3 p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/50">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></div>
                    <span className="text-xs text-emerald-900 font-bold italic leading-relaxed">{typeof need === 'object' ? JSON.stringify(need) : need}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 详细技术要求 */}
        {parsed.technical_requirements?.some(r => !r.mandatory) && (
          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <CpuChipIcon className="w-5 h-5 text-slate-600" />
              <h4 className="text-sm font-black text-slate-900">一般技术需求详情</h4>
            </div>
            <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
              {parsed.technical_requirements.filter(r => !r.mandatory).map((req, i) => (
                <div key={`tech-${req.item}`} className="p-4 hover:bg-slate-50 rounded-2xl transition-all flex justify-between items-start gap-4 border border-transparent hover:border-slate-100">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-sm font-bold text-slate-800 leading-snug">{req.item}</span>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">{typeof req.value === 'object' ? '复杂参数' : req.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
};

export default function DocumentAnalysis({
  filename: initialFilename,
  fileContent: initialFileContent,
  fileUrl: initialFileUrl,
  projectOverview,
  techRequirements,
  structuralAnalysis,
  onFileUpload,
  onAnalysisComplete,
}: DocumentAnalysisProps) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [localFilename, setLocalFilename] = useState('');
  const [localFileContent, setLocalFileContent] = useState('');
  const [localFileUrl, setLocalFileUrl] = useState('');
  const [error, setError] = useState('');
  const [overviewText, setOverviewText] = useState('');
  const [requirementsText, setRequirementsText] = useState('');
  const [structuralText, setStructuralText] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'structural'>('overview');
  
  // 这里的优先级是：优先使用刚上传的本地状态，如果没有则使用从父组件传入的初始状态
  const displayFilename = localFilename || initialFilename;
  const currentFileContent = localFileContent || initialFileContent;

  // 文件上传处理
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const response = await uploadDocument(file);
      if (response.success) {
        const newFilename = response.filename || file.name;
        const newContent = response.file_content || '';
        const newFileUrl = response.file_url || '';
        
        if (!newContent) {
          setError('文件上传成功，但未能提取到文字内容。请确保文件不是纯图片扫描件或加密文档。');
          return;
        }
        
        setLocalFilename(newFilename);
        setLocalFileContent(newContent);
        setLocalFileUrl(newFileUrl);
        onFileUpload(newFilename, newContent, newFileUrl);
      } else {
        setError(response.message || '文件上传失败');
      }
    } catch (err: any) {
      setError(err.message || '文件上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 分析文档
  const handleAnalyze = useCallback(async () => {
    if (!currentFileContent) {
      setError('未能获取到文件内容。如果文件已显示“就绪”，请尝试重新上传或检查文件是否损坏。');
      return;
    }

    setAnalyzing(true);
    setError('');
    setOverviewText('');
    setRequirementsText('');
    setStructuralText('');

    try {
      let overviewComplete = false;
      let requirementsComplete = false;
      let structuralComplete = false;
      let tempOverview = '';
      let tempRequirements = '';
      let tempStructural = '';

      const checkAllComplete = () => {
        if (overviewComplete && requirementsComplete && structuralComplete) {
          onAnalysisComplete(tempOverview, tempRequirements, tempStructural);
          setAnalyzing(false);
        }
      };

      analyzeDocumentOverview(
        currentFileContent,
        (chunk) => {
          tempOverview += chunk;
          setOverviewText(tempOverview);
        },
        () => {
          overviewComplete = true;
          checkAllComplete();
        },
        (error) => {
          setError(`分析项目概述失败: ${error.message}`);
          setAnalyzing(false);
        }
      );

      analyzeDocumentRequirements(
        currentFileContent,
        (chunk) => {
          tempRequirements += chunk;
          setRequirementsText(tempRequirements);
        },
        () => {
          requirementsComplete = true;
          checkAllComplete();
        },
        (error) => {
          setError(`分析技术要求失败: ${error.message}`);
          setAnalyzing(false);
        }
      );

      analyzeDocumentStructural(
        currentFileContent,
        (chunk) => {
          tempStructural += chunk;
          setStructuralText(tempStructural);
        },
        () => {
          structuralComplete = true;
          checkAllComplete();
        },
        (error) => {
          setError(`结构化分析失败: ${error.message}`);
          setAnalyzing(false);
        }
      );
    } catch (err: any) {
      setError(err.message || '文档分析失败');
      setAnalyzing(false);
    }
  }, [currentFileContent, onAnalysisComplete]);

  return (
    <div className="p-8 space-y-8">
      {/* 头部引导 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <SparklesIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">标书智能解析</h1>
            <p className="text-slate-500 mt-1">上传招标文件，AI 将自动提取核心需求和项目概况</p>
          </div>
        </div>
        
        {displayFilename && !analyzing && (
          <button
            onClick={handleAnalyze}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 group"
          >
            <SparklesIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            开始 AI 深度解析
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 左侧控制面板 */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
          {/* 上传卡片 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CloudArrowUpIcon className="w-4 h-4 text-indigo-600" />
              文档上传
            </h3>
            
            <div className={`relative group border-[3px] border-dashed rounded-[2rem] p-10 transition-all duration-500 overflow-hidden ${
              displayFilename 
                ? 'border-emerald-200 bg-emerald-50/20' 
                : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/10'
            }`}>
              {/* 背景装饰动效 */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-indigo-500/0 via-transparent to-indigo-500/0 group-hover:from-indigo-500/5 transition-all duration-1000 rotate-12 translate-x-[-10%]"></div>
              </div>

              <input
                id="file-upload"
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.bmp,.webp"
                onChange={handleFileChange}
                disabled={uploading || analyzing}
              />
              
              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                <div className={`w-20 h-20 rounded-3xl shadow-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                  displayFilename ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-slate-400 shadow-slate-200'
                }`}>
                  {uploading ? (
                    <ArrowPathIcon className="w-10 h-10 animate-spin" />
                  ) : displayFilename ? (
                    <CheckCircleIcon className="w-10 h-10" />
                  ) : (
                    <CloudArrowUpIcon className="w-10 h-10" />
                  )}
                </div>
                <div>
                  <p className={`text-base font-black transition-colors duration-300 ${displayFilename ? 'text-emerald-700' : 'text-slate-800'}`}>
                    {displayFilename || '选择招标文件'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-bold">支持 PDF / Word / 图片格式</p>
                </div>
                
                {displayFilename && !uploading && (
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest animate-in fade-in zoom-in">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    等待分析
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3">
                <ExclamationCircleIcon className="w-5 h-5 text-rose-500 shrink-0" />
                <p className="text-xs text-rose-700 leading-relaxed font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* AI 指南 */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <SparklesIcon className="w-4 h-4" />
              解析说明
            </h3>
            <ul className="space-y-4">
              {[
                { title: '多维度提取', desc: '自动分析项目概况、技术要求和详细分值。' },
                { title: '结构化解析', desc: '深度挖掘资格要求和潜在风险点。' },
                { title: '行业适配', desc: '根据不同行业特性自动调整解析权重。' }
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-100">{item.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 右侧解析结果 */}
        <div className="lg:col-span-8 flex flex-col min-h-[600px]">
          {(projectOverview || overviewText || analyzing) ? (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-full">
              {/* 标签页头部 - 优化为胶囊式切换 */}
              <div className="px-6 pt-6 pb-2">
                <div className="flex p-1 gap-1 bg-slate-100 rounded-2xl w-fit">
                  {[
                    { id: 'overview', name: '项目概况', icon: DocumentTextIcon },
                    { id: 'requirements', name: '评分要求', icon: SparklesIcon },
                    { id: 'structural', name: '结构化看板', icon: ListBulletIcon },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 py-2 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${
                        activeTab === tab.id
                          ? 'bg-white text-indigo-600 shadow-md translate-y-[-1px]'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                      }`}
                    >
                      <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 内容区域 - 增加统一的内容包裹层 */}
              <div className="flex-1 p-8 overflow-y-auto max-h-[750px] custom-scrollbar bg-white/50">
                <div className="max-w-5xl mx-auto">
                  {activeTab === 'overview' && (
                    <div className={`bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 ${analyzing && !projectOverview ? 'animate-pulse' : ''}`}>
                      <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                          <DocumentTextIcon className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-800">项目背景与深度摘要</h3>
                          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">项目全局背景概览</p>
                        </div>
                      </div>
                      <div className="prose prose-indigo prose-lg max-w-none text-slate-700 leading-relaxed" translate="no">
                        <ReactMarkdown>{overviewText || projectOverview || '正在为您梳理项目全局背景...'}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'requirements' && (
                    <div className={analyzing && !techRequirements ? 'animate-pulse' : ''}>
                      <RequirementsView data={requirementsText || techRequirements} />
                    </div>
                  )}

                  {activeTab === 'structural' && (
                    <div className={analyzing && !structuralAnalysis ? 'animate-pulse' : ''}>
                      {structuralAnalysis || structuralText ? (
                        <StructuralView data={structuralText || structuralAnalysis} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                          <div className="relative mb-8">
                            <div className="absolute inset-0 bg-indigo-100 rounded-full blur-3xl animate-pulse"></div>
                            <ArrowPathIcon className="w-20 h-20 animate-spin text-indigo-500 relative z-10 opacity-20" />
                          </div>
                          <p className="text-lg font-bold text-slate-500">正在进行多维结构化解析...</p>
                          <p className="text-sm mt-2 text-slate-400">AI 正在为您提取核心资质、技术红线及隐性需求</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 底部状态提示 */}
              {analyzing && (
                <div className="px-8 py-3 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-xs font-bold text-indigo-700">AI 正在全力解析中，请稍候</span>
                  </div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">处理中</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden bg-white rounded-[3.5rem] border border-slate-100 shadow-sm">
              {/* 背景修饰 */}
              <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600 rounded-full blur-[100px]"></div>
              </div>

              <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] shadow-inner flex items-center justify-center mb-10 mx-auto group">
                  <DocumentTextIcon className="w-16 h-16 text-slate-200 transition-all duration-500 group-hover:scale-110 group-hover:text-indigo-100" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">准备好开始智能解析了吗？</h3>
                <p className="text-lg text-slate-400 max-w-lg leading-relaxed font-medium mb-10">
                  请点击下方按钮或在左侧面板上传您的招标文件（PDF/Word），AI 助手将瞬间为您拆解项目核心要点、技术红线及隐性得分项。
                </p>
                
                <label 
                  htmlFor="file-upload"
                  className="inline-flex items-center justify-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 cursor-pointer group"
                >
                  <CloudArrowUpIcon className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                  立即上传招标文件
                </label>
                
                <div className="mt-16 flex items-center justify-center gap-8">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm mb-2">1</div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">上传文件</span>
                  </div>
                  <div className="w-12 h-[2px] bg-slate-100 mt-[-20px]"></div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 font-black text-sm mb-2">2</div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">深度解析</span>
                  </div>
                  <div className="w-12 h-[2px] bg-slate-100 mt-[-20px]"></div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 font-black text-sm mb-2">3</div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">生成目录</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
