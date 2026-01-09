from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .config import settings
from .routers import config, document, outline, content, search, expand, bidding

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="基于FastAPI的AI写标书助手后端API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

routers = [config, document, outline, content, search, expand, bidding]
for router in routers:
    app.include_router(router.router)

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.app_version
    }

app.mount("/api/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

static_path = Path("static")
API_PREFIXES = ["api/", "docs", "health"]

if static_path.exists():
    app.mount("/static", StaticFiles(directory="static/static"), name="static")
    
    @app.get("/")
    async def serve_index() -> FileResponse:
        return FileResponse("static/index.html")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str) -> FileResponse:
        if any(full_path.startswith(prefix) for prefix in API_PREFIXES):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        file_path = static_path / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        
        return FileResponse("static/index.html")
else:
    @app.get("/")
    async def api_info() -> dict[str, Any]:
        return {
            "message": f"欢迎使用 {settings.app_name} API",
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/health"
        }
