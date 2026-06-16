@echo off
cd /d "%~dp0"
echo 正在启动 TraceVision 后端服务...
echo 请稍候，第一次调用会加载模型（约5-10秒）
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
