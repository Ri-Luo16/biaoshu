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
  project_summary?: {
    total_score: number | string;
    mandatory_count: number;
    budget?: string;
    delivery_time?: string;
    qualification_count: number;
  };
  executive_summary?: string;
  action_items?: string[];
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

// --- Bidding Agent Types ---

export interface TenderInfo {
  project_name: string;
  project_number?: string;
  tender_deadline?: string;
  budget?: string;
  purchaser?: string;
  agency?: string;
  qualifications?: string[];
  evaluation_method?: string;
  technical_requirements?: string[];
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskItem {
  clause: string;
  description: string;
  level: RiskLevel;
  suggestion: string;
}

export interface RiskAnalysisResponse {
  overall_risk: RiskLevel;
  risks: RiskItem[];
  summary: string;
}

export interface GoNoGoDecision {
  decision: boolean;
  score: number;
  reasoning: string;
  pros: string[];
  cons: string[];
  missing_capabilities: string[];
}

export interface ScoringItem {
  item_name: string;
  max_score: number;
  predicted_score: number;
  analysis: string;
  optimization_suggestion: string;
}

export interface ScoringSimulationResponse {
  total_score: number;
  win_probability: string;
  items: ScoringItem[];
}
