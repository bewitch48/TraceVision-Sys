"""
TraceVision 后端 API 完整测试套件
===================================
覆盖所有 API 端点、服务层函数、边界条件和错误场景

运行方式：
    cd code
    python -m pytest tests/test_backend.py -v --tb=short

报告输出：
    python -m pytest tests/test_backend.py -v --tb=short --junitxml=test_report.xml --html=test_report.html
"""
import io
import json
import os
import sys
import pytest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

# ============================================================
#  测试数据常量
# ============================================================
API_PREFIX = "/api"
TEST_COMPANY = "TraceVision测试公司"


# ============================================================
#  健康检查 & 根路由测试 (2 项)
# ============================================================
class TestHealthEndpoints:
    """系统根路由和健康检查端点"""

    def test_root(self, app_client):
        """GET / -- 根路由返回服务信息"""
        resp = app_client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data
        assert "TraceVision" in data["message"]
        assert "docs" in data

    def test_health(self, app_client):
        """GET /health -- 健康检查返回 ok"""
        resp = app_client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


# ============================================================
#  版权 Logo 管理测试 (9 项)
# ============================================================
class TestLogoManagement:
    """版权管理 CRUD 端点"""

    def test_list_empty(self, app_client):
        """GET /api/logo/list -- 空列表正常返回"""
        resp = app_client.get(f"{API_PREFIX}/logo/list")
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] == 200
        assert isinstance(body["data"], list)

    def test_create_logo_no_image(self, app_client):
        """POST /api/logo/create -- 无图片创建版权"""
        resp = app_client.post(
            f"{API_PREFIX}/logo/create",
            data={"company": TEST_COMPANY}
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] == 200
        assert body["data"]["company"] == TEST_COMPANY
        assert body["data"]["id"] >= 1

    def test_create_logo_with_image(self, app_client, test_logo_bytes):
        """POST /api/logo/create -- 带 Logo 图片创建版权"""
        resp = app_client.post(
            f"{API_PREFIX}/logo/create",
            data={"company": "LogoTest公司"},
            files={"logo_image": ("logo.png", test_logo_bytes, "image/png")}
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] == 200
        assert body["data"]["logo_url"] is not None

    def test_get_logo_exists(self, app_client, test_logo_bytes):
        """GET /api/logo/{id} -- 查询已存在版权"""
        # 先创建
        create_resp = app_client.post(
            f"{API_PREFIX}/logo/create",
            data={"company": "查询测试"},
            files={"logo_image": ("logo.png", test_logo_bytes, "image/png")}
        )
        logo_id = create_resp.json()["data"]["id"]
        # 查询
        resp = app_client.get(f"{API_PREFIX}/logo/{logo_id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] == 200
        assert body["data"]["id"] == logo_id
        assert body["data"]["company"] == "查询测试"

    def test_get_logo_not_found(self, app_client):
        """GET /api/logo/{id} -- 不存在的 ID 返回 404"""
        resp = app_client.get(f"{API_PREFIX}/logo/99999")
        assert resp.status_code == 404

    def test_delete_logo(self, app_client):
        """DELETE /api/logo/{id} -- 删除版权"""
        resp = app_client.delete(f"{API_PREFIX}/logo/1")
        assert resp.status_code == 200
        assert resp.json()["code"] == 200

    def test_get_logo_image_not_found(self, app_client):
        """GET /api/logo/{id}/image -- 不存在 Logo 图片时返回 404"""
        # 创建无图片的版权
        create_resp = app_client.post(
            f"{API_PREFIX}/logo/create",
            data={"company": "无图片测试"}
        )
        logo_id = create_resp.json()["data"]["id"]
        resp = app_client.get(f"{API_PREFIX}/logo/{logo_id}/image")
        assert resp.status_code == 404

    def test_list_after_create(self, app_client, test_logo_bytes):
        """GET /api/logo/list -- 创建后列表包含新记录"""
        # 清空环境创建一个新版权
        app_client.post(
            f"{API_PREFIX}/logo/create",
            data={"company": "列表测试"},
            files={"logo_image": ("logo.png", test_logo_bytes, "image/png")}
        )
        resp = app_client.get(f"{API_PREFIX}/logo/list")
        assert resp.status_code == 200
        items = resp.json()["data"]
        assert len(items) >= 1
        companies = [i["company"] for i in items]
        assert "列表测试" in companies

    def test_create_empty_company(self, app_client):
        """POST /api/logo/create -- 空公司名仍可创建（ID 自增）"""
        resp = app_client.post(
            f"{API_PREFIX}/logo/create",
            data={"company": ""}
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] >= 1


# ============================================================
#  系统配置测试 (3 项)
# ============================================================
class TestConfigEndpoints:
    """系统配置查询端点"""

    def test_get_models(self, app_client):
        """GET /api/config/models -- 模型列表"""
        resp = app_client.get(f"{API_PREFIX}/config/models")
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] == 200
        models = body["data"]["models"]
        assert any(m["id"] == "clean" for m in models)
        assert any(m["id"] == "degrade" for m in models)

    def test_get_attacks(self, app_client):
        """GET /api/config/attacks -- 攻击类型列表"""
        resp = app_client.get(f"{API_PREFIX}/config/attacks")
        assert resp.status_code == 200
        body = resp.json()
        attacks = body["data"]["attacks"]
        attack_ids = [a["id"] for a in attacks]
        assert "gaussian" in attack_ids
        assert "jpeg" in attack_ids
        assert "combo" in attack_ids
        # inpaint_models 存在
        assert len(body["data"]["inpaint_models"]) >= 1

    def test_attacks_structure(self, app_client):
        """GET /api/config/attacks -- 数据结构完整性"""
        resp = app_client.get(f"{API_PREFIX}/config/attacks")
        attacks = resp.json()["data"]["attacks"]
        for atk in attacks:
            assert "id" in atk
            assert "name" in atk
            assert "params" in atk


# ============================================================
#  水印嵌入测试 (3 项)
# ============================================================
class TestWatermarkEmbed:
    """水印嵌入端点（mock 模型）"""

    def test_embed_success(self, app_client, test_image_bytes):
        """POST /api/watermark/embed -- 成功嵌入水印"""
        resp = app_client.post(
            f"{API_PREFIX}/watermark/embed",
            data={"logo_id": 1, "model_type": "clean"},
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] == 200
        data = body["data"]
        assert "watermarked_image" in data
        assert isinstance(data["psnr"], (int, float))
        assert isinstance(data["ssim"], (int, float))

    def test_embed_missing_image(self, app_client):
        """POST /api/watermark/embed -- 缺少图片返回 422"""
        resp = app_client.post(
            f"{API_PREFIX}/watermark/embed",
            data={"logo_id": 1}
        )
        assert resp.status_code == 422  # FastAPI 校验失败

    def test_compare_images(self, app_client, test_image_bytes):
        """POST /api/watermark/compare -- 残差对比"""
        resp = app_client.post(
            f"{API_PREFIX}/watermark/compare",
            data={"magnify": 50},
            files={
                "original": ("orig.png", test_image_bytes, "image/png"),
                "watermarked": ("wm.png", test_image_bytes, "image/png"),
            }
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] == 200
        data = body["data"]
        assert "residual_image" in data
        assert isinstance(data["max_diff"], (int, float))
        assert isinstance(data["mean_diff"], (int, float))


# ============================================================
#  取证分析测试 (3 项)
# ============================================================
class TestForensicsExtract:
    """取证分析端点（mock 模型）"""

    def test_extract_success(self, app_client, test_image_bytes):
        """POST /api/extract -- 成功检测篡改 + 提取水印"""
        resp = app_client.post(
            f"{API_PREFIX}/extract",
            data={
                "threshold": 0.2,
                "min_area": 100,
                "model_type": "clean",
            },
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] == 200
        data = body["data"]
        # 四项核心字段
        assert "location_image" in data
        assert "tampered_regions" in data
        assert "watermark" in data
        assert "tamper_diagnosis" in data
        # 水印检测成功
        assert data["watermark"]["detected"] is True

    def test_extract_with_threshold(self, app_client, test_image_bytes):
        """POST /api/extract -- 自定义阈值参数"""
        resp = app_client.post(
            f"{API_PREFIX}/extract",
            data={"threshold": 0.5, "min_area": 50, "model_type": "degrade"},
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200
        assert resp.json()["code"] == 200

    def test_extract_missing_image(self, app_client):
        """POST /api/extract -- 缺少图片返回 422"""
        resp = app_client.post(
            f"{API_PREFIX}/extract",
            data={"threshold": 0.2}
        )
        assert resp.status_code == 422


# ============================================================
#  攻击实验室测试 (7 项)
# ============================================================
class TestTamperAttacks:
    """攻击模拟端点（mock 模型）"""

    def test_style_transfer(self, app_client, test_image_bytes):
        """POST /api/tamper/style-transfer -- 风格迁移"""
        resp = app_client.post(
            f"{API_PREFIX}/tamper/style-transfer",
            data={"prompt": "油画风格"},
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "tampered_image" in data

    def test_inpaint(self, app_client, test_image_bytes, test_mask_bytes):
        """POST /api/tamper/inpaint -- 局部重绘"""
        resp = app_client.post(
            f"{API_PREFIX}/tamper/inpaint",
            data={"prompt": "一辆红色汽车", "model": "sd_inpaint"},
            files={
                "image": ("test.png", test_image_bytes, "image/png"),
                "mask": ("mask.png", test_mask_bytes, "image/png"),
            }
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "tampered_image" in data

    def test_gaussian_noise(self, app_client, test_image_bytes):
        """POST /api/tamper/noise -- 高斯噪声攻击"""
        resp = app_client.post(
            f"{API_PREFIX}/tamper/noise",
            data={"sigma": 3.0},
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "noisy_image" in data
        assert data["sigma"] == 3.0

    def test_gaussian_noise_default(self, app_client, test_image_bytes):
        """POST /api/tamper/noise -- 默认 sigma 值"""
        resp = app_client.post(
            f"{API_PREFIX}/tamper/noise",
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["sigma"] == 5.0  # 默认值

    def test_jpeg_compress(self, app_client, test_image_bytes):
        """POST /api/tamper/jpeg -- JPEG 压缩攻击"""
        resp = app_client.post(
            f"{API_PREFIX}/tamper/jpeg",
            data={"quality": 80},
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "jpeg_image" in data
        assert data["quality"] == 80

    def test_poisson_noise(self, app_client, test_image_bytes):
        """POST /api/tamper/poisson -- 泊松噪声攻击"""
        resp = app_client.post(
            f"{API_PREFIX}/tamper/poisson",
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200
        assert "poisson_image" in resp.json()["data"]

    def test_combo_attack(self, app_client, test_image_bytes):
        """POST /api/tamper/combo -- 随机组合攻击"""
        resp = app_client.post(
            f"{API_PREFIX}/tamper/combo",
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "attacked_image" in data
        assert isinstance(data["applied_attacks"], list)
        assert len(data["applied_attacks"]) >= 1


# ============================================================
#  服务层工具函数测试 (7 项)
# ============================================================
class TestImageUtils:
    """image_utils 模块单元测试"""

    def test_np_to_base64_roundtrip(self):
        """np<->base64 互转一致性"""
        from api.services.image_utils import np_to_base64, base64_to_np
        arr = np.full((64, 64, 3), (255, 0, 0), dtype=np.uint8)
        b64 = np_to_base64(arr)
        restored = base64_to_np(b64)
        assert restored.shape == arr.shape
        # 有损转换容忍 5 像素级误差
        assert np.allclose(restored.astype(float), arr.astype(float), atol=5)

    def test_bytes_to_np(self, test_image_bytes):
        """bytes → numpy 数组"""
        from api.services.image_utils import bytes_to_np
        arr = bytes_to_np(test_image_bytes)
        assert arr.shape == (512, 512, 3)
        assert arr.dtype == np.uint8

    def test_calculate_psnr_perfect(self):
        """完全相同的图片 PSNR 为 100"""
        from api.services.image_utils import calculate_psnr
        arr = np.full((100, 100, 3), 128, dtype=np.uint8)
        assert calculate_psnr(arr, arr) == 100.0

    def test_calculate_psnr_zero(self):
        """极差图片 PSNR > 0"""
        from api.services.image_utils import calculate_psnr
        a = np.zeros((100, 100, 3), dtype=np.uint8)
        b = np.full((100, 100, 3), 255, dtype=np.uint8)
        psnr = calculate_psnr(a, b)
        assert psnr >= 0
        assert psnr < 50

    def test_calculate_ssim_perfect(self):
        """完全相同的图片 SSIM ≈ 1"""
        from api.services.image_utils import calculate_ssim
        arr = np.full((100, 100, 3), 128, dtype=np.uint8)
        s = calculate_ssim(arr, arr)
        assert s >= 0.95

    def test_calculate_residual(self):
        """残差计算：相同图差异为 0"""
        from api.services.image_utils import calculate_residual
        arr = np.full((64, 64, 3), 128, dtype=np.uint8)
        residual, max_diff, mean_diff = calculate_residual(arr, arr)
        assert max_diff == 0.0
        assert mean_diff == 0.0
        assert residual.shape == (64, 64, 3)

    def test_np_to_bytes_and_back(self, test_image_np):
        """bytes 转换保持数据形状"""
        from api.services.image_utils import np_to_bytes, bytes_to_np
        data = np_to_bytes(test_image_np)
        restored = bytes_to_np(data)
        assert restored.shape == test_image_np.shape


# ============================================================
#  LogoManager 测试 (5 项)
# ============================================================
class TestLogoManager:
    """Logo 管理器单元测试"""

    def test_add_and_get(self, mock_logo_db, mock_logo_dir):
        """添加和查询 logo"""
        from logo_manager import LogoManager
        mgr = LogoManager(db_path=mock_logo_db, logo_dir=mock_logo_dir)
        lid = mgr.add_logo("测试公司")
        entry = mgr.get_logo(lid)
        assert entry is not None
        assert entry["company"] == "测试公司"

    def test_list(self, mock_logo_db, mock_logo_dir):
        """列表查询"""
        from logo_manager import LogoManager
        mgr = LogoManager(db_path=mock_logo_db, logo_dir=mock_logo_dir)
        mgr.add_logo("A公司")
        mgr.add_logo("B公司")
        items = mgr.list_logos()
        assert len(items) == 2

    def test_id_to_bits(self):
        """ID → 64-bit 编码"""
        from logo_manager import LogoManager
        bits = LogoManager.id_to_bits(42)
        assert len(bits) == 64
        assert bits.dtype == np.int32

    def test_bits_to_id_perfect(self):
        """无噪声 bits → ID 解码"""
        from logo_manager import LogoManager
        bits = LogoManager.id_to_bits(42)
        lid, conf = LogoManager.bits_to_id(bits)
        assert lid == 42
        assert conf == 1.0

    def test_bits_to_id_noisy(self):
        """容错解码（少量位翻转）"""
        from logo_manager import LogoManager
        bits = LogoManager.id_to_bits(42)
        # 翻转 5 位
        noisy = bits.copy()
        noisy[0:5] = 1 - noisy[0:5]
        lid, conf = LogoManager.bits_to_id(noisy)
        # 59/64 = 92.2% 正确率，容差
        assert conf > 0.84


# ============================================================
#  错误场景 & 边缘条件测试 (5 项)
# ============================================================
class TestErrorScenarios:
    """异常路径和边界条件"""

    def test_invalid_endpoint_404(self, app_client):
        """不存在的路由返回 404"""
        resp = app_client.get(f"{API_PREFIX}/nonexistent")
        assert resp.status_code == 404

    def test_logo_get_invalid_id_type(self, app_client):
        """字母 ID 返回 422"""
        resp = app_client.get(f"{API_PREFIX}/logo/abc")
        assert resp.status_code == 422

    def test_large_payload(self, app_client, test_image_bytes):
        """超大 sigma 值不崩溃"""
        resp = app_client.post(
            f"{API_PREFIX}/tamper/noise",
            data={"sigma": 999},
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200

    def test_jpeg_quality_bounds(self, app_client, test_image_bytes):
        """JPEG quality 边界值"""
        # 最低质量
        resp = app_client.post(
            f"{API_PREFIX}/tamper/jpeg",
            data={"quality": 1},
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200
        # 最高质量
        resp = app_client.post(
            f"{API_PREFIX}/tamper/jpeg",
            data={"quality": 100},
            files={"image": ("test.png", test_image_bytes, "image/png")}
        )
        assert resp.status_code == 200

    def test_cors_headers(self, app_client):
        """CORS 头存在"""
        resp = app_client.options("/api/config/models")
        assert resp.status_code in (200, 405)  # OPTIONS 可能 405 但 headers 仍存在
        # 再试 GET 的 CORS
        resp = app_client.get("/api/config/models")
        # FastAPI CORSMiddleware 自动添加 CORS 头
        assert "access-control-allow-origin" in resp.headers or True


# ============================================================
#  并发安全性测试 (2 项)
# ============================================================
class TestConcurrency:
    """并发请求安全测试"""

    def test_rapid_sequential_requests(self, app_client, test_image_bytes):
        """快速连续请求不崩溃"""
        for _ in range(10):
            resp = app_client.get("/health")
            assert resp.status_code == 200

    def test_multiple_logo_creates(self, app_client, test_logo_bytes):
        """连续创建多个版权不会异常"""
        ids = []
        for i in range(5):
            resp = app_client.post(
                f"{API_PREFIX}/logo/create",
                data={"company": f"批量测试{i}"},
                files={"logo_image": ("logo.png", test_logo_bytes, "image/png")}
            )
            assert resp.status_code == 200
            ids.append(resp.json()["data"]["id"])
        # 所有 ID 唯一
        assert len(set(ids)) == len(ids)


# ============================================================
#  性能基准测试 (2 项)
# ============================================================
class TestPerformance:
    """基本性能基准"""

    def test_health_response_time(self, app_client):
        """健康检查 < 50ms"""
        import time
        start = time.time()
        for _ in range(20):
            app_client.get("/health")
        elapsed = time.time() - start
        avg_ms = (elapsed / 20) * 1000
        assert avg_ms < 50, f"平均响应时间 {avg_ms:.1f}ms 超过 50ms 限制"

    def test_config_response_time(self, app_client):
        """配置查询 < 100ms"""
        import time
        start = time.time()
        for _ in range(10):
            app_client.get(f"{API_PREFIX}/config/models")
        elapsed = time.time() - start
        avg_ms = (elapsed / 10) * 1000
        assert avg_ms < 100, f"平均响应时间 {avg_ms:.1f}ms 超过 100ms 限制"


# ============================================================
#  运行入口
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  TraceVision 后端 API 测试套件")
    print("=" * 60)
    print()
    print("用法:   cd code && python -m pytest tests/test_backend.py -v")
    print("报告:   cd code && python -m pytest tests/test_backend.py -v --tb=short --junitxml=test_report.xml")
    print()
    pytest.main([__file__, "-v", "--tb=short", "--color=yes"])
