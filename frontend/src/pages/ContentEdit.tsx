/**
 * 内容编辑页面
 */
import React, { useState, useMemo } from 'react';
import { 
  DocumentArrowDownIcon, 
  MagnifyingGlassIcon,
  PencilSquareIcon,
  EyeIcon,
  CheckBadgeIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { searchFormatted, loadUrlContent, exportWord } from '../services/api';
import type { OutlineItem } from '../types';

interface ContentEditProps {
  outlineData: OutlineItem[];
  selectedChapter: OutlineItem | null;
  projectOverview: string;
  onChapterSelect: (chapter: OutlineItem) => void;
}

export default function ContentEdit({
  outlineData,
  selectedChapter,
  projectOverview,
  onChapterSelect,
}: ContentEditProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // 搜索助手相关状态
  const [showSearchAssistant, setShowSearchAssistant] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState('');
  const [searchError, setSearchError] = useState('');

  // 处理搜索
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const response = await searchFormatted(searchQuery);
      if (response.success) {
        setSearchResults(response.formatted_results);
      } else {
        setSearchError('搜索失败');
      }
    } catch (err: any) {
      setSearchError(err.message || '搜索发生错误');
    } finally {
      setIsSearching(false);
    }
  };

  // 获取所有叶子节点（有内容的章节）
  const leafNodes = useMemo(() => {
    const nodes: OutlineItem[] = [];
    const traverse = (items: OutlineItem[]) => {
      items.forEach((item) => {
        if (!item.children || item.children.length === 0) {
          nodes.push(item);
        } else {
          traverse(item.children);
        }
      });
    };
    traverse(outlineData);
    return nodes;
  }, [outlineData]);

  // 过滤章节
  const filteredNodes = useMemo(() => {
    if (!searchTerm) return leafNodes;
    return leafNodes.filter(
      (node) =>
        node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.id.includes(searchTerm)
    );
  }, [leafNodes, searchTerm]);

  // 统计信息
  const stats = useMemo(() => {
    const total = leafNodes.length;
    const completed = leafNodes.filter((n) => n.content && n.content.trim().length > 0).length;
    const totalWords = leafNodes.reduce((sum, n) => sum + (n.content?.length || 0), 0);
    return { total, completed, totalWords };
  }, [leafNodes]);

  // 导出为 Markdown
  const handleExport = () => {
    const markdown = leafNodes
      .map((node) => {
        return `## ${node.id} ${node.title}\n\n${node.content || '（内容未生成）'}\n\n`;
      })
      .join('\n');

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '标书内容.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  // 导出为 Word
  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      const blob = await exportWord('标书项目', projectOverview, outlineData);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '标书文档.docx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('导出 Word 失败: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* 左侧列表 */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="快速检索章节..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* 统计概览 */}
        <div className="p-4 bg-indigo-50/50 m-4 rounded-xl border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">撰写进度</span>
            <span className="text-xs font-bold text-indigo-600">{Math.round((stats.completed / stats.total) * 100)}%</span>
          </div>
          <div className="w-full bg-indigo-100 h-1.5 rounded-full overflow-hidden mb-3">
            <div
              className="bg-indigo-600 h-full transition-all duration-500"
              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-indigo-700">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
              共 {stats.total} 章节
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
              已完成 {stats.completed}
            </div>
          </div>
        </div>

        {/* 章节滚动区域 */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
          {filteredNodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onChapterSelect(node)}
              className={`w-full text-left p-3 rounded-xl transition-all group ${
                selectedChapter?.id === node.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-bold ${selectedChapter?.id === node.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {node.id}
                </span>
                {node.content && (
                  <CheckBadgeIcon className={`w-3.5 h-3.5 ${selectedChapter?.id === node.id ? 'text-indigo-200' : 'text-emerald-500'}`} />
                )}
              </div>
              <div className="text-sm font-semibold truncate">{node.title}</div>
              <div className={`text-[10px] mt-1 ${selectedChapter?.id === node.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                {node.content ? `${node.content.length.toLocaleString()} 字符` : '待生成'}
              </div>
            </button>
          ))}
        </div>

        {/* 底部导出 */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          <button
            onClick={handleExportWord}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <DocumentArrowDownIcon className="w-4 h-4" />}
            导出为 Word 文档
          </button>
          
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            导出 Markdown 源码
          </button>
        </div>
      </div>

      {/* 右侧主编辑器 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {selectedChapter ? (
          <>
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-500">
                  SECTION {selectedChapter.id}
                </div>
                <h2 className="text-lg font-bold text-slate-800">{selectedChapter.title}</h2>
              </div>
              
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                <button 
                  onClick={() => setIsEditMode(false)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${!isEditMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  预览
                </button>
                <button 
                  onClick={() => setIsEditMode(true)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${isEditMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <PencilSquareIcon className="w-3.5 h-3.5" />
                  编辑
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex justify-center">
              <div className="w-full max-w-4xl bg-white min-h-[1056px] shadow-sm border border-slate-200 rounded-lg p-12 lg:p-16">
                {selectedChapter.content ? (
                  isEditMode ? (
                    <textarea 
                      className="w-full h-full min-h-[800px] border-none focus:ring-0 text-slate-700 font-sans leading-relaxed resize-none p-0"
                      defaultValue={selectedChapter.content}
                      placeholder="在这里输入内容..."
                    />
                  ) : (
                    <div className="prose prose-slate prose-sm md:prose-base max-w-none text-slate-700 leading-relaxed">
                      <ReactMarkdown>{selectedChapter.content}</ReactMarkdown>
                    </div>
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                    <SparklesIcon className="w-20 h-20 mb-6 opacity-20" />
                    <p className="text-xl font-bold">该章节内容待生成</p>
                    <p className="mt-2 text-slate-400">请返回“目录编辑”页面触发 AI 撰写</p>
                    <button 
                      className="mt-8 px-6 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-colors"
                    >
                      立即生成
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <DocumentTextIcon className="w-20 h-20 mb-6 opacity-10" />
            <h3 className="text-xl font-bold text-slate-600">选择一个章节开始检阅</h3>
            <p className="mt-2 max-w-sm">点击左侧章节列表，查看并编辑 AI 为您生成的标书正文内容。您可以切换预览与编辑模式进行微调。</p>
          </div>
        )}
      </div>

      {/* 右侧辅助面板 (AI 助手) */}
      <div className={`bg-white border-l border-slate-200 flex flex-col transition-all duration-300 ${showSearchAssistant ? 'w-96' : 'w-16'}`}>
        <div className="flex flex-col items-center py-6 gap-6 shrink-0 border-b border-slate-100">
          <button 
            onClick={() => setShowSearchAssistant(!showSearchAssistant)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm border ${
              showSearchAssistant 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
            }`} 
            title="搜索助手"
          >
            <GlobeAltIcon className="w-6 h-6" />
          </button>
          
          <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors" title="AI 聊天 (即将推出)">
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
          </button>
        </div>

        {showSearchAssistant ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <GlobeAltIcon className="w-4 h-4 text-indigo-600" />
                  联网搜索助手
                </h3>
                <button 
                  onClick={() => setShowSearchAssistant(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="输入关键词搜索资料..."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSearching ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {searchResults ? (
                <div className="prose prose-slate prose-xs max-w-none text-slate-600">
                  <ReactMarkdown>{searchResults}</ReactMarkdown>
                </div>
              ) : isSearching ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <ArrowPathIcon className="w-8 h-8 animate-spin mb-2 opacity-20" />
                  <p className="text-xs">正在搜索全网资料...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center">
                  <GlobeAltIcon className="w-10 h-10 mb-2 opacity-10" />
                  <p className="text-xs">输入关键词，搜索行业标准、<br/>技术参数等参考资料</p>
                </div>
              )}
              {searchError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-600">
                  {searchError}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center py-6 gap-6">
            <div className="flex-1"></div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">
              AI
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

