"""目录相关API路由"""
import json
import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException

from ..models.schemas import OutlineRequest
from ..services.openai_service import OpenAIService
from ..utils.config_manager import config_manager
from ..utils import prompt_manager
from ..utils.sse import sse_response

router = APIRouter(prefix="/api/outline", tags=["目录管理"])


@router.post("/generate")
async def generate_outline(request: OutlineRequest):
    """生成标书目录结构（以SSE流式返回）"""
    try:
        # 加载配置
        config = config_manager.load_config()

        if not config.get('api_key'):
            raise HTTPException(status_code=400, detail="请先配置OpenAI API密钥")

        # 创建OpenAI服务实例
        openai_service = OpenAIService()
        
        async def generate() -> AsyncGenerator[str, None]:
            try:
                # 后台计算主任务
                compute_task = asyncio.create_task(openai_service.generate_outline_v2(
                    overview=request.overview,
                    requirements=request.requirements,
                    project_type=request.project_type
                ))

                # 在等待计算完成期间发送心跳，保持连接（发送空字符串chunk）
                while not compute_task.done():
                    yield f"data: {json.dumps({'chunk': ''}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(1)

                # 计算完成
                result = await compute_task

                # 确保为字符串
                result_str = json.dumps(result, ensure_ascii=False) if isinstance(result, dict) else str(result)

                # 分片发送实际数据
                chunk_size = 128
                chunk_delay = 0.1  # 每个分片之间增加一点点延迟，增强SSE逐步展示效果
                for i in range(0, len(result_str), chunk_size):
                    piece = result_str[i:i+chunk_size]
                    yield f"data: {json.dumps({'chunk': piece}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(chunk_delay)
                # 发送结束信号
                yield "data: [DONE]\n\n"
            except Exception as e:
                # 捕获后台任务中的异常，通过 SSE 友好返回给前端
                error_message = f"目录生成失败: {e}"
                payload = {
                    "chunk": "",
                    "error": True,
                    "message": error_message,
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

        return sse_response(generate())
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"目录生成失败: {e}")


@router.post("/generate-stream")
async def generate_outline_stream(request: OutlineRequest):
    """流式生成标书目录结构"""
    try:
        # 加载配置
        config = config_manager.load_config()

        if not config.get('api_key'):
            raise HTTPException(status_code=400, detail="请先配置OpenAI API密钥")

        # 创建OpenAI服务实例
        openai_service = OpenAIService()
        
        async def generate() -> AsyncGenerator[str, None]:
            if request.uploaded_expand:
                system_prompt, user_prompt = prompt_manager.generate_outline_with_old_prompt(
                    request.overview, 
                    request.requirements, 
                    request.old_outline,
                    project_type=request.project_type
                )
            else:
                system_prompt, user_prompt = prompt_manager.generate_outline_prompt(
                    request.overview, 
                    request.requirements,
                    project_type=request.project_type
                )
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            # 流式返回目录生成结果
            async for chunk in openai_service.stream_chat_completion(
                messages, 
                temperature=0.7, 
                response_format={"type": "json_object"},
                max_tokens=4096  # 明确设置较大的 token 限制，防止大纲被截断
            ):
                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
            
            # 发送结束信号
            yield "data: [DONE]\n\n"
        
        return sse_response(generate())
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"目录生成失败: {e}")




