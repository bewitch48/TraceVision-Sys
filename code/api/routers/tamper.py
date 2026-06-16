import io
import random
import numpy as np
from PIL import Image
from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional

from api.services.tracevision_service import tracevision_service
from api.services.image_utils import bytes_to_np, np_to_base64

router = APIRouter(prefix="/api/tamper", tags=["攻击实验室"])


@router.post("/style-transfer")
async def style_transfer(
    image: UploadFile = File(...),
    prompt: str = Form(""),
):
    """全图风格迁移 - 保留原图结构，仅改变风格（通义万相 stylization_all）"""
    img = bytes_to_np(await image.read())
    result = tracevision_service.style_transfer(img, prompt or "艺术风格")
    return {"code": 200, "data": {"tampered_image": np_to_base64(result), "model_used": "wanx_stylization"}}


@router.post("/inpaint")
async def inpaint(
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    prompt: str = Form(""),
    model: str = Form("sd_inpaint")
):
    img = bytes_to_np(await image.read())
    mask_img = bytes_to_np(await mask.read())
    
    if len(mask_img.shape) == 3:
        mask_gray = np.mean(mask_img, axis=2).astype(np.uint8)
    else:
        mask_gray = mask_img.astype(np.uint8)
    
    mask_pixels = np.sum(mask_gray > 128)
    print(f"[DEBUG] Inpaint request: prompt='{prompt}', mask_pixels={mask_pixels}, image_shape={img.shape}, mask_shape={mask_gray.shape}")
    
    if mask_pixels < 100:
        print(f"[WARNING] Mask too small ({mask_pixels} pixels), returning original image")
        return {"code": 200, "data": {"tampered_image": np_to_base64(img), "model_used": model, "warning": "遮罩区域太小"}}

    result = tracevision_service.inpaint(img, mask_gray, prompt, model)

    return {"code": 200, "data": {"tampered_image": np_to_base64(result), "model_used": model}}


@router.post("/noise")
async def gaussian_noise(image: UploadFile = File(...), sigma: int = Form(5)):
    img = bytes_to_np(await image.read()).astype(np.float32)
    noise = np.random.normal(0, sigma, img.shape)
    noisy = np.clip(img + noise, 0, 255).astype(np.uint8)
    return {"code": 200, "data": {"noisy_image": np_to_base64(noisy), "sigma": sigma}}


@router.post("/jpeg")
async def jpeg_compress(image: UploadFile = File(...), quality: int = Form(80)):
    img = Image.open(io.BytesIO(await image.read())).convert("RGB")
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    compressed = np.array(Image.open(buffer).convert("RGB"))
    return {"code": 200, "data": {"jpeg_image": np_to_base64(compressed), "quality": quality}}


@router.post("/poisson")
async def poisson_noise(image: UploadFile = File(...)):
    img = bytes_to_np(await image.read()).astype(np.float32) / 255.0
    vals = 10 ** 4
    noisy = np.random.poisson(img * vals) / vals
    noisy = np.clip(noisy * 255, 0, 255).astype(np.uint8)
    return {"code": 200, "data": {"poisson_image": np_to_base64(noisy)}}


@router.post("/combo")
async def combo_attack(image: UploadFile = File(...)):
    """随机组合攻击 —— 降低强度确保水印可检测"""
    img = bytes_to_np(await image.read()).astype(np.float32)
    attacks = []

    # 随机选择 2 种攻击类型（降低到 2 种，避免 3 种叠加太强）
    choices = random.sample(["gaussian", "jpeg", "poisson"], k=random.randint(1, 2))

    for choice in choices:
        if choice == "gaussian":
            sigma = random.uniform(0.5, 3.0)  # 降低噪声强度
            img += np.random.normal(0, sigma, img.shape)
            img = np.clip(img, 0, 255)  # 防止值越界导致后续泊松分布崩溃
            attacks.append(f"gaussian({round(sigma, 1)})")
        elif choice == "jpeg":
            tmp = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
            buf = io.BytesIO()
            tmp.save(buf, format="JPEG", quality=random.randint(80, 95))  # 提高 JPEG 质量
            buf.seek(0)
            img = np.array(Image.open(buf).convert("RGB")).astype(np.float32)
            attacks.append("jpeg")
        elif choice == "poisson":
            vals = 10 ** 5  # 降低泊松噪声强度
            img = np.clip(np.random.poisson((img / 255.0) * vals) / vals * 255, 0, 255)
            attacks.append("poisson")

    result = np.clip(img, 0, 255).astype(np.uint8)
    return {"code": 200, "data": {"attacked_image": np_to_base64(result), "applied_attacks": attacks}}
