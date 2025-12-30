/**
 * 主应用组件
 */
import React from 'react';
import { useAppState } from './hooks/useAppState';
import Sidebar from './components/Sidebar';
import StepBar from './components/StepBar';
import DocumentAnalysis from './pages/DocumentAnalysis';
import BiddingAnalysis from './pages/BiddingAnalysis';
import OutlineEdit from './pages/OutlineEdit';
import ContentEdit from './pages/ContentEdit';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  HomeIcon 
} from '@heroicons/react/24/outline';

function App() {
  const {
    state,
    updateConfig,
    updateStep,
    updateFileContent,
    updateAnalysisResults,
    updateOutline,
    updateSelectedChapter,
    updateTenderInfo,
    updateBiddingAnalysis,
    updateCompanyInfo,
    nextStep,
    prevStep,
  } = useAppState();

  const steps = ['标书解析', '投标决策', '目录编辑', '正文编辑'];

  const renderCurrentPage = () => {
    switch (state.currentStep) {
      case 0:
        return (
          <DocumentAnalysis
            filename={state.filename}
            fileContent={state.fileContent}
            fileUrl={state.fileUrl}
            projectOverview={state.projectOverview}
            techRequirements={state.techRequirements}
            structuralAnalysis={state.structuralAnalysis}
            onFileUpload={updateFileContent}
            onAnalysisComplete={updateAnalysisResults}
          />
        );
      case 1:
        return (
          <BiddingAnalysis
            fileContent={state.fileContent}
            tenderInfo={state.tenderInfo}
            riskAnalysis={state.riskAnalysis}
            bidDecision={state.bidDecision}
            scoringSimulation={state.scoringSimulation}
            companyInfo={state.companyInfo}
            onUpdateTenderInfo={updateTenderInfo}
            onUpdateAnalysis={updateBiddingAnalysis}
            onUpdateCompanyInfo={updateCompanyInfo}
          />
        );
      case 2:
        return (
          <OutlineEdit
            projectOverview={state.projectOverview}
            techRequirements={state.techRequirements}
            outlineData={state.outlineData}
            onOutlineGenerated={updateOutline}
          />
        );
      case 3:
        return (
          <ContentEdit
            outlineData={state.outlineData}
            selectedChapter={state.selectedChapter}
            projectOverview={state.projectOverview}
            onChapterSelect={updateSelectedChapter}
            onOutlineUpdate={updateOutline}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex font-sans text-slate-900">
      {/* 侧边栏 */}
      <Sidebar 
        currentStep={state.currentStep} 
        onStepClick={updateStep} 
        onConfigUpdate={updateConfig}
      />

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* 顶部状态栏 */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">
              {steps[state.currentStep]}
            </h2>
            <div className="h-4 w-px bg-slate-200"></div>
            <p className="text-sm text-slate-500">
              项目：{state.tenderInfo?.project_name || '未命名标书项目'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  AI
                </div>
              ))}
            </div>
            <button className="ml-4 px-4 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-full hover:bg-indigo-100 transition-colors">
              分享项目
            </button>
          </div>
        </header>

        {/* 页面内容 */}
        <main id="app-main-scroll" className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="max-w-6xl mx-auto px-8 py-8">
            {/* StepBar */}
            <div className="mb-8">
              <StepBar steps={steps} currentStep={state.currentStep} onStepClick={updateStep} />
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[calc(100vh-16rem)]">
              {renderCurrentPage()}
            </div>
          </div>
        </main>

        {/* 底部浮动导航按钮 */}
        <div className="absolute bottom-8 right-8 flex items-center gap-3">
          {state.currentStep > 0 && (
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              上一步
            </button>
          )}
          
          {state.currentStep < steps.length - 1 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
            >
              下一步
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => updateStep(0)}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <HomeIcon className="w-5 h-5" />
              完成并导出
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
