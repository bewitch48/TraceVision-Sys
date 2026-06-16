"""
报告生成路由
POST /api/reports/generate - 调用 DeepSeek 生成 AI 分析报告
"""
from datetime import datetime
from fastapi import APIRouter, Form
from pydantic import BaseModel, Field

from api.services.report_service import generate_report

router = APIRouter(prefix="/api/reports", tags=["报告"])


@router.post("/generate")
async def create_report(
    type: str = Form(default="forensics"),
    date_start: str = Form(default="2026-03-01"),
    date_end: str = Form(default="2026-03-31"),
    sections: str = Form(default="metrics,ai_summary"),
    copyright_count: int = Form(default=0),
    detection_count: int = Form(default=0),
    alert_count: int = Form(default=0),
    today_detections: int = Form(default=0),
    week_alerts: int = Form(default=0),
    uptime: str = Form(default="720h"),
):
    """生成 AI 取证分析报告"""
    sections_list = [s.strip() for s in sections.split(",") if s.strip()]

    stats = {
        "copyrightCount": copyright_count,
        "detectionCount": detection_count,
        "alertCount": alert_count,
        "todayDetections": today_detections,
        "weekAlerts": week_alerts,
        "uptime": uptime,
    }

    result = generate_report(
        report_type=type,
        date_start=date_start,
        date_end=date_end,
        sections=sections_list,
        stats=stats,
    )
    result["generated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return {
        "code": 200,
        "message": "报告生成成功",
        "data": result,
    }
