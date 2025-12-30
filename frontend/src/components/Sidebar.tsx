/**
 * 侧边栏组件
 */
import React, { useState } from 'react';
import { 
  DocumentMagnifyingGlassIcon, 
  QueueListIcon, 
  PencilSquareIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import ConfigPanel from './ConfigPanel';

interface SidebarProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  onConfigUpdate: (config: { apiKey: string; baseUrl: string; model: string }) => void;
}

export default function Sidebar({ currentStep, onStepClick, onConfigUpdate }: SidebarProps) {
  const [configOpen, setConfigOpen] = useState(false);

  const menuItems = [
    { id: 0, name: '标书解析', icon: CloudArrowUpIcon },
    { id: 1, name: '投标决策', icon: ScaleIcon },
    { id: 2, name: '目录编辑', icon: QueueListIcon },
    { id: 3, name: '正文编辑', icon: PencilSquareIcon },
  ];

  return (
    <div className="w-64 bg-slate-900 h-full flex flex-col text-slate-300">
      {/* Logo 区域 */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
          <DocumentTextIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">AI 标书助手</h1>
          <p className="text-xs text-slate-500">专业版</p>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          工作流
        </p>
        {menuItems.map((item) => {
          const isActive = currentStep === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onStepClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-indigo-600 text-white' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="font-medium">{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
              )}
            </button>
          );
        })}

        <div className="pt-8 px-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            辅助工具
          </p>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <ChartBarIcon className="w-5 h-5 text-slate-400" />
            <span className="font-medium">质量分析</span>
          </button>
        </div>
      </nav>

      {/* 底部配置按钮 */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => setConfigOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Cog6ToothIcon className="w-5 h-5 text-slate-400" />
          <span className="font-medium">模型设置</span>
        </button>
        
        <div className="mt-4 px-3 py-2 bg-slate-800/50 rounded-lg">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>系统状态</span>
            <span className="text-emerald-500">运行中</span>
          </div>
          <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-full"></div>
          </div>
        </div>
      </div>

      {/* 配置模态框 */}
      {configOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">模型参数配置</h3>
              <button 
                onClick={() => setConfigOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <ConfigPanel 
                onConfigUpdate={onConfigUpdate} 
                onSave={() => setConfigOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
