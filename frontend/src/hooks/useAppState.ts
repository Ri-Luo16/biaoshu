/**
 * 应用状态管理 Hook
 */
import { useState, useCallback } from 'react';

export interface AppState {
  currentStep: number;
  apiKey: string;
  baseUrl: string;
  model: string;
  filename: string;
  fileContent: string;
  fileUrl: string;
  projectOverview: string;
  techRequirements: string;
  structuralAnalysis: string;
  outlineData: any[];
  selectedChapter: any;
}

const defaultState: AppState = {
  currentStep: 0,
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  filename: '',
  fileContent: '',
  fileUrl: '',
  projectOverview: '',
  techRequirements: '',
  structuralAnalysis: '',
  outlineData: [],
  selectedChapter: null,
};

export function useAppState() {
  const [state, setState] = useState<AppState>(defaultState);

  const updateConfig = useCallback((config: { apiKey: string; baseUrl: string; model: string }) => {
    setState((prev) => ({
      ...prev,
      ...config,
    }));
  }, []);

  const updateStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  const updateFileContent = useCallback((filename: string, content: string, fileUrl: string = '') => {
    setState((prev) => ({
      ...prev,
      filename,
      fileContent: content,
      fileUrl: fileUrl,
    }));
  }, []);

  const updateAnalysisResults = useCallback((
    projectOverview: string,
    techRequirements: string,
    structuralAnalysis: string = ''
  ) => {
    setState((prev) => ({
      ...prev,
      projectOverview,
      techRequirements,
      structuralAnalysis,
    }));
  }, []);

  const updateOutline = useCallback((outlineData: any[] | ((prev: any[]) => any[])) => {
    setState((prev) => ({
      ...prev,
      outlineData: typeof outlineData === 'function' ? outlineData(prev.outlineData) : outlineData,
    }));
  }, []);

  const updateSelectedChapter = useCallback((chapter: any) => {
    setState((prev) => ({
      ...prev,
      selectedChapter: chapter,
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 2),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  return {
    state,
    updateConfig,
    updateStep,
    updateFileContent,
    updateAnalysisResults,
    updateOutline,
    updateSelectedChapter,
    nextStep,
    prevStep,
  };
}

