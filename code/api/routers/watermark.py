from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

from api.services.tracevision_service import tracevision_service
from api.services.image_utils import bytes_to_np, np_to_base64, calculate_residual, calculate_psnr, calculate_ssim

router = APIRouter(prefix="/api/watermark", tags=["水印嵌入"])


class EmbedResponse(BaseModel):
    code: int = 200
    message: str = "嵌入成功"
    data: dict


class CompareResponse(BaseModel):
    code: int = 200
    data: dict


@router.post("/embed", response_model=EmbedResponse)
async def embed_watermark(
    image: UploadFile = File(...),
    logo_id: int = Form(...),
    model_type: Optional[str] = Form("clean")
):
    content = await image.read()
    img_np = bytes_to_np(content)

    if model_type != tracevision_service.model_type:
        tracevision_service.switch_model(model_type)

    watermarked, psnr, ssim = tracevision_service.embed(img_np, logo_id)

    # 水印图固定 512x512，不做 resize 以避免插值破坏 INN 水印结构
    return EmbedResponse(data={
        "watermarked_image": np_to_base64(watermarked),
        "psnr": round(psnr, 2),
        "ssim": round(ssim, 4),
        "logo_id": logo_id
    })


@router.post("/compare", response_model=CompareResponse)
async def compare_images(
    original: UploadFile = File(...),
    watermarked: UploadFile = File(...),
    magnify: int = Form(50)
):
    import cv2
    orig = bytes_to_np(await original.read())
    wm = bytes_to_np(await watermarked.read())
    # 缩放到水印图尺寸（固定 512x512）再对比
    orig = cv2.resize(orig, (wm.shape[1], wm.shape[0]))

    residual, max_diff, mean_diff = calculate_residual(orig, wm, magnify)

    return CompareResponse(data={
        "residual_image": np_to_base64(residual),
        "max_diff": round(max_diff, 4),
        "mean_diff": round(mean_diff, 4)
    })
