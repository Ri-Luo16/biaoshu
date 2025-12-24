"""OpenAI服务"""
import openai
from typing import Dict, Any, List, AsyncGenerator
import json
import asyncio

from ..utils.outline_util import get_random_indexes, calculate_nodes_distribution, generate_one_outline_json_by_level1
from ..utils.json_util import check_json, clean_json_string
from ..utils.config_manager import config_manager


class OpenAIService:
    """OpenAI服务类"""
    
    def __init__(self):
        """初始化OpenAI服务，从config_manager读取配置"""
        # 从配置管理器加载配置
        config = config_manager.load_config()
        self.api_key = config.get('api_key', '')
        self.base_url = config.get('base_url', '')
        self.model_name = config.get('model_name', 'gpt-3.5-turbo')

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
            raise Exception(f"获取模型列表失败: {str(e)}")
    
    async def stream_chat_completion(
        self, 
        messages: list, 
        temperature: float = 0.7,
        response_format: dict = None
    ) -> AsyncGenerator[str, None]:
        """流式聊天完成请求 - 真正的异步实现"""
        try:
            stream = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                stream=True,
                **({"response_format": response_format} if response_format is not None else {})
            )

            is_thinking = False
            async for chunk in stream:
                try:
                    if chunk.choices and len(chunk.choices) > 0:
                        content = chunk.choices[0].delta.content
                        if content is not None:
                            # 过滤 DeepSeek 的 think 块
                            if "<think>" in content:
                                is_thinking = True
                                # 如果 chunk 中同时包含 <think> 和其他内容，只保留 <think> 之前的内容
                                # 但通常 <think> 会单独作为一个 chunk 或者在 chunk 的开头
                                parts = content.split("<think>")
                                if parts[0]:
                                    yield parts[0]
                                continue
                            
                            if "</think>" in content:
                                is_thinking = False
                                # 如果 chunk 中同时包含 </think> 和其他内容，保留 </think> 之后的内容
                                parts = content.split("</think>")
                                if len(parts) > 1 and parts[1]:
                                    yield parts[1]
                                continue
                            
                            if not is_thinking:
                                yield content
                except IndexError as e:
                    print(f"IndexError in stream: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    continue
                except Exception as e:
                    print(f"Error in stream: {str(e)}")
                    continue

        except Exception as e:
            import traceback
            traceback.print_exc()
            
            error_msg = str(e)
            if "502 Bad Gateway" in error_msg:
                yield "错误: AI 服务提供商网关超时 (502 Bad Gateway)。这通常是因为请求过多或提供商负载过高，请稍后重试或尝试降低并发生成数量。"
            elif "Rate limit" in error_msg.lower():
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

        返回：通过校验的 full_content；如果 raise_on_fail=False，则在多次失败后返回最后一次内容。
        """
        attempt = 0
        last_error_msg = ""

        while True:
            full_content = await self._collect_stream_text(
                messages,
                temperature=temperature,
                response_format=response_format,
            )

            isok, error_msg = check_json(str(full_content), schema)
            if isok:
                return full_content

            last_error_msg = error_msg
            prefix = f"{log_prefix} " if log_prefix else ""

            if attempt >= max_retries:
                print(f"{prefix}check_json 校验失败，已达到最大重试次数({max_retries})：{last_error_msg}")
                if raise_on_fail:
                    raise Exception(f"{prefix}check_json 校验失败: {last_error_msg}")
                # 不抛异常，返回最后一次内容（保持原有行为）
                return full_content

            attempt += 1
            print(f"{prefix}check_json 校验失败，进行第 {attempt}/{max_retries} 次重试：{last_error_msg}")
            await asyncio.sleep(0.5)

    async def ocr_image(self, base64_image: str) -> str:
        """使用视觉模型进行 OCR 识别"""
        try:
            # 视觉模型的提示词
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

            # 对于 DeepSeek 视觉模型，通常需要特定的模型名称
            # 如果当前配置的是 DeepSeek 的非视觉模型，可能需要提示用户或自动切换
            model = self.model_name
            
            # 简单的模型名称修正逻辑，如果当前是 deepseek-chat 但需要视觉能力
            # 备注：具体取决于 API 提供商
            if "deepseek-chat" in model.lower():
                # 有些提供商使用 deepseek-vl 或 deepseek-v3 具有视觉能力
                # 这里保留原样，由用户配置决定，或者如果识别失败可以尝试 fallback
                pass

            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.1,  # OCR 需要更确定的结果
                max_tokens=4096
            )

            return response.choices[0].message.content
        except Exception as e:
            print(f"OCR 识别失败: {str(e)}")
            # 如果失败了，返回空字符串或错误信息，让调用方决定如何处理
            return ""

    async def generate_content_for_outline(self, outline: Dict[str, Any], project_overview: str = "") -> Dict[str, Any]:
        """为目录结构生成内容"""
        try:
            if not isinstance(outline, dict) or 'outline' not in outline:
                raise Exception("无效的outline数据格式")
            
            # 深拷贝outline数据
            import copy
            result_outline = copy.deepcopy(outline)
            
            # 递归处理目录
            await self._process_outline_recursive(result_outline['outline'], [], project_overview)
            
            return result_outline
            
        except Exception as e:
            raise Exception(f"处理过程中发生错误: {str(e)}")
    
    async def _process_outline_recursive(self, chapters: list, parent_chapters: list = None, project_overview: str = ""):
        """递归处理章节列表"""
        for chapter in chapters:
            chapter_id = chapter.get('id', 'unknown')
            chapter_title = chapter.get('title', '未命名章节')
            
            # 检查是否为叶子节点
            is_leaf = 'children' not in chapter or not chapter.get('children', [])
            
            # 准备当前章节信息
            current_chapter_info = {
                'id': chapter_id,
                'title': chapter_title,
                'description': chapter.get('description', '')
            }
            
            # 构建完整的上级章节列表
            current_parent_chapters = []
            if parent_chapters:
                current_parent_chapters.extend(parent_chapters)
            current_parent_chapters.append(current_chapter_info)
            
            if is_leaf:
                # 为叶子节点生成内容，传递同级章节信息
                content = ""
                async for chunk in self._generate_chapter_content(
                    chapter, 
                    current_parent_chapters[:-1],  # 上级章节列表（排除当前章节）
                    chapters,  # 同级章节列表
                    project_overview
                ):
                    content += chunk
                if content:
                    chapter['content'] = content
            else:
                # 递归处理子章节
                await self._process_outline_recursive(chapter['children'], current_parent_chapters, project_overview)
    
    async def _generate_chapter_content(self, chapter: dict, parent_chapters: list = None, sibling_chapters: list = None, project_overview: str = "") -> AsyncGenerator[str, None]:
        """
        为单个章节流式生成内容

        Args:
            chapter: 章节数据
            parent_chapters: 上级章节列表，每个元素包含章节id、标题和描述
            sibling_chapters: 同级章节列表，避免内容重复
            project_overview: 项目概述信息，提供项目背景和要求

        Yields:
            生成的内容流
        """
        try:
            chapter_id = chapter.get('id', 'unknown')
            chapter_title = chapter.get('title', '未命名章节')
            chapter_description = chapter.get('description', '')

            # 构建提示词
            system_prompt = """你是一个专业的标书编写专家，负责为投标文件的技术标部分生成具体内容。

要求：
1. 内容要专业、准确，与章节标题和描述保持一致
2. 这是技术方案，不是宣传报告，注意朴实无华，不要假大空
3. 语言要正式、规范，符合标书写作要求，但不要使用奇怪的连接词，不要让人觉得内容像是AI生成的
4. 内容要详细具体，避免空泛的描述
5. 注意避免与同级章节内容重复，保持内容的独特性和互补性
6. 直接返回章节内容，不生成标题，不要任何额外说明或格式标记
"""

            # 构建上下文信息
            context_info = ""
            
            # 上级章节信息
            if parent_chapters:
                context_info += "上级章节信息：\n"
                for parent in parent_chapters:
                    context_info += f"- {parent.get('id', 'unknown')} {parent.get('title', '未命名')}\n  {parent.get('description', '')}\n"
            
            # 同级章节信息（排除当前章节）
            if sibling_chapters:
                context_info += "同级章节信息（请避免内容重复）：\n"
                for sibling in sibling_chapters:
                    if sibling.get('id') != chapter_id:  # 排除当前章节
                        context_info += f"- {sibling.get('id', 'unknown')} {sibling.get('title', '未命名')}\n  {sibling.get('description', '')}\n"

            # 构建用户提示词
            project_info = ""
            if project_overview.strip():
                project_info = f"项目概述信息：\n{project_overview}\n\n"
            
            user_prompt = f"""请为以下标书章节生成具体内容：

{project_info}{context_info if context_info else ''}当前章节信息：
章节ID: {chapter_id}
章节标题: {chapter_title}
章节描述: {chapter_description}

请根据项目概述信息和上述章节层级关系，生成详细的专业内容，确保与上级章节的内容逻辑相承，同时避免与同级章节内容重复，突出本章节的独特性和技术方案的优势。"""

            # 调用AI流式生成内容
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            # 流式返回生成的文本
            async for chunk in self.stream_chat_completion(messages, temperature=0.7):
                yield chunk

        except Exception as e:
            print(f"生成章节内容时出错: {str(e)}")
            yield f"错误: {str(e)}"
            
    async def generate_outline_v2(self, overview: str, requirements: str, project_type: str = "general", project_sub_type: str = None) -> Dict[str, Any]:
        schema_json = json.dumps([
            {
                "rating_item": "原评分项",
                "new_title": "根据评分项修改的标题",
            }
        ])

        type_hints = {
            "engineering": "工程类项目：提纲应侧重于技术细节、施工方案、安全质量保证和工艺流程。",
            "service": "服务类项目：提纲应突出服务流程、团队优势、响应速度和质量承诺。",
            "goods": "货物类项目：提纲应强调产品技术参数、资质认证、供货方案和售后服务。",
            "general": "通用类项目：根据项目实际情况平衡各方面内容。"
        }
        hint = type_hints.get(project_type, type_hints["general"])
        if project_sub_type:
            hint += f" 特别针对【{project_sub_type}】细分领域进行深度优化，包含该领域特有的专业术语、行业标准和关键业务逻辑。"

        system_prompt = f"""
            ### 角色
            你是专业的标书编写专家，擅长根据项目需求编写标书。
            
            ### 任务
            1. 根据得到的项目概述(overview)和评分要求(requirements)，撰写技术标部分的一级提纲
            
            ### 行业侧重要求
            {hint}
            
            ### 说明
            1. 只设计一级标题，数量要和"评分要求"一一对应
            2. 一级标题名称要进行简单修改，不能完全使用"评分要求"中的文字
            3. 提纲结构应符合行业规范，体现专业性。

            
            ### Output Format in JSON
            {schema_json}

            """
        user_prompt = f"""
            ### 项目信息
            
            <overview>
            {overview}
            </overview>

            <requirements>
            {requirements}
            </requirements>


            直接返回json，不要任何额外说明或格式标记

            """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        # 使用通用方法进行 JSON 校验与重试（失败时抛出异常）
        full_content = await self._generate_with_json_check(
            messages=messages,
            schema=schema_json,
            max_retries=3,
            temperature=0.7,
            response_format={"type": "json_object"},
            log_prefix="一级提纲",
            raise_on_fail=True,
        )

        # 通过校验后再进行 JSON 解析
        level_l1 = json.loads(clean_json_string(full_content))

        expected_word_count = 100000
        leaf_node_count = expected_word_count // 1500
        
        # 随机重点章节
        index1, index2 = get_random_indexes(len(level_l1))

        nodes_distribution = calculate_nodes_distribution(len(level_l1), (index1, index2), leaf_node_count)
        
        # 使用信号量控制并发数，设置为 3
        semaphore = asyncio.Semaphore(3)
        
        async def sem_process_node(i, level1_node, nodes_distribution, level_l1, overview, requirements, project_type, project_sub_type):
            async with semaphore:
                return await self.process_level1_node(i, level1_node, nodes_distribution, level_l1, overview, requirements, project_type, project_sub_type)

        # 并发生成每个一级节点的提纲，保持结果顺序，受信号量限制
        tasks = [
            sem_process_node(i, level1_node, nodes_distribution, level_l1, overview, requirements, project_type, project_sub_type)
            for i, level1_node in enumerate(level_l1)
        ]
        outline = await asyncio.gather(*tasks)
        
        
        
        return {"outline": outline}
    
    async def process_level1_node(self, i, level1_node, nodes_distribution, level_l1, overview, requirements, project_type: str = "general", project_sub_type: str = None):
        """处理单个一级节点的函数"""

        # 生成json
        json_outline = generate_one_outline_json_by_level1(level1_node["new_title"], i + 1, nodes_distribution)
        print(f"正在处理第{i+1}章: {level1_node['new_title']}")
        
        # 其他标题
        other_outline = "\n".join([f"{j+1}. {node['new_title']}" 
                            for j, node in enumerate(level_l1) 
                            if j!= i])

        type_hints = {
            "engineering": "工程类：二三级目录应包含施工图纸深化、工艺工法、材料报验、进度计划、安全文明施工等。",
            "service": "服务类：二三级目录应包含组织架构、服务流程图、响应时限、人员培训、应急预案等。",
            "goods": "货物类：二三级目录应包含产品规格偏离表、生产制造工艺、质量检测报告、物流运输、三包承诺等。",
            "general": "通用类：根据一级标题逻辑深度细化。"
        }
        hint = type_hints.get(project_type, type_hints["general"])
        if project_sub_type:
            hint += f" 针对【{project_sub_type}】领域的特性，提纲应包含行业特有的流程、规范和技术细节（例如医疗类的伦理与生物安全、信息技术类的架构设计与数据迁移等）。"

        system_prompt = f"""
    ### 角色
    你是专业的标书编写专家，擅长根据项目需求编写标书。
    
    ### 任务
    1. 根据得到项目概述(overview)、评分要求(requirements)补全标书的提纲的二三级目录
    
    ### 行业细化要求
    {hint}
    
    ### 说明
    1. 你将会得到一段json，这是提纲的其中一个章节，你需要再原结构上补全标题(title)和描述(description)
    2. 二级标题根据一级标题撰写,三级标题根据二级标题撰写
    3. 补全的内容要参考项目概述(overview)、评分要求(requirements)等项目信息
    4. 你还会收到其他章节的标题(other_outline)，你需要确保本章节的内容不会包含其他章节的内容
    5. 目录层级要逻辑清晰，符合招投标文件的严肃性和专业性。
    
    ### 注意事项
    在原json上补全信息，禁止修改json结构，禁止修改一级标题

    ### Output Format in JSON
    {json_outline}

    """
        user_prompt = f"""
    ### 项目信息

    <overview>
    {overview}
    </overview>

    <requirements>
    {requirements}
    </requirements>
    
    <other_outline>
    {other_outline}
    </other_outline>


    直接返回json，不要任何额外说明或格式标记

    """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        # 使用通用方法进行 JSON 校验与重试（失败时不抛异常，保持原有“返回最后一次结果”的行为）
        full_content = await self._generate_with_json_check(
            messages=messages,
            schema=json_outline,
            max_retries=3,
            temperature=0.7,
            response_format={"type": "json_object"},
            log_prefix=f"第{i+1}章",
            raise_on_fail=False,
        )

        return json.loads(full_content.strip())