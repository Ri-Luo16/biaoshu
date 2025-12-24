/**
 * TypeScript 类型定义
 */

export interface ApiConfig {
  api_key: string;
  base_url: string;
  model_name: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  filename?: string;
  size?: number;
  file_content?: string;
  file_url?: string;
  old_outline?: string;
}

export type ProjectType = 'engineering' | 'service' | 'goods' | 'general';

export type AnalysisType = 'overview' | 'requirements' | 'structural';

export interface StructuralAnalysis {
  qualification: string[];
  technical_requirements: Array<{ item: string; value: string; mandatory: boolean }>;
  scoring_criteria: Record<string, number | string>;
  implicit_needs: string[];
  risk_flags: string[];
}

export interface AnalysisResult {
  project_overview: string;
  tech_requirements: string;
  structural?: StructuralAnalysis;
}

export interface OutlineItem {
  id: string;
  title: string;
  description: string;
  content?: string;
  children?: OutlineItem[];
}

export interface GenerateContentRequest {
  chapter: {
    id: string;
    title: string;
    description: string;
  };
  parent_chapters?: Array<{ id: string; title: string; description: string }>;
  sibling_chapters?: Array<{ id: string; title: string; description: string }>;
  project_overview: string;
}

