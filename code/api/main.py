import os
import sys

# 确保能导入 code 目录下的模块
_CODE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PROJECT_DIR = os.path.dirname(_CODE_DIR)
sys.path.insert(0, _CODE_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routers import logo, watermark, tamper, extract, config, report

app = FastAPI(
    title="溯影 TraceVision API",
    description="AIGC 主动溯源与知识产权守护系统",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件（logo 图片）
LOGO_DIR = os.path.join(_PROJECT_DIR, "logos")
os.makedirs(LOGO_DIR, exist_ok=True)
app.mount("/logos", StaticFiles(directory=LOGO_DIR), name="logos")

# 注册路由
app.include_router(logo.router)
app.include_router(watermark.router)
app.include_router(tamper.router)
app.include_router(extract.router)
app.include_router(config.router)
app.include_router(report.router)


@app.get("/")
async def root():
    return {"message": "溯影 TraceVision API 运行中", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
