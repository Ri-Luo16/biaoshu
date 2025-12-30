# 🚀 AI标书 (AI Bidding System)

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/React-18-61dafb.svg" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-0.104+-009688.svg" alt="FastAPI">
  <img src="https://img.shields.io/badge/Milvus-RAG-orange.svg" alt="Milvus">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
</p>

<p align="center">
  <strong>新一代智能标书解决方案：深度解析、风险评估、决策辅助与自动写作</strong>
</p>

---

**AI标书** 不仅仅是一个写作工具，它是一个全流程的招投标辅助系统。结合了最新的 **RAG (检索增强生成)** 技术、**深度联网搜索** 和 **智能决策 Agent**，帮助企业在激烈的竞标中脱颖而出。

## ✨ 核心功能亮点

### 🧠 1. 深度标书分析 Agent
不仅仅是阅读，更是理解。系统内置专业的 Bidding Agent，能够对招标文件进行全方位分析：
- **📊 风险智能识别**：自动扫描招标文件，识别潜在的法律风险、商务风险和技术陷阱。
- **⚖️ Go/No-Go 决策辅助**：基于企业资质和招标要求，通过多维度加权评分，提供科学的投标决策建议。
- **💯 模拟评分系统**：根据评分标准模拟技术打分，帮助优化技术方案，提高中标率。

### 🌐 2. 深度联网搜索 (Deep Search)
告别信息闭塞，实时获取最新行业动态：
- **🔍 全网即时检索**：集成 **DuckDuckGo** 搜索引擎，实时获取相关技术参数、竞品信息和行业标准。
- **🕸️ 智能网页提取**：内置 **Playwright** 和 **Requests** 双引擎，能够穿透反爬策略，精准提取网页深度内容。
- **🧹 自动清洗整理**：AI 自动清洗网页杂乱信息，提取核心知识点用于标书写作。

### 📚 3. RAG 企业知识库 (Milvus + Ollama)
打造越用越聪明的标书助手：
- **💾 向量数据库集成**：内置 **Milvus** 向量数据库支持，构建企业专属的投标素材库。
- **🦙 本地模型支持**：支持使用 **Ollama** 运行本地 Embedding 模型，保障数据隐私安全。
- **🔗 知识检索增强**：写作时自动检索过往优质标书案例和技术文档，确保内容专业、准确。

### ✍️ 4. 智能写作与扩写
- **📝 全文自动生成**：基于目录结构，多线程并发生成高质量标书内容。
- **✨ 智能扩写优化**：支持上传图片、PDF 或 Word 片段，AI 能够基于参考资料进行针对性扩写和润色。
- **📑 完美格式导出**：一键导出标准 Word 文档，格式排版无需二次调整。

## 🛠️ 技术架构

本项目采用前沿的 AI 技术栈构建：

| 模块 | 技术选型 | 说明 |
|------|----------|------|
| **前端** | React 18, TypeScript, TailwindCSS | 现代化、响应式的用户界面 |
| **后端** | FastAPI, Python 3.10+ | 高性能异步 API 服务 |
| **LLM** | OpenAI SDK (GPT-4/DeepSeek), Ollama | 支持云端主流大模型及本地模型 |
| **RAG** | Milvus, LangChain, Ollama Embeddings | 向量检索与知识库管理 |
| **Agent** | Bidding Agent (Custom) | 专有的招投标业务逻辑智能体 |
| **搜索** | DuckDuckGo, Playwright | 深度网络信息采集 |

## 📦 快速开始

### 方式一：直接运行 (Windows用户推荐)

1. 在 [Releases](https://github.com/yibiaoai/yibiao-simple/releases) 下载最新的 `yibiao-simple.exe`。
2. 双击运行，浏览器自动打开应用。
3. 在设置中配置 AI 模型 API Key (推荐使用 DeepSeek 或 OpenAI)。

### 方式二：源码部署

#### 前置要求
- Python 3.10+
- Node.js 16+
- (可选) Docker (用于运行 Milvus)

#### 1. 启动后端服务
```bash
git clone https://github.com/yibiaoai/yibiao-simple.git
cd yibiao-simple/backend
pip install -r requirements.txt
python run.py
```

#### 2. 启动前端界面
```bash
cd ../frontend
npm install
npm start
```

## 📝 配置指南

### AI 模型配置
支持所有兼容 OpenAI 接口的模型。在设置页面填写：
- **Base URL**: 例如 `https://api.deepseek.com/v1`
- **API Key**: 您的密钥
- **Model**: `deepseek-chat`, `gpt-4` 等

### 本地知识库配置 (可选)
如需启用 RAG 功能，请确保本地安装了 Ollama 或配置了 OpenAI Embedding：
1. 安装 [Ollama](https://ollama.ai/) 并拉取模型: `ollama pull nomic-embed-text`
2. 系统会自动检测并优先使用本地 Ollama 模型进行向量化，节省成本。

## 🤝 参与贡献

我们欢迎各种形式的贡献，特别是关于 **Prompt 优化**、**解析规则增强** 和 **前端交互体验** 的改进。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/NewFeature`)
3. 提交改动 (`git commit -m 'Add NewFeature'`)
4. 推送分支 (`git push origin feature/NewFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

<p align="center">
  ⭐ 如果觉得项目不错，请给一个 Star 支持！<br>
  Made with ❤️ by AI标书团队
</p>
