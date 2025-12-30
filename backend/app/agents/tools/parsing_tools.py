import json
from typing import Dict, Any
from app.services.openai_service import OpenAIService
from app.models.bidding import TenderInfo
from app.utils.json_util import clean_json_string

SYSTEM_PROMPT = """你是一个专业的投标文件编制助手，名为"标书助手"。你的职责是帮助企业分析招标文件并生成投标响应。"""

async def read_tender_file(file_path: str) -> str:
    """读取招标文件内容"""
    # 这里可以使用 FileService 的能力，但通常 Tool 不直接处理大文件上传逻辑
    # 假设传入的是已经提取好的文本或路径
    # 如果是路径，可以使用 FileService 读取
    from app.services.file_service import FileService
    try:
        # 假设 file_path 是本地文件路径
        # FileService.extract_text_from_pdf 等方法是静态的
        if file_path.lower().endswith('.pdf'):
            return await FileService.extract_text_from_pdf(file_path)
        elif file_path.lower().endswith(('.docx', '.doc')):
            return await FileService.extract_text_from_docx(file_path)
        else:
            # 默认尝试读取文本
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
    except Exception as e:
        print(f"读取文件失败: {e}")
        return ""

async def parse_tender_structure(file_content: str, openai_service: OpenAIService) -> TenderInfo:
    """解析招标文件结构"""
    prompt = f"""请分析以下招标文件内容，提取关键信息并以JSON格式返回。
        
需提取字段说明：
- project_name: 项目名称
- project_number: 项目编号
- tender_deadline: 投标截止时间
- budget: 项目预算/招标控制价
- purchaser: 采购人
- agency: 代理机构
- qualifications: 资格要求列表 (List[str])
- evaluation_method: 评标办法简述
- technical_requirements: 核心技术规范/需求列表 (List[str])

招标文件内容片段（仅展示前15000字符）：
{file_content[:15000]} 
"""
    schema = TenderInfo.model_json_schema()
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ]
    
    response = await openai_service._generate_with_json_check(
        messages=messages,
        schema=schema,
        response_format={"type": "json_object"},
        log_prefix="Tool-ParseTender"
    )
    
    data = json.loads(clean_json_string(response))
    return TenderInfo(**data)

async def extract_key_fields(tender_info: TenderInfo) -> Dict[str, Any]:
    """提取关键字段 (辅助工具)"""
    return tender_info.model_dump(exclude_none=True)

