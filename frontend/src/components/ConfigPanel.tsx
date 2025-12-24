/**
 * 配置面板组件
 */
import React, { useState, useEffect } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { loadConfig, saveConfig, getModels } from '../services/api';

interface ConfigPanelProps {
  onConfigUpdate: (config: { apiKey: string; baseUrl: string; model: string }) => void;
  onSave?: () => void;
}

export default function ConfigPanel({ onConfigUpdate, onSave }: ConfigPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com');
  const [model, setModel] = useState('deepseek-chat');
  const [models, setModels] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 加载配置
  useEffect(() => {
    loadConfig()
      .then((config) => {
        if (config) {
          setApiKey(config.api_key || '');
          setBaseUrl(config.base_url || 'https://api.deepseek.com');
          setModel(config.model_name || 'deepseek-chat');
          onConfigUpdate({
            apiKey: config.api_key || '',
            baseUrl: config.base_url || 'https://api.deepseek.com',
            model: config.model_name || 'deepseek-chat',
          });
        }
      })
      .catch((error) => {
        console.error('加载配置失败:', error);
      });
  }, [onConfigUpdate]);

  // 获取模型列表
  const handleGetModels = async () => {
    if (!apiKey || !baseUrl) {
      setMessage('请先填写 API Key 和 Base URL');
      return;
    }

    try {
      const modelList = await getModels(apiKey, baseUrl);
      setModels(modelList);
      setMessage('模型列表获取成功');
    } catch (error) {
      console.error('获取模型列表失败:', error);
      // 使用默认模型列表
      setModels(['deepseek-chat', 'gpt-3.5-turbo', 'gpt-4']);
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!apiKey) {
      setMessage('请填写 API Key');
      return;
    }

    setIsSaving(true);
    try {
      await saveConfig({
        api_key: apiKey,
        base_url: baseUrl,
        model_name: model,
      });
      
      // 同时保存到 localStorage
      localStorage.setItem('apiKey', apiKey);
      localStorage.setItem('baseUrl', baseUrl);
      localStorage.setItem('model', model);
      
      onConfigUpdate({ apiKey, baseUrl, model });
      setMessage('配置保存成功');
      if (onSave) {
        setTimeout(onSave, 800);
      }
    } catch (error) {
      setMessage('配置保存失败');
      console.error('保存配置失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          API Key *
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-xxxxx"
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Base URL
        </label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.deepseek.com"
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          模型
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="deepseek-chat"
            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          <button
            onClick={handleGetModels}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
          >
            获取列表
          </button>
        </div>
        {models.length > 0 && (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full mt-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      {message && (
        <div className={`text-sm p-3 rounded-lg ${
          message.includes('成功') 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
            : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {message}
        </div>
      )}

      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-md shadow-indigo-200 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {isSaving ? '正在保存...' : '保存配置'}
        </button>
      </div>
    </div>
  );
}

