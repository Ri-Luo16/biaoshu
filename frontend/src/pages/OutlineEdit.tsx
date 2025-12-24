/**
 * 目录编辑页面
 */
import React, { useState, useCallback, useMemo } from 'react';
import { 
  DocumentTextIcon, 
  PlusIcon,
  ArrowPathIcon,
  SparklesIcon,
  ListBulletIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  CloudArrowUpIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { generateOutlineStream, generateChapterContentStream, uploadExpandDocument } from '../services/api';
import type { OutlineItem, ProjectType } from '../types';

interface OutlineEditProps {
  projectOverview: string;
  techRequirements: string;
  outlineData: OutlineItem[];
  onOutlineGenerated: (outline: OutlineItem[] | ((prev: OutlineItem[]) => OutlineItem[])) => void;
}

export default function OutlineEdit({
  projectOverview,
  techRequirements,
  outlineData,
  onOutlineGenerated,
}: OutlineEditProps) {
  const [generating, setGenerating] = useState(false);
  const [generatingContent, setGeneratingContent] = useState<Set<string>>(new Set());
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['1', '2', '3']));
  
  // 新增状态：项目类型和扩写文件
  const [projectType, setProjectType] = useState<ProjectType>('general');
  const [uploadingExpand, setUploadingExpand] = useState(false);
  const [expandFileData, setExpandFileData] = useState<{
    uploaded: boolean;
    oldOutline: string | null;
    filename: string | null;
  }>({
    uploaded: false,
    oldOutline: null,
    filename: null
  });

  // 统计信息
  const stats = useMemo(() => {
    let totalChapters = 0;
    let generatedContent = 0;
    const leafNodes: Array<{item: OutlineItem, parents: OutlineItem[], siblings: OutlineItem[]}> = [];

    const traverse = (items: OutlineItem[], parents: OutlineItem[] = []) => {
      items.forEach(item => {
        totalChapters++;
        if (item.content) generatedContent++;
        
        if (!item.children || item.children.length === 0) {
          const siblings = items.filter(i => i.id !== item.id);
          leafNodes.push({ item, parents, siblings });
        } else {
          traverse(item.children, [...parents, item]);
        }
      });
    };

    traverse(outlineData);
    return { totalChapters, generatedContent, leafNodes };
  }, [outlineData]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 扩写文件上传处理
  const handleExpandFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingExpand(true);
    setError('');

    try {
      const response = await uploadExpandDocument(file);
      if (response.success) {
        setExpandFileData({
          uploaded: true,
          oldOutline: response.old_outline || null,
          filename: response.filename || file.name
        });
      } else {
        setError(response.message || '扩写文件上传失败');
      }
    } catch (err: any) {
      setError(err.message || '扩写文件上传失败');
    } finally {
      setUploadingExpand(false);
    }
  };

  // 生成目录
  const handleGenerateOutline = useCallback(async () => {
    if (!projectOverview || !techRequirements) {
      setError('请先完成文档分析');
      return;
    }

    setGenerating(true);
    setError('');

    let buffer = '';
    generateOutlineStream(
      projectOverview,
      techRequirements,
      projectType,
      expandFileData.uploaded,
      expandFileData.oldOutline,
      (chunk) => {
        buffer += chunk;
      },
      () => {
        try {
          // 清理 buffer 中可能存在的 sse 数据前缀
          const cleanedBuffer = buffer.trim();
          const outline = JSON.parse(cleanedBuffer);
          if (outline && outline.outline) {
            onOutlineGenerated(outline.outline);
            // 默认展开一级目录
            setExpandedItems(new Set(outline.outline.map((i: any) => i.id)));
          }
        } catch (err: any) {
          setError('目录解析失败: ' + err.message);
        }
        setGenerating(false);
      },
      (error) => {
        setError(error.message || '目录生成失败');
        setGenerating(false);
      }
    );
  }, [projectOverview, techRequirements, projectType, expandFileData, onOutlineGenerated]);

  // 生成单个章节内容
  const handleGenerateContent = useCallback((item: OutlineItem, parentItems: OutlineItem[] = [], siblings: OutlineItem[] = []) => {
    return new Promise<void>((resolve, reject) => {
      setGeneratingContent((prev) => new Set(prev).add(item.id));
      setError('');

      generateChapterContentStream(
        { id: item.id, title: item.title, description: item.description },
        parentItems.map(p => ({ id: p.id, title: p.title, description: p.description })),
        siblings.map(s => ({ id: s.id, title: s.title, description: s.description })),
        projectOverview,
        (_chunk, fullContent) => {
          onOutlineGenerated((prevData) => {
            const update = (items: OutlineItem[]): OutlineItem[] => {
              return items.map((i) => {
                if (i.id === item.id) return { ...i, content: fullContent };
                if (i.children) return { ...i, children: update(i.children) };
                return i;
              });
            };
            return update(prevData);
          });
        },
        (content) => {
          onOutlineGenerated((prevData) => {
            const update = (items: OutlineItem[]): OutlineItem[] => {
              return items.map((i) => {
                if (i.id === item.id) return { ...i, content };
                if (i.children) return { ...i, children: update(i.children) };
                return i;
              });
            };
            return update(prevData);
          });
          setGeneratingContent((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          resolve();
        },
        (error) => {
          setError(`生成内容失败 (${item.title}): ${error.message}`);
          setGeneratingContent((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          reject(error);
        }
      );
    });
  }, [projectOverview, onOutlineGenerated]);

  // 一键生成所有正文（3线程并发）
  const handleGenerateAllContent = useCallback(async () => {
    if (stats.leafNodes.length === 0) return;
    
    setIsBatchGenerating(true);
    setError('');
    
    // 只生成还没有内容的章节
    const queue = stats.leafNodes.filter(node => !node.item.content || node.item.content.length < 10);
    
    if (queue.length === 0) {
      if (window.confirm('所有章节都已有内容，是否全部重新生成？')) {
        queue.push(...stats.leafNodes);
      } else {
        setIsBatchGenerating(false);
        return;
      }
    }

    const concurrencyLimit = 3;
    const taskQueue = [...queue];
    
    const worker = async () => {
      while (taskQueue.length > 0) {
        const task = taskQueue.shift();
        if (!task) break;
        try {
          await handleGenerateContent(task.item, task.parents, task.siblings);
        } catch (err) {
          console.error(`Batch generation error for chapter ${task.item.id}:`, err);
        }
      }
    };

    // 启动3个并发 worker
    const workers = [];
    for (let i = 0; i < Math.min(concurrencyLimit, taskQueue.length); i++) {
      workers.push(worker());
    }

    await Promise.all(workers);
    setIsBatchGenerating(false);
  }, [stats.leafNodes, handleGenerateContent]);

  // 递归渲染目录项
  const renderOutlineItem = (item: OutlineItem, level: number = 0, parentItems: OutlineItem[] = [], siblings: OutlineItem[] = []) => {
    const isGenerating = generatingContent.has(item.id);
    const hasContent = item.content && item.content.trim().length > 0;
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="select-none">
        <div 
          className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 group ${
            level === 0 ? 'bg-slate-50/80 mb-2' : 'hover:bg-indigo-50/50 mb-1'
          }`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {/* 展开按钮 */}
          <div className="w-5 h-5 flex items-center justify-center">
            {hasChildren ? (
              <button 
                onClick={() => toggleExpand(item.id)}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
            )}
          </div>

          {/* 序号与标题 */}
          <span className="text-xs font-mono font-bold text-slate-400 w-8">{item.id}</span>
          <span className={`flex-1 font-medium ${level === 0 ? 'text-slate-900' : 'text-slate-700'}`}>
            {item.title}
          </span>

          {/* 操作按钮 */}
          {!hasChildren && (
            <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${isGenerating ? 'opacity-100' : ''}`}>
              <button
                onClick={() => handleGenerateContent(item, parentItems, siblings)}
                disabled={isGenerating || isBatchGenerating}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  hasContent
                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                } disabled:opacity-50`}
              >
                {isGenerating ? (
                  <>
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    正在撰写...
                  </>
                ) : hasContent ? (
                  <>
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    重新生成
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-3.5 h-3.5" />
                    AI 撰写
                  </>
                )}
              </button>
            </div>
          )}
          
          {hasContent && !isGenerating && (
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          )}
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-100 ml-2.5">
            {item.children!.map((child, idx) => 
              renderOutlineItem(
                child, 
                level + 1, 
                [...parentItems, item],
                item.children!.filter(s => s.id !== child.id)
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8">
      {/* 头部区域 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ListBulletIcon className="w-7 h-7 text-indigo-600" />
            标书架构设计
          </h1>
          <p className="text-slate-500 mt-1">基于解析出的项目需求，构建专业、合规的标书目录结构</p>
        </div>

        <div className="flex items-center gap-3">
          {outlineData.length > 0 && (
            <>
              <button
                onClick={handleGenerateOutline}
                disabled={generating || isBatchGenerating}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
                重新生成架构
              </button>
              
              <button
                onClick={handleGenerateAllContent}
                disabled={generating || isBatchGenerating}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {isBatchGenerating ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    正在并发生成正文...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    一键生成正文 (三线程)
                  </>
                )}
              </button>
            </>
          )}
          
          {outlineData.length === 0 && (
            <button
              onClick={handleGenerateOutline}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <SparklesIcon className="w-5 h-5" />
              {generating ? '正在构思架构...' : '一键生成标书架构'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      {/* 选项配置区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 项目类型选择 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <TagIcon className="w-4 h-4 text-indigo-600" />
            项目性质
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'general', name: '通用类' },
              { id: 'engineering', name: '工程类' },
              { id: 'service', name: '服务类' },
              { id: 'goods', name: '货物类' },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setProjectType(type.id as ProjectType)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  projectType === type.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* 扩写参考上传 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <CloudArrowUpIcon className="w-4 h-4 text-indigo-600" />
            扩写参考（可选）
          </h3>
          <div className="relative group">
            <input
              type="file"
              onChange={handleExpandFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.bmp,.webp"
              disabled={uploadingExpand || generating}
            />
            <div className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl transition-all ${
              expandFileData.uploaded 
                ? 'border-emerald-200 bg-emerald-50/30' 
                : 'border-slate-200 group-hover:border-indigo-300'
            }`}>
              <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center">
                {uploadingExpand ? (
                  <ArrowPathIcon className="w-5 h-5 text-indigo-600 animate-spin" />
                ) : expandFileData.uploaded ? (
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                ) : (
                  <CloudArrowUpIcon className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {expandFileData.filename || '点击上传旧标书文件'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {expandFileData.uploaded ? '已解析旧目录，将参考其结构' : 'AI 将参考其目录结构进行扩写'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 目录展示区 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          {outlineData.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="space-y-1">
                {outlineData.map((item) => renderOutlineItem(item))}
              </div>
            </div>
          ) : (
            <div className="h-[400px] border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/30">
              <DocumentTextIcon className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-lg font-medium">暂无目录架构</p>
              <p className="text-sm mt-2">请点击右上角的按钮，让 AI 为您规划标书结构</p>
            </div>
          )}
        </div>

        {/* 右侧辅助信息 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">架构统计</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs">总章节数</p>
                <p className="text-2xl font-bold">{stats.totalChapters}</p>
              </div>
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs">已生成内容</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {stats.generatedContent}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-indigo-600" />
              AI 编写规范
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">深度适配需求</p>
                  <p className="text-xs text-slate-500 mt-0.5">自动将项目背景与招标文件要求融入每一章节</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">专业术语精准</p>
                  <p className="text-xs text-slate-500 mt-0.5">根据行业类型自动调整语言风格和专业用语</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">逻辑连贯性</p>
                  <p className="text-xs text-slate-500 mt-0.5">章节间自动衔接，保持全文逻辑闭环</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

