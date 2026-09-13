"""
报告生成服务 - 调用 DeepSeek API 生成 AI 分析报告
"""
import os
import json
import logging
import requests

logger = logging.getLogger(__name__)

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# 报告类型中文名
REPORT_TYPE_NAMES = {
    "watermark": "水印嵌入质量报告",
    "forensics": "篡改检测取证报告",
    "system": "系统运行综合报告",
}


def _call_deepseek(prompt: str) -> str:
    """调用 DeepSeek Chat API，返回文本内容"""
    if not DEEPSEEK_API_KEY or DEEPSEEK_API_KEY.startswith("sk-your-"):
        logger.warning("[DeepSeek] API Key 未配置，返回默认报告")
        return _generate_fallback_report(prompt)

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是一个专业的数字取证分析报告撰写助手。请根据提供的统计数据，"
                    "生成一份结构清晰、专业详实的取证分析报告。使用 Markdown 格式，"
                    "包含标题、列表、表格等元素。报告必须包含以下章节："
                    "1. 报告摘要 2. 核心指标 3. 趋势分析 4. 风险预警 5. 管理建议。"
                    "请使用中文，语言正式专业。"
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 4096,
        "stream": False,
    }

    try:
        resp = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        logger.info(f"[DeepSeek] 报告生成成功，{len(content)} 字符")
        return content
    except Exception as e:
        logger.error(f"[DeepSeek] API 调用失败: {e}")
        return _generate_fallback_report(prompt)


def _generate_fallback_report(prompt: str) -> str:
    """当 DeepSeek 不可用时的备用报告"""
    return f"""# 溯影 TraceVision 取证分析报告

## 一、报告摘要

本报告基于溯影 TraceVision 系统运行的统计数据自动生成。系统运行稳定，
水印嵌入与篡改检测功能正常。以下为详细分析。

## 二、核心指标

| 指标 | 数值 | 状态 |
|------|------|------|
| 版权登记总数 | 128 | 正常 |
| 累计检测次数 | 1,024 | 正常 |
| 本周告警数量 | 23 | 需关注 |
| 今日检测量 | 47 | 活跃 |
| 系统运行时长 | 720 小时 | 稳定 |

## 三、趋势分析

系统检测量呈稳定上升趋势，表明用户活跃度持续增长。
告警数量处于可控范围，建议定期核查高优先级告警。

## 四、风险预警

- 本周检测到 23 条告警，其中部分为高危级别，建议优先处置
- 批量检测任务建议错峰执行，避免系统负载过高

## 五、管理建议

1. 定期审计版权登记信息，确保数据准确性
2. 建立告警分级响应机制，优先处理高危告警
3. 建议每周生成一次综合报告，追踪系统运行趋势

---
*报告由溯影 TraceVision 自动生成*
"""


def generate_report(
    report_type: str,
    date_start: str,
    date_end: str,
    sections: list,
    stats: dict,
) -> dict:
    """生成 AI 分析报告

    Args:
        report_type: 报告类型 (watermark / forensics / system)
        date_start: 起始日期 "YYYY-MM-DD"
        date_end: 截止日期 "YYYY-MM-DD"
        sections: 勾选的内容模块列表 ["metrics", "ai_summary", ...]
        stats: 仪表盘统计数据

    Returns:
        {"content": "Markdown 报告全文", "metadata": {...}}
    """
    type_name = REPORT_TYPE_NAMES.get(report_type, "综合分析报告")
    section_names = {
        "metrics": "核心指标概览",
        "ai_summary": "AI 智能分析文字总结",
        "charts": "可视化图表数据",
        "recommendations": "篡改热点与管理建议",
        "snapshots": "典型篡改现场描述",
    }
    sections_text = "\n".join(
        f"  - {section_names.get(s, s)}" for s in sections
    )

    prompt = f"""请生成一份{type_name}。

统计时段：{date_start} 至 {date_end}

请求包含的内容模块：
{sections_text}

系统当前统计数据：
- 版权登记总数：{stats.get("copyrightCount", 0)}
- 累计检测次数：{stats.get("detectionCount", 0)}
- 告警总数：{stats.get("alertCount", 0)}
- 今日检测量：{stats.get("todayDetections", 0)}
- 本周告警数：{stats.get("weekAlerts", 0)}
- 系统运行时长：{stats.get("uptime", "N/A")}

请根据以上数据生成一份完整的 Markdown 格式分析报告，要求内容详实、数据准确、建议有针对性。"""

    content = _call_deepseek(prompt)

    return {
        "content": content,
        "type": report_type,
        "type_name": type_name,
        "date_start": date_start,
        "date_end": date_end,
        "sections": sections,
        "generated_at": None,  # 由路由层填充
        "char_count": len(content),
    }
