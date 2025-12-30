from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from ..models.schemas import FileUploadResponse
from ..services.file_service import FileService
from ..utils import prompt_manager
from ..services.openai_service import OpenAIService
from ..utils.config_manager import config_manager

router = APIRouter(prefix="/api/expand", tags=["标书扩写"])


class ExpandContentRequest(BaseModel):
    """内容扩展请求模型"""
    content: str
    instruction: str
    api_key: str = ""
    base_url: str = ""
    model: str = ""


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)) -> FileUploadResponse:
    """上传文档文件并提取文本内容"""
    try:
        allowed_exts = {".pdf", ".docx", ".doc", ".docm", ".png", ".jpg", ".jpeg", ".bmp", ".webp"}
        allowed_types = {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "application/vnd.ms-word.document.macroEnabled.12"
        }
        
        filename = file.filename or ""
        ext = Path(filename).suffix.lower()
        is_image = file.content_type and file.content_type.startswith("image/")
        
        if file.content_type not in allowed_types and ext not in allowed_exts and not is_image:
            return FileUploadResponse(
                success=False,
                message="不支持的文件类型，请上传PDF、Word或图片文档"
            )
        
        file_content, file_url = await FileService.process_uploaded_file(file)
        openai_service = OpenAIService()
        messages = [
            {"role": "system", "content": prompt_manager.read_expand_outline_prompt()},
            {"role": "user", "content": file_content}
        ]
        
        full_content = ""
        async for chunk in openai_service.stream_chat_completion(messages, temperature=0.7, response_format={"type": "json_object"}):
            full_content += chunk
            
        return FileUploadResponse(
            success=True,
            message=f"文件 {filename} 上传成功",
            file_content=file_content,
            file_url=file_url,
            old_outline=full_content
        )
        
    except Exception as e:
        return FileUploadResponse(success=False, message=f"文件处理失败: {e}")


@router.post("/content")
async def expand_content(request: ExpandContentRequest):
    """扩展内容"""
    try:
        # 加载配置（如果请求中没有提供API密钥）
        if not request.api_key:
            config = config_manager.load_config()
            if not config.get('api_key'):
                raise HTTPException(status_code=400, detail="请先配置OpenAI API密钥")
        
        # 创建OpenAI服务实例
        openai_service = OpenAIService()
        
        # 构建扩展提示
        system_prompt = """你是一个专业的标书内容扩写专家。
请根据用户提供的原始内容和扩写指令，对内容进行扩展和完善。

要求：
1. 保持原有内容的核心观点和结构
2. 根据扩写指令进行针对性的扩展
3. 确保扩展后的内容专业、准确、详实
4. 使用标书的专业语言风格
5. 直接返回扩展后的内容，不要添加额外说明"""

        user_prompt = f"""原始内容：
{request.content}

扩写指令：
{request.instruction}

请根据以上指令对内容进行扩写。"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # 生成扩展内容
        expanded_content = ""
        async for chunk in openai_service.stream_chat_completion(
            messages, 
            temperature=0.7,
            max_tokens=4096
        ):
            expanded_content += chunk
        
        return {
            "success": True,
            "data": expanded_content,
            "message": "内容扩展完成"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"内容扩展失败: {e}")
