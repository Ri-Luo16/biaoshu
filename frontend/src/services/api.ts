/**
 * API 服务
 */
import axios from 'axios';
import type { 
  ApiConfig, 
  UploadResponse, 
  AnalysisResult, 
  OutlineItem, 
  ProjectType,
  TenderInfo,
  RiskAnalysisResponse,
  GoNoGoDecision,
  ScoringSimulationResponse
} from '../types';

const API_BASE_URL = '/api';

// 配置管理
export async function loadConfig(): Promise<ApiConfig | null> {
  try {
    const response = await axios.get(`${API_BASE_URL}/config/load`);
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('加载配置失败:', error);
    return null;
  }
}

export async function saveConfig(config: ApiConfig): Promise<void> {
  const response = await axios.post(`${API_BASE_URL}/config/save`, {
    api_key: config.api_key,
    base_url: config.base_url,
    model_name: config.model_name,
  });
  if (!response.data.success) {
    throw new Error(response.data.message || '保存配置失败');
  }
}

export async function getModels(apiKey: string, baseUrl: string): Promise<string[]> {
  try {
    const response = await axios.post(`${API_BASE_URL}/config/models`, {
      api_key: apiKey,
      base_url: baseUrl,
      model_name: 'gpt-3.5-turbo', // 默认值
    });
    if (response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('获取模型列表失败:', error);
    return [];
  }
}

// 文档处理
export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${API_BASE_URL}/document/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

// 文档扩写/参考文件上传
export async function uploadExpandDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${API_BASE_URL}/expand/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

// Bidding Agent APIs
export async function parseTender(fileContent: string): Promise<TenderInfo> {
  const response = await axios.post(`${API_BASE_URL}/bidding/parse`, {
    file_content: fileContent
  });
  return response.data;
}

export async function analyzeRisk(fileContent: string): Promise<RiskAnalysisResponse> {
  const response = await axios.post(`${API_BASE_URL}/bidding/risk-analysis`, {
    file_content: fileContent
  });
  return response.data;
}

export async function analyzeBid(tenderInfo: TenderInfo, companyInfo: string): Promise<GoNoGoDecision> {
  const response = await axios.post(`${API_BASE_URL}/bidding/analyze-bid`, {
    tender_info: tenderInfo,
    company_info: companyInfo
  });
  return response.data;
}

export async function simulateScoring(tenderInfo: TenderInfo, companyInfo: string): Promise<ScoringSimulationResponse> {
  const response = await axios.post(`${API_BASE_URL}/bidding/scoring-simulation`, {
    tender_info: tenderInfo,
    company_info: companyInfo
  });
  return response.data;
}

// 搜索功能
export interface SearchResult {
  title: string;
  href: string;
  body: string;
}

export interface SearchResponse {
  success: boolean;
  message: string;
  results: SearchResult[];
  total: number;
}

export async function search(query: string, maxResults: number = 5): Promise<SearchResponse> {
  const response = await axios.post(`${API_BASE_URL}/search/`, {
    query,
    max_results: maxResults,
  });
  return response.data;
}

export async function searchFormatted(query: string, maxResults: number = 5): Promise<{ success: boolean; formatted_results: string }> {
  const response = await axios.post(`${API_BASE_URL}/search/formatted`, {
    query,
    max_results: maxResults,
  });
  return response.data;
}

export async function loadUrlContent(url: string): Promise<{ success: boolean; content: string; title: string }> {
  const response = await axios.post(`${API_BASE_URL}/search/load-url`, {
    url,
  });
  return response.data;
}

// 流式分析文档 - 项目概述
export function analyzeDocumentOverview(
  fileContent: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): () => void {
  const controller = new AbortController();
  
  fetch(`${API_BASE_URL}/document/analyze-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_content: fileContent,
      analysis_type: 'overview',
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('分析失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              }
              if (parsed.error) {
                onError(new Error(parsed.message || '分析失败'));
                return;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      onComplete();
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return () => controller.abort();
}

// 流式分析文档 - 技术评分要求
export function analyzeDocumentRequirements(
  fileContent: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): () => void {
  const controller = new AbortController();
  
  fetch(`${API_BASE_URL}/document/analyze-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_content: fileContent,
      analysis_type: 'requirements',
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('分析失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              }
              if (parsed.error) {
                onError(new Error(parsed.message || '分析失败'));
                return;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      onComplete();
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return () => controller.abort();
}

// 流式分析文档 - 结构化分析
export function analyzeDocumentStructural(
  fileContent: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): () => void {
  const controller = new AbortController();
  
  fetch(`${API_BASE_URL}/document/analyze-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_content: fileContent,
      analysis_type: 'structural',
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('结构化分析失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              }
              if (parsed.error) {
                onError(new Error(parsed.message || '结构化分析失败'));
                return;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      onComplete();
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return () => controller.abort();
}

// 兼容旧的分析接口
export async function analyzeDocument(
  filename: string,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<AnalysisResult> {
  // 这个接口需要文件内容，前端应该在上传时保存
  throw new Error('请使用流式分析接口');
}

// 目录管理 - 流式生成
export function generateOutlineStream(
  overview: string,
  requirements: string,
  projectType: ProjectType = 'general',
  uploadedExpand: boolean = false,
  oldOutline: string | null = null,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): () => void {
  const controller = new AbortController();
  
  fetch(`${API_BASE_URL}/outline/generate-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      overview,
      requirements,
      project_type: projectType,
      uploaded_expand: uploadedExpand,
      old_outline: oldOutline,
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('目录生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              }
              if (parsed.error) {
                onError(new Error(parsed.message || '目录生成失败'));
                return;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      onComplete();
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return () => controller.abort();
}

// 兼容旧接口
export async function generateOutline(
  projectSummary: string,
  technicalRequirements: string,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<OutlineItem[]> {
  const response = await axios.post(`${API_BASE_URL}/outline/generate`, {
    overview: projectSummary,
    requirements: technicalRequirements,
    project_type: 'general',
  });

  if (!response.data.outline) {
    throw new Error('目录生成失败');
  }

  return response.data.outline;
}

// 生成章节内容 - 流式
export function generateChapterContentStream(
  chapter: { id: string; title: string; description: string },
  parentChapters: Array<{ id: string; title: string; description: string }>,
  siblingChapters: Array<{ id: string; title: string; description: string }>,
  projectOverview: string,
  onChunk: (chunk: string, fullContent: string) => void,
  onComplete: (content: string) => void,
  onError: (error: Error) => void
): () => void {
  const controller = new AbortController();
  
  fetch(`${API_BASE_URL}/content/generate-chapter-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chapter,
      parent_chapters: parentChapters,
      sibling_chapters: siblingChapters,
      project_overview: projectOverview,
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('内容生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let buffer = '';
      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete(fullContent);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.status === 'streaming' && parsed.content) {
                fullContent += parsed.content;
                onChunk(parsed.content, fullContent);
              } else if (parsed.status === 'completed') {
                onComplete(fullContent);
                return;
              } else if (parsed.status === 'error') {
                onError(new Error(parsed.message || '内容生成失败'));
                return;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      onComplete(fullContent);
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return () => controller.abort();
}

// 兼容旧接口
export async function generateContent(
  outlineItem: OutlineItem,
  projectSummary: string,
  technicalRequirements: string,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<string> {
  throw new Error('请使用流式内容生成接口');
}

// 流式生成内容（已废弃）
export function generateContentStream(
  outlineItem: OutlineItem,
  projectSummary: string,
  technicalRequirements: string,
  apiKey: string,
  baseUrl: string,
  model: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): () => void {
  // 使用新的章节内容生成接口
  return generateChapterContentStream(
    { id: outlineItem.id, title: outlineItem.title, description: outlineItem.description },
    [],
    [],
    projectSummary,
    (chunk, fullContent) => onChunk(chunk),
    (fullContent) => onComplete(),
    onError
  );
}

// 扩展内容
export async function expandContent(
  content: string,
  instruction: string,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<string> {
  const response = await axios.post(`${API_BASE_URL}/expand/content`, {
    content,
    instruction,
    api_key: apiKey,
    base_url: baseUrl,
    model,
  });

  if (!response.data.success) {
    throw new Error('内容扩展失败');
  }

  return response.data.data;
}

// 导出Word文档
export async function exportWord(
  projectName: string,
  projectOverview: string,
  outline: OutlineItem[]
): Promise<Blob> {
  const response = await axios.post(
    `${API_BASE_URL}/document/export-word`,
    {
      project_name: projectName,
      project_overview: projectOverview,
      outline,
    },
    {
      responseType: 'blob',
    }
  );

  return response.data;
}
