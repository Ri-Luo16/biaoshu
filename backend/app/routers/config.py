"""配置相关API路由"""
from fastapi import APIRouter, HTTPException
from ..models.schemas import ConfigRequest, ConfigResponse, ModelListResponse
from ..services.openai_service import OpenAIService
from ..utils.config_manager import config_manager

router = APIRouter(prefix="/api/config", tags=["配置管理"])


@router.post("/save", response_model=ConfigResponse)
async def save_config(config: ConfigRequest):
    """保存OpenAI配置"""
    try:
        success = config_manager.save_config(
            api_key=config.api_key,
            base_url=config.base_url or "",
            model_name=config.model_name
        )
        
        if success:
            return ConfigResponse(success=True, message="配置保存成功")
        else:
            return ConfigResponse(success=False, message="配置保存失败")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存配置时发生错误: {str(e)}")


@router.get("/load")
async def load_config():
    """加载保存的配置"""
    try:
        config = config_manager.load_config()
        # 前端期望 {success: true, data: {...}} 格式
        return {"success": True, "data": config}
    except Exception as e:
        return {"success": False, "message": f"加载配置时发生错误: {str(e)}"}


@router.post("/models")
async def get_available_models(config: ConfigRequest):
    """获取可用的模型列表"""
    try:
        if not config.api_key:
            return {
                "success": False,
                "data": [],
                "message": "请先输入API Key"
            }

        # 临时保存配置以供OpenAI服务使用
        temp_saved = config_manager.save_config(
            api_key=config.api_key,
            base_url=config.base_url,
            model_name=config.model_name
        )

        if not temp_saved:
            return {
                "success": False,
                "data": [],
                "message": "保存临时配置失败"
            }

        # 创建OpenAI服务实例
        openai_service = OpenAIService()
        
        # 获取模型列表
        models = await openai_service.get_available_models()
        
        # 前端期望 {success: true, data: [...]} 格式
        return {
            "success": True,
            "data": models,
            "message": f"获取到 {len(models)} 个模型"
        }
        
    except Exception as e:
        return {
            "success": False,
            "data": [],
            "message": f"获取模型列表失败: {str(e)}"
        }