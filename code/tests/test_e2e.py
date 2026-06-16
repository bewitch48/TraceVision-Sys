"""
TraceVision 端到端 (E2E) 测试脚本
===============================
使用 requests 模拟完整的用户操作流程

用法：
    cd code
    python tests/test_e2e.py
"""
import io
import json
import os
import sys
import time
import requests

_CODE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _CODE_DIR)

API_BASE = os.environ.get("API_BASE", "http://localhost:8000")
API = f"{API_BASE}/api"

PASS = 0
FAIL = 0
RESULTS = []


def check(step: str, condition: bool, detail: str = ""):
    """断言辅助函数，收集测试结果"""
    global PASS, FAIL
    if condition:
        PASS += 1
        RESULTS.append(f"  ✅ {step}")
    else:
        FAIL += 1
        RESULTS.append(f"  ❌ {step} -- {detail}")


def make_image_bytes(w=512, h=512):
    """生成纯蓝测试图片的 PNG 字节"""
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (w, h), color=(0, 100, 255)).save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


def make_mask_bytes(w=512, h=512):
    """生成白色遮罩 PNG 字节"""
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (w, h), color=(255, 255, 255)).save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


def test_health_check():
    """E2E-01: 健康检查"""
    print("\n[E2E-01] 系统健康检查")
    try:
        r = requests.get(f"{API_BASE}/health", timeout=10)
        check("健康检查 200", r.status_code == 200)
        check("返回 status=ok", r.json().get("status") == "ok")
    except Exception as e:
        check("健康检查可用", False, str(e))


def test_logo_workflow():
    """E2E-02: 版权管理完整流程"""
    print("\n[E2E-02] 版权管理 CRUD 流程")
    try:
        # 1. 列表为空
        r = requests.get(f"{API}/logo/list", timeout=10)
        check("列表 API 可用", r.status_code == 200)
        initial_count = len(r.json().get("data", []))

        # 2. 创建版权
        img = make_image_bytes(w=64, h=64)
        r = requests.post(
            f"{API}/logo/create",
            data={"company": "E2E测试公司"},
            files={"logo_image": ("logo.png", img, "image/png")},
            timeout=10,
        )
        check("创建版权成功", r.status_code == 200)
        logo_id = r.json()["data"]["id"]
        check("返回有效 ID", isinstance(logo_id, int) and logo_id > 0)

        # 3. 查询
        r = requests.get(f"{API}/logo/{logo_id}", timeout=10)
        check("查询版权成功", r.status_code == 200)
        check("公司名匹配", r.json()["data"]["company"] == "E2E测试公司")

        # 4. 列表增加
        r = requests.get(f"{API}/logo/list", timeout=10)
        check("列表增加一项", len(r.json().get("data", [])) > initial_count)

        # 5. Logo 图片
        r = requests.get(f"{API}/logo/{logo_id}/image", timeout=10)
        check("Logo 图片可访问", r.status_code == 200)

        # 6. 删除
        r = requests.delete(f"{API}/logo/{logo_id}", timeout=10)
        check("删除版权成功", r.status_code == 200)
    except Exception as e:
        check("工作流完成", False, str(e))


def test_watermark_workflow():
    """E2E-03: 水印嵌入 → 取证分析完整流程"""
    print("\n[E2E-03] 水印嵌入 → 取证分析流程")
    try:
        img = make_image_bytes()

        # 1. 嵌入水印
        # 按 multipart/form-data 格式上传
        r = requests.post(
            f"{API}/watermark/embed",
            data={"logo_id": "1", "model_type": "clean"},
            files={"image": ("test.png", img, "image/png")},
            timeout=30,
        )
        if r.status_code == 200:
            check("水印嵌入成功", True)
            data = r.json().get("data", {})
            check("PSNR 存在", isinstance(data.get("psnr"), (int, float)))
            check("SSIM 存在", isinstance(data.get("ssim"), (int, float)))
        else:
            check("水印嵌入成功", False, f"状态码 {r.status_code}: {r.text[:200]}")

        # 2. 取证分析
        r = requests.post(
            f"{API}/extract",
            data={"threshold": "0.2", "min_area": "100", "model_type": "clean"},
            files={"image": ("test.png", img, "image/png")},
            timeout=30,
        )
        if r.status_code == 200:
            check("取证分析成功", True)
            data = r.json().get("data", {})
            check("定位图存在", "location_image" in data)
            check("水印信息存在", "watermark" in data)
        else:
            check("取证分析成功", False, f"状态码 {r.status_code}: {r.text[:200]}")
    except Exception as e:
        check("水印工作流完成", False, str(e))


def test_tamper_workflow():
    """E2E-04: 攻击模拟完整流程"""
    print("\n[E2E-04] 攻击模拟流程")
    try:
        img = make_image_bytes()

        attacks = [
            ("/tamper/noise", {"sigma": "3"}, "高斯噪声"),
            ("/tamper/jpeg", {"quality": "80"}, "JPEG压缩"),
            ("/tamper/poisson", {}, "泊松噪声"),
            ("/tamper/combo", {}, "组合攻击"),
        ]

        for path, params, name in attacks:
            r = requests.post(
                f"{API}{path}",
                data=params,
                files={"image": ("test.png", img, "image/png")},
                timeout=30,
            )
            check(f"{name} 攻击成功", r.status_code == 200, f"状态码 {r.status_code}")
    except Exception as e:
        check("攻击流程完成", False, str(e))


def test_config_endpoints():
    """E2E-05: 系统配置查询"""
    print("\n[E2E-05] 系统配置端点")
    try:
        r = requests.get(f"{API}/config/models", timeout=10)
        check("模型列表 200", r.status_code == 200)
        models = r.json().get("data", {}).get("models", [])
        check("至少 2 个模型", len(models) >= 2)

        r = requests.get(f"{API}/config/attacks", timeout=10)
        check("攻击列表 200", r.status_code == 200)
        attacks = r.json().get("data", {}).get("attacks", [])
        check("至少 4 种攻击", len(attacks) >= 4)
    except Exception as e:
        check("配置端点可用", False, str(e))


def test_error_handling():
    """E2E-06: 错误处理"""
    print("\n[E2E-06] 错误处理")
    try:
        r = requests.get(f"{API}/logo/99999", timeout=10)
        check("不存在的 ID 返回404", r.status_code == 404)

        r = requests.get(f"{API}/nonexistent_endpoint", timeout=10)
        check("不存在路由返回404", r.status_code == 404)
    except Exception as e:
        check("错误处理验证", False, str(e))


def main():
    global PASS, FAIL, RESULTS
    print("=" * 70)
    print("  TraceVision 端到端 (E2E) 测试")
    print(f"  目标主机: {API_BASE}")
    print("=" * 70)

    start = time.time()

    # 先检查服务是否可用
    try:
        r = requests.get(f"{API_BASE}/health", timeout=5)
        if r.status_code != 200:
            print(f"\n[ERROR] 后端服务不可用: {API_BASE}")
            print("请先启动后端: cd code && uvicorn api.main:app --host 0.0.0.0 --port 8000")
            return 1
    except Exception:
        print(f"\n[ERROR] 无法连接后端服务: {API_BASE}")
        print("请先启动后端: cd code && uvicorn api.main:app --host 0.0.0.0 --port 8000")
        return 1

    test_health_check()
    test_config_endpoints()
    test_logo_workflow()
    test_watermark_workflow()
    test_tamper_workflow()
    test_error_handling()

    elapsed = time.time() - start
    total = PASS + FAIL

    # 打印结果
    print("\n" + "=" * 70)
    print("  测试结果")
    print("=" * 70)
    for line in RESULTS:
        print(line)

    print(f"\n  总计: {total} 项, 通过: {PASS}, 失败: {FAIL}, 耗时: {elapsed:.1f}s")
    print(f"  通过率: {PASS / total * 100:.1f}%" if total > 0 else "  无测试结果")

    # 保存 JSON 报告
    report = {
        "type": "e2e",
        "total": total,
        "passed": PASS,
        "failed": FAIL,
        "elapsed_seconds": round(elapsed, 2),
        "pass_rate": round(PASS / total * 100, 1) if total > 0 else 0,
        "results": RESULTS,
    }
    report_path = os.path.join(_CODE_DIR, "tests", "e2e_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n  报告已保存: {report_path}")

    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
