from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional

from api.services.tracevision_service import tracevision_service
from api.services.image_utils import bytes_to_np, np_to_base64

router = APIRouter(prefix="/api/extract", tags=["取证分析"])


@router.post("")
async def extract(
    image: UploadFile = File(...),
    threshold: float = Form(0.2),
    min_area: int = Form(100),
    model_type: Optional[str] = Form("clean")
):
    content = await image.read()
    img_np = bytes_to_np(content)

    if model_type != tracevision_service.model_type:
        tracevision_service.switch_model(model_type)

    result = tracevision_service.extract(img_np, threshold, min_area)

    return {
        "code": 200,
        "data": {
            "location_image": np_to_base64(result["location_image"]),
            "residual_heatmap": result.get("residual_heatmap"),
            "tampered_regions": result["tampered_regions"],
            "watermark": result["watermark"],
            "tamper_diagnosis": result.get("tamper_diagnosis", "none"),
            "is_global_tampering": result.get("is_global_tampering", False),
            "diagnostics": result.get("diagnostics", {})
        }
    }
