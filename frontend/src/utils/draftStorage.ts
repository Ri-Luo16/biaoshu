/**
 * 草稿存储工具
 */

// 草稿存储键名
const DRAFT_KEY = 'bidding_draft';

export interface DraftData {
  projectOverview?: string;
  techRequirements?: string;
  outlineData?: any[];
  timestamp?: number;
}

// 保存草稿
export function saveDraft(data: DraftData): void {
  try {
    const draftData = {
      ...data,
      timestamp: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
  } catch (error) {
    console.error('保存草稿失败:', error);
  }
}

// 加载草稿
export function loadDraft(): DraftData | null {
  try {
    const draftStr = localStorage.getItem(DRAFT_KEY);
    if (draftStr) {
      return JSON.parse(draftStr);
    }
  } catch (error) {
    console.error('加载草稿失败:', error);
  }
  return null;
}

// 清除草稿
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.error('清除草稿失败:', error);
  }
}

