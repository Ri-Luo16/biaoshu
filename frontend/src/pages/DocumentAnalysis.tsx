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
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
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

// 提取内容高亮显示的辅助组件
const HighlightedText = ({ text, highlight }: { text: string, highlight: string }) => {
  if (!highlight.trim()) return <pre className="whitespace-pre-wrap font-sans">{text}</pre>;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <pre className="whitespace-pre-wrap font-sans">
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() 
          ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{part}</mark> 
          : part
      )}
    </pre>
  );
};

// 技术要求渲染组件
const RequirementsView = ({ data, onJump }: { data: string, onJump: (keyword: string) => void }) => {
  if (!data || data.includes('正在解析')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-indigo-100 rounded-full blur-2xl animate-pulse"></div>
          <ArrowPathIcon className="w-16 h-16 animate-spin text-indigo-500 relative z-10" />
        </div>
        <p className="text-base font-bold text-slate-600">正在深入提取技术评分要求...</p>
        <p className="text-xs mt-2 text-slate-400">AI 正在逐条分析招标文件中的得分项</p>
      </div>
    );
  }

  const items = data.split(/(?=【评分项名称】：)/g).filter(item => item.trim() && item.includes('【评分项名称】：'));

  if (items.length === 0) {
    return (
      <div className="prose prose-indigo prose-base max-w-none bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <ReactMarkdown>{data}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.map((item, index) => {
        const name = item.match(/【评分项名称】：(.*?)(?=\n|【|$)/)?.[1] || '未提取名称';
        const weight = item.match(/【权重\/分值】：(.*?)(?=\n|【|$)/)?.[1] || '未提及';
        const standard = item.match(/【评分标准】：(.*?)(?=\n|【|$)/s)?.[1] || '未提及';
        const source = item.match(/【数据来源】：(.*?)(?=\n|【|$)/)?.[1] || '未提及';

        return (
          <div key={index} className="group bg-white border border-slate-200 rounded-[2rem] overflow-hidden transition-all duration-500 hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-100/50">
            <div className="flex flex-col md:flex-row min-h-[180px]">
              {/* 左侧艺术化分值区域 */}
              <div className="md:w-40 bg-gradient-to-br from-indigo-600 to-violet-700 p-6 flex flex-col items-center justify-center text-white relative overflow-hidden group-hover:from-indigo-500 group-hover:to-violet-600 transition-all duration-500">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] border-[1px] border-white rounded-full"></div>
                  <div className="absolute top-[10%] left-[10%] w-[80%] h-[80%] border-[1px] border-white rounded-full"></div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-70">Weight</span>
                <div className="flex items-baseline">
                  <span className="text-4xl font-black tracking-tighter tabular-nums">
                    {weight.replace(/[^0-9.]/g, '') || weight}
                  </span>
                  <span className="text-sm font-bold ml-1 opacity-80">
                    {weight.includes('%') ? '%' : '分'}
                  </span>
                </div>
              </div>
              
              {/* 右侧主内容 */}
              <div className="flex-1 p-8 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-6">
                    <h4 className="text-xl font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                      {name}
                    </h4>
                    <div className="px-4 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 shrink-0 uppercase tracking-widest">
                      Requirement {String(index + 1).padStart(2, '0')}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100/50 relative group/box">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-3 flex items-center gap-2">
                      <ScaleIcon className="w-4 h-4 text-indigo-400" />
                      Detailed Standard
                    </p>
                    <div className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                      {standard.trim()}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onJump(source)}
                  className="group/btn flex items-center gap-2 self-start px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50 transition-all hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-200 active:scale-95"
                >
                  <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-indigo-600 group-hover/btn:bg-indigo-500 group-hover/btn:text-white transition-colors">
                    <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold">数据溯源：{source}</span>
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 opacity-0 group-hover/btn:opacity-100 transition-all -translate-x-2 group-hover/btn:translate-x-0" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 结构化分析渲染组件
const StructuralView = ({ data, onJump }: { data: string, onJump: (keyword: string) => void }) => {
  try {
    const cleanJson = data.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!cleanJson.startsWith('{')) {
        throw new Error('Not a JSON object');
    }
    const parsed: StructuralAnalysis = JSON.parse(cleanJson);

    const SourceTag = ({ label, icon: Icon, color }: { label: string, icon: any, color: string }) => (
      <button 
        onClick={() => onJump(label)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all active:scale-95 text-left group/tag ${color}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs font-bold truncate max-w-[150px]">{label}</span>
        <ArrowTopRightOnSquareIcon className="w-3 h-3 opacity-0 group-hover/tag:opacity-100 transition-opacity" />
      </button>
    );

    return (
      <div className="space-y-8">
        {/* 资格要求 */}
        {parsed.qualification?.length > 0 && (
          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
            <h4 className="text-lg font-black text-slate-800 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <ShieldCheckIcon className="w-6 h-6" />
              </div>
              资格条件要求
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {parsed.qualification.map((item, i) => (
                <div key={i} className="group bg-slate-50 hover:bg-blue-50/50 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <span className="text-sm text-slate-700 font-medium leading-relaxed">{item}</span>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <SourceTag 
                      label={item.slice(0, 10)} 
                      icon={MagnifyingGlassIcon} 
                      color="bg-white border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 评分标准 */}
        {parsed.scoring_criteria && Object.keys(parsed.scoring_criteria).length > 0 && (
          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
            <h4 className="text-lg font-black text-slate-800 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <ScaleIcon className="w-6 h-6" />
              </div>
              评分权重分布
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(parsed.scoring_criteria).map(([key, val], i) => (
                <div key={i} className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-5 rounded-3xl border border-amber-100 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-20 rotate-45 translate-x-8 translate-y-[-2rem]"></div>
                  <p className="text-[10px] text-amber-600 font-black uppercase tracking-wider mb-1">{key}</p>
                  <p className="text-2xl font-black text-amber-900 tabular-nums">
                    {val}{typeof val === 'number' ? <span className="text-xs ml-0.5 font-bold">分</span> : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 技术条款 */}
        {parsed.technical_requirements?.length > 0 && (
          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
            <h4 className="text-lg font-black text-slate-800 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <CpuChipIcon className="w-6 h-6" />
              </div>
              核心技术参数 (★为必须满足)
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {parsed.technical_requirements.map((req, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                  <div className="flex items-center gap-3">
                    {req.mandatory ? (
                      <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-white text-indigo-400 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                        <CheckCircleIcon className="w-5 h-5" />
                      </div>
                    )}
                    <span className="text-sm font-bold text-slate-800">{req.item}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-4 py-1.5 bg-white text-indigo-600 font-mono text-sm font-black rounded-xl border border-indigo-100 shadow-sm">
                      {req.value}
                    </span>
                    <SourceTag 
                      label={req.item} 
                      icon={MagnifyingGlassIcon} 
                      color="bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 隐性需求 */}
          {parsed.implicit_needs?.length > 0 && (
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
              <h4 className="text-lg font-black text-emerald-800 flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <LightBulbIcon className="w-6 h-6" />
                </div>
                隐性需求挖掘
              </h4>
              <div className="space-y-3">
                {parsed.implicit_needs.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                    <span className="text-emerald-500 font-black text-lg mt-[-2px]">#</span>
                    <span className="text-sm text-emerald-900 font-medium leading-relaxed italic">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 风险点 */}
          {parsed.risk_flags?.length > 0 && (
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
              <h4 className="text-lg font-black text-rose-800 flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6" />
                </div>
                关键风险提示
              </h4>
              <div className="space-y-3">
                {parsed.risk_flags.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-rose-50/30 rounded-2xl border border-rose-100/50">
                    <div className="w-2 h-2 bg-rose-500 rounded-full mt-1.5 shrink-0 animate-pulse"></div>
                    <span className="text-sm text-rose-900 font-bold leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (e) {
    return (
      <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap bg-white p-8 rounded-[2rem] border border-slate-200">
        <ReactMarkdown>{data}</ReactMarkdown>
      </div>
    );
  }
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
  
  // 溯源展示相关状态
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [sourceKeyword, setSourceKeyword] = useState('');

  const handleJumpToSource = (keyword: string) => {
    // 处理 AI 返回的定位信息，去除括号和常用前缀
    const cleanKeyword = keyword.replace(/[()（）【】]/g, '').replace(/来源：|定位：|第|条|章|页/g, ' ').trim().split(' ')[0];
    setSourceKeyword(cleanKeyword);
    setIsSourceOpen(true);
  };

  // 这里的优先级是：优先使用刚上传的本地状态，如果没有则使用从父组件传入的初始状态
  const displayFilename = localFilename || initialFilename;
  const currentFileContent = localFileContent || initialFileContent;
  const currentFileUrl = localFileUrl || initialFileUrl;

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
            
            <div className={`relative group border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ${
              displayFilename ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-300 bg-slate-50/50'
            }`}>
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.bmp,.webp"
                onChange={handleFileChange}
                disabled={uploading || analyzing}
              />
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                  displayFilename ? 'bg-white text-emerald-600' : 'bg-white text-slate-400'
                }`}>
                  {uploading ? (
                    <ArrowPathIcon className="w-7 h-7 animate-spin text-indigo-600" />
                  ) : (
                    <CloudArrowUpIcon className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">
                    {displayFilename || '点击或拖拽上传'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">PDF / Word / 图片格式</p>
                </div>
                {displayFilename && (
                  <div className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                    Ready
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
              {/* 标签页头部 */}
              <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1">
                {[
                  { id: 'overview', name: '项目概况', icon: DocumentTextIcon },
                  { id: 'requirements', name: '技术要求', icon: SparklesIcon },
                  { id: 'structural', name: '结构化分析', icon: ListBulletIcon },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {tab.name}
                  </button>
                ))}
              </div>

              {/* 内容区域 */}
              <div className="flex-1 p-8 overflow-y-auto max-h-[700px] custom-scrollbar">
                {activeTab === 'overview' && (
                  <div className={`prose prose-indigo prose-base max-w-none bg-white p-8 rounded-3xl border border-slate-100 shadow-sm ${analyzing && !projectOverview ? 'animate-pulse' : ''}`}>
                    <div className="flex items-center gap-3 mb-6 not-prose border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <DocumentTextIcon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 m-0">项目背景与概述</h3>
                    </div>
                    <ReactMarkdown>{overviewText || projectOverview || '正在为您梳理项目全局背景...'}</ReactMarkdown>
                  </div>
                )}
                
                {activeTab === 'requirements' && (
                  <div className={analyzing && !techRequirements ? 'animate-pulse' : ''}>
                    <RequirementsView data={requirementsText || techRequirements} onJump={handleJumpToSource} />
                  </div>
                )}

                {activeTab === 'structural' && (
                  <div className={analyzing && !structuralAnalysis ? 'animate-pulse' : ''}>
                    {structuralText || structuralAnalysis ? (
                      <StructuralView data={structuralText || structuralAnalysis} onJump={handleJumpToSource} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <ArrowPathIcon className="w-10 h-10 animate-spin mb-4 opacity-20" />
                        <p className="text-sm">正在深度挖掘结构化要点...</p>
                      </div>
                    )}
                  </div>
                )}
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
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Processing</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 p-12 text-center bg-white/50">
              <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                <DocumentTextIcon className="w-12 h-12 opacity-20" />
              </div>
              <p className="text-xl font-bold text-slate-400">准备好开始了吗？</p>
              <p className="text-sm mt-2 max-w-xs leading-relaxed">
                请在左侧面板上传您的招标文件（PDF/Word），AI 助手将瞬间为您拆解项目核心要点。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 数据溯源侧边栏 */}
      <Transition.Root show={isSourceOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setIsSourceOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-500"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-500"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-500 sm:duration-700"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-500 sm:duration-700"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl">
                    <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl">
                      <div className="px-6 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <MagnifyingGlassIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <Dialog.Title className="text-lg font-black text-slate-800">数据溯源定位</Dialog.Title>
                            <p className="text-xs text-slate-500 font-medium">正在原文中检索：<span className="text-indigo-600">"{sourceKeyword}"</span></p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-white transition-all"
                          onClick={() => setIsSourceOpen(false)}
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>
                      
                      <div className="relative flex-1 p-8">
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex gap-3">
                          <SparklesIcon className="w-5 h-5 text-amber-500 shrink-0" />
                          <p className="text-xs text-amber-800 leading-relaxed font-medium">
                            AI 已为您自动定位至原文段落。黄色高亮部分为相关关键词，您可以对照原文核实分析结果的准确性。
                          </p>
                        </div>

                        <div className="prose prose-slate max-w-none">
                          {currentFileUrl && currentFileUrl.toLowerCase().endsWith('.pdf') ? (
                            <div className="w-full h-[600px] border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 relative group">
                              <iframe
                                src={`${currentFileUrl}#search=${encodeURIComponent(sourceKeyword)}`}
                                className="w-full h-full"
                                title="文档预览"
                              />
                              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a 
                                  href={currentFileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white flex items-center gap-2"
                                >
                                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                  新窗口打开
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 font-mono text-[13px] leading-loose text-slate-600 shadow-inner overflow-x-auto custom-scrollbar">
                              <HighlightedText text={currentFileContent} highlight={sourceKeyword} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end sticky bottom-0">
                        <button
                          type="button"
                          className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                          onClick={() => setIsSourceOpen(false)}
                        >
                          关闭预览
                        </button>
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}

