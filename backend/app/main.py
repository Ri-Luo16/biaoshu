"""FastAPI应用主入口"""
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .config import settings
from .routers import config, document, outline, content, search, expand, bidding

# 创建FastAPI应用实例
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="基于FastAPI的AI写标书助手后端API"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(config.router)
app.include_router(document.router)
app.include_router(outline.router)
app.include_router(content.router)
app.include_router(search.router)
app.include_router(expand.router)
app.include_router(bidding.router)

# 健康检查端点
@app.get("/health")
async def health_check() -> dict[str, str]:
    """健康检查"""
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.app_version
    }

# 挂载上传文件目录为静态资源，以便前端访问 PDF/Word
app.mount("/api/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# 静态文件服务（用于服务前端构建文件）
static_path = Path("static")
if static_path.exists():
    # 挂载静态资源文件夹
    app.mount("/static", StaticFiles(directory="static/static"), name="static")
    
    # 处理React应用的路由（SPA路由支持）
    @app.get("/")
    async def read_index() -> FileResponse:
        """根路径，返回前端首页"""
        return FileResponse("static/index.html")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str) -> FileResponse:
        """处理React路由，所有非API路径都返回index.html"""
        # 排除API路径
        if any(full_path.startswith(p) for p in ["api/", "docs", "health"]):
            # 这些路径应该由FastAPI处理，如果到这里说明404
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # 检查是否是静态文件
        static_file = static_path / full_path
        if static_file.is_file():
            return FileResponse(str(static_file))
        
        # 对于其他所有路径，返回React应用的index.html（SPA路由）
        return FileResponse("static/index.html")
else:
    # 如果没有静态文件，返回API信息
    @app.get("/")
    async def read_root() -> dict[str, Any]:
        """根路径，返回API信息"""
        return {
            "message": f"欢迎使用 {settings.app_name} API",
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/health"
        }
