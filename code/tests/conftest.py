"""
TraceVision 测试 Fixtures 配置
提供测试客户端、模拟图像、模拟模型等共享资源
"""
import os
import sys
import io
import json
import tempfile
import pytest
import numpy as np
from PIL import Image
from unittest.mock import MagicMock, patch

# 确保 code 目录可导入
_CODE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PROJECT_DIR = os.path.dirname(_CODE_DIR)
sys.path.insert(0, _CODE_DIR)


@pytest.fixture(scope="session")
def test_image_bytes():
    """生成一张 512x512 纯蓝测试图片的 PNG 字节"""
    img = Image.new("RGB", (512, 512), color=(0, 100, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


@pytest.fixture(scope="session")
def test_image_np():
    """生成一张 512x512 纯蓝测试图片的 numpy 数组"""
    return np.full((512, 512, 3), (0, 100, 255), dtype=np.uint8)


@pytest.fixture(scope="session")
def test_mask_bytes():
    """生成一张 512x512 白色遮罩的 PNG 字节"""
    img = Image.new("RGB", (512, 512), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


@pytest.fixture(scope="session")
def test_logo_bytes():
    """生成一张 64x64 测试 Logo 的 PNG 字节"""
    img = Image.new("RGB", (64, 64), color=(255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


@pytest.fixture
def mock_logo_db():
    """创建临时 logo_database.json 用于测试"""
    fd, path = tempfile.mkstemp(suffix=".json", prefix="test_logo_db_")
    os.close(fd)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"next_id": 1, "entries": {}}, f)
    yield path
    try:
        os.remove(path)
    except OSError:
        pass


@pytest.fixture
def mock_logo_dir():
    """创建临时 logos 目录"""
    d = tempfile.mkdtemp(prefix="test_logos_")
    yield d
    import shutil
    try:
        shutil.rmtree(d, ignore_errors=True)
    except OSError:
        pass


@pytest.fixture
def app_client(mock_logo_db, mock_logo_dir):
    """创建 FastAPI TestClient 实例，mock 掉 TraceVision 模型"""
    from unittest.mock import patch as mock_patch
    from unittest.mock import Mock

    # 用 mock 替换 logo 路由中的 LogoManager
    from logo_manager import LogoManager
    mock_mgr = LogoManager(db_path=mock_logo_db, logo_dir=mock_logo_dir)

    # 动态替换路由中的 logo_mgr
    from api.routers import logo
    _original_mgr = logo.logo_mgr
    logo.logo_mgr = mock_mgr

    # 创建 mock 对象
    mock_eg = Mock()
    dummy_img = np.full((512, 512, 3), 128, dtype=np.uint8)
    mock_eg.embed.return_value = (dummy_img, 45.0, 0.99)
    mock_eg.extract.return_value = {
        "location_image": dummy_img,
        "residual_heatmap": None,
        "tampered_regions": [],
        "watermark": {
            "detected": True, "status": "检测到版权水印",
            "logo_id": 1, "company": "测试公司",
            "logo_image": None, "company_text": "版权归属：测试公司",
            "confidence": 0.95, "confidence_text": "置信度：95.0%",
            "raw_bits": "01" * 32, "bit_errors": 0,
        },
        "tamper_diagnosis": "none",
        "is_global_tampering": False,
        "diagnostics": {
            "applied_threshold": 0.2, "requested_threshold": 0.2,
            "fallback_used": False, "model_fallback_used": False,
            "non_zero_pixels": 0,
        },
    }
    mock_eg.inpaint.return_value = dummy_img
    mock_eg.style_transfer.return_value = dummy_img
    mock_eg.switch_model = Mock()
    mock_eg.model_type = "clean"

    # Mock TraceVision 服务
    with mock_patch(
        "api.services.tracevision_service.TraceVisionService.__init__", return_value=None
    ), mock_patch(
        "api.services.tracevision_service.TraceVisionService._load_model", return_value=None
    ), mock_patch(
        "api.services.tracevision_service.tracevision_service", mock_eg
    ):
        from api.main import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        yield client

    # 恢复
    logo.logo_mgr = _original_mgr
