#!/bin/bash
# 溯影 TraceVision API 启动脚本
# 用法: bash start.sh

cd "$(dirname "$0")"
echo "🚀 正在启动溯影 TraceVision API 服务..."
echo "📖 API 文档地址: http://localhost:8000/docs"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
