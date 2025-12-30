"""OpenAI服务"""
import json
import asyncio
import copy
import traceback
from typing import Dict, Any, List, AsyncGenerator

import openai

from ..utils.outline_util import get_random_indexes, calculate_nodes_distribution, generate_one_outline_json_by_level1
from ..utils.json_util import check_json, clean_json_string
from ..utils.config_manager import config_manager


class OpenAIService:
    """OpenAI服务类"""
    
    def __init__(self) -> None:
        """初始化OpenAI服务，从config_manager读取配置"""
        # 从配置管理器加载配置
        config = config_manager.load_config()
        self.api_key: str = config.get('api_key', '')
        self.base_url: str = config.get('base_url', '')
        self.model_name: str = config.get('model_name', 'gpt-3.5-turbo')

        # 初始化OpenAI客户端 - 使用异步客户端
        self.client = openai.AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url if self.base_url else None
        )
    
    async def get_available_models(self) -> List[str]:
        """获取可用的模型列表"""
        try:
            models = await self.client.models.list()
            chat_models = []
            for model in models.data:
                model_id = model.id.lower()
                if any(keyword in model_id for keyword in ['gpt', 'claude', 'chat', 'llama', 'qwen', 'deepseek']):
                    chat_models.append(model.id)
            return sorted(list(set(chat_models)))
        except Exception as e:
            raise Exception(f"获取模型列表失败: {e}") from e
    
    async def stream_chat_completion(
        self, 
        messages: list, 
        temperature: float = 0.7,
        response_format: dict = None,
        max_tokens: int = 4096
    ) -> AsyncGenerator[str, None]:
        """流式聊天完成请求 - 真正的异步实现"""
        try:
            stream = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                stream=True,
                max_tokens=max_tokens,
                **({"response_format": response_format} if response_format is not None else {})
            )

            is_thinking = False
            async for chunk in stream:
                try:
                    if chunk.choices and len(chunk.choices) > 0:
                        if (content := chunk.choices[0].delta.content) is not None:
                            # 过滤 DeepSeek 的 think 块
                            if "<think>" in content:
                                is_thinking = True
                                parts = content.split("<think>")
                                if parts[0]:
                                    yield parts[0]
                                continue
                            
                            if "</think>" in content:
                                is_thinking = False
                                parts = content.split("</think>")
                                if len(parts) > 1 and parts[1]:
                                    yield parts[1]
                                continue
                            
                            if not is_thinking:
                                yield content
                except (IndexError, Exception) as e:
                    if isinstance(e, IndexError):
                        print(f"IndexError in stream: {e}")
                        traceback.print_exc()
                    continue

        except Exception as e:
            traceback.print_exc()
            error_msg = str(e)
            if "502 Bad Gateway" in error_msg:
                yield "错误: AI 服务提供商网关超时 (502 Bad Gateway)。这通常是因为请求过多或提供商负载过高，请稍后重试或尝试降低并发生成数量。"
            elif "rate limit" in error_msg.lower():
                yield "错误: 触发 AI 服务频率限制。请稍后重试。"
            else:
                yield f"错误: {error_msg}"

    async def _collect_stream_text(
        self,
        messages: list,
        temperature: float = 0.7,
        response_format: dict | None = None,
    ) -> str:
        """收集流式返回的文本到一个完整字符串"""
        full_content = ""
        async for chunk in self.stream_chat_completion(
            messages,
            temperature=temperature,
            response_format=response_format,
        ):
            full_content += chunk
        return full_content

    async def _generate_with_json_check(
        self,
        messages: list,
        schema: str | Dict[str, Any],
        max_retries: int = 3,
        temperature: float = 0.7,
        response_format: dict | None = None,
        log_prefix: str = "",
        raise_on_fail: bool = True,
    ) -> str:
        """
        通用的带 JSON 结构校验与重试的生成函数。
        """
        attempt = 0
        while True:
            full_content = await self._collect_stream_text(
                messages,
                temperature=temperature,
                response_format=response_format,
            )

            isok, error_msg = check_json(str(full_content), schema)
            if isok:
                return full_content

            prefix = f"{log_prefix} " if log_prefix else ""
            if attempt >= max_retries:
                print(f"{prefix}check_json 校验失败，已达到最大重试次数({max_retries})：{error_msg}")
                if raise_on_fail:
                    raise Exception(f"{prefix}check_json 校验失败: {error_msg}")
                return full_content

            attempt += 1
            print(f"{prefix}check_json 校验失败，进行第 {attempt}/{max_retries} 次重试：{error_msg}")
            await asyncio.sleep(0.5)

    async def ocr_image(self, base64_image: str) -> str:
        """使用视觉模型进行 OCR 识别"""
        try:
            system_prompt = "你是一个专业的 OCR 识别助手。请识别并提取图片中的所有文字内容，保持原有排版和逻辑结构。"
            user_prompt = [
                {
                    "type": "text",
                    "text": "请识别这张图片中的文字，并直接输出识别后的内容，不要有任何多余的解释。"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}"
                    }
                }
            ]

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.1,
                max_tokens=4096
            )

            return response.choices[0].message.content or ""
        except Exception as e:
            print(f"OCR 识别失败: {e}")
            return ""

    async def generate_content_for_outline(self, outline: Dict[str, Any], project_overview: str = "") -> Dict[str, Any]:
        """为目录结构生成内容"""
        try:
            if not isinstance(outline, dict) or 'outline' not in outline:
                raise Exception("无效的outline数据格式")
            
            result_outline = copy.deepcopy(outline)
            await self._process_outline_recursive(result_outline['outline'], [], project_overview)
            return result_outline
            
        except Exception as e:
            raise Exception(f"处理过程中发生错误: {e}") from e
    
    async def _process_outline_recursive(self, chapters: list, parent_chapters: list = None, project_overview: str = "") -> None:
        """递归处理章节列表"""
        for chapter in chapters:
            is_leaf = 'children' not in chapter or not chapter.get('children', [])
            current_chapter_info = {
                'id': chapter.get('id', 'unknown'),
                'title': chapter.get('title', '未命名章节'),
                'description': chapter.get('description', '')
            }
            
            current_parent_chapters = (parent_chapters or []) + [current_chapter_info]
            
            if is_leaf:
                content = ""
                async for chunk in self._generate_chapter_content(
                    chapter, 
                    current_parent_chapters[:-1],
                    chapters,
                    project_overview
                ):
                    content += chunk
                if content:
                    chapter['content'] = content
            else:
                await self._process_outline_recursive(chapter['children'], current_parent_chapters, project_overview)
    
    async def _generate_chapter_content(self, chapter: dict, parent_chapters: list = None, sibling_chapters: list = None, project_overview: str = "") -> AsyncGenerator[str, None]:
        """为单个章节流式生成内容"""
        try:
            chapter_id = chapter.get('id', 'unknown')
            
            # 1. 构建基础上下文
            context_info = ""
            if parent_chapters:
                context_info += "上级章节信息：\n" + "".join(f"- {p.get('id')} {p.get('title')}\n  {p.get('description')}\n" for p in parent_chapters)
            
            if sibling_chapters:
                context_info += "同级章节信息（请避免内容重复）：\n" + "".join(
                    f"- {s.get('id')} {s.get('title')}\n  {s.get('description')}\n" 
                    for s in sibling_chapters if s.get('id') != chapter_id
                )

            # 2. 尝试从 Milvus 检索相关上下文 (RAG)
            rag_context = ""
            try:
                from .milvus_service import MilvusService
                milvus_service = MilvusService()
                
                # 构建查询语句：结合章节标题和描述
                search_query = f"{chapter.get('title')} {chapter.get('description')}"
                if parent_chapters:
                    search_query = f"{parent_chapters[-1].get('title')} {search_query}"
                
                docs = await milvus_service.search_similar(search_query, k=3)
                if docs:
                    rag_context = "\n\n参考资料库中的相关内容：\n" + "\n---\n".join([d.page_content for d in docs]) + "\n"
                    print(f"章节 {chapter_id} 检索到 {len(docs)} 条相关上下文")
            except Exception as e:
                print(f"Milvus 检索失败: {e}")
                # RAG 失败不应阻断生成

            # 3. 构建 Prompt
            system_prompt = """你是一个专业的标书编写专家，负责为投标文件的技术标部分生成具体内容。

要求：
1. 内容要专业、准确，与章节标题和描述保持一致
2. 这是技术方案，不是宣传报告，注意朴实无华，不要假大空
3. 语言要正式、规范，符合标书写作要求，但不要使用奇怪的连接词，不要让人觉得内容像是AI生成的
4. 内容要详细具体，避免空泛的描述
5. 注意避免与同级章节内容重复，保持内容的独特性和互补性
6. 如果提供了参考资料库中的内容，请优先参考其中的事实、数据和技术参数，但不要生硬照搬
7. 直接返回章节内容，不生成标题，不要任何额外说明或格式标记
"""
            project_info = f"项目概述信息：\n{project_overview}\n\n" if project_overview.strip() else ""
            
            user_prompt = f"""{project_info}{context_info}{rag_context}
当前章节信息：
章节ID: {chapter_id}
章节标题: {chapter.get('title')}
章节描述: {chapter.get('description')}

请根据项目概述信息、参考资料和上述章节层级关系，生成详细的专业内容。"""

            messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
            async for chunk in self.stream_chat_completion(messages, temperature=0.7):
                yield chunk
        except Exception as e:
            print(f"生成章节内容时出错: {e}")
            yield f"错误: {e}"
            
    async def generate_outline_v2(self, overview: str, requirements: str, project_type: str = "general", project_sub_type: str = None) -> Dict[str, Any]:
        schema_json = json.dumps([{"rating_item": "原评分项", "new_title": "根据评分项修改的标题"}])
        type_hints = {
            "engineering": "工程类项目：提纲应侧重于技术细节、施工方案、安全质量保证和工艺流程。",
            "service": "服务类项目：提纲应突出服务流程、团队优势、响应速度和质量承诺。",
            "goods": "货物类项目：提纲应强调产品技术参数、资质认证、供货方案和售后服务。",
            "general": "通用类项目：根据项目实际情况平衡各方面内容。"
        }
        hint = type_hints.get(project_type, type_hints["general"])
        if project_sub_type:
            hint += f" 特别针对【{project_sub_type}】细分领域进行深度优化。"

        system_prompt = f"你是专业的标书编写专家。\n### 任务\n1. 撰写技术标部分的一级提纲\n### 行业要求\n{hint}\n### Output Format\n{schema_json}"
        user_prompt = f"### 项目信息\n<overview>\n{overview}\n</overview>\n<requirements>\n{requirements}\n</requirements>"
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]

        full_content = await self._generate_with_json_check(messages, schema_json, response_format={"type": "json_object"}, log_prefix="一级提纲")
        level_l1 = json.loads(clean_json_string(full_content))
        
        if len(level_l1) >= 2:
            index1, index2 = get_random_indexes(len(level_l1))
        elif len(level_l1) == 1:
            index1, index2 = 0, 0
        else:
            return {"outline": []}

        # 增加总叶子节点预估数量，确保大项目目录不会被过度压缩
        # 以前是 100000 // 1500 (约66个)，现在增加到 150 个左右
        total_leaf_nodes_limit = max(150, len(level_l1) * 10)
        dist = calculate_nodes_distribution(len(level_l1), (index1, index2), total_leaf_nodes_limit)
        
        sem = asyncio.Semaphore(5)  # 增加并发量
        async def sem_node(i, node):
            try:
                async with sem: 
                    return await self.process_level1_node(i, node, dist, level_l1, overview, requirements, project_type, project_sub_type)
            except Exception as e:
                print(f"处理第 {i+1} 章大纲时失败: {e}")
                # 容错处理：返回一个基础结构的节点，而不是让整个大纲生成失败
                return {
                    "id": str(i + 1),
                    "title": node.get("new_title", f"第 {i+1} 章"),
                    "description": "该章节目录生成失败，请尝试重新生成或手动编辑",
                    "children": []
                }

        outline = await asyncio.gather(*(sem_node(i, n) for i, n in enumerate(level_l1)))
        return {"outline": outline}
    
    async def process_level1_node(self, i, node, dist, level_l1, overview, requirements, project_type: str = "general", project_sub_type: str = None) -> dict:
        json_outline = generate_one_outline_json_by_level1(node["new_title"], i + 1, dist)
        other_outline = "\n".join(f"{j+1}. {n['new_title']}" for j, n in enumerate(level_l1) if j != i)
        type_hints = {
            "engineering": "工程类：二三级目录应包含施工图纸深化等。",
            "service": "服务类：二三级目录应包含组织架构等。",
            "goods": "货物类：二三级目录应包含产品规格偏离表等。",
            "general": "通用类：根据一级标题逻辑深度细化。"
        }
        hint = type_hints.get(project_type, type_hints["general"])
        if project_sub_type: hint += f" 针对【{project_sub_type}】领域的特性。"

        sys_p = f"你是标书专家。\n### 任务\n1. 补全二三级目录\n### 行业要求\n{hint}\n### Output Format\n{json_outline}"
        user_p = f"### 项目信息\n<overview>\n{overview}\n</overview>\n<requirements>\n{requirements}\n</requirements>\n<other_outline>\n{other_outline}\n</other_outline>"
        
        content = await self._generate_with_json_check([{"role": "system", "content": sys_p}, {"role": "user", "content": user_p}], json_outline, response_format={"type": "json_object"}, log_prefix=f"第{i+1}章", raise_on_fail=False)
        return json.loads(content.strip())
