from fastapi import APIRouter

router = APIRouter(prefix="/api/config", tags=["系统配置"])


@router.get("/models")
async def get_models():
    return {
        "code": 200,
        "data": {
            "models": [
                {"id": "clean", "name": "Clean Model", "description": "高保真，无退化，适合干净场景"},
                {"id": "degrade", "name": "Degrade Model", "description": "抗噪声/JPEG/泊松，适合攻击场景"}
            ]
        }
    }


@router.get("/attacks")
async def get_attacks():
    return {
        "code": 200,
        "data": {
            "attacks": [
                {"id": "gaussian", "name": "高斯噪声", "params": {"sigma": {"min": 1, "max": 15, "default": 5}}},
                {"id": "jpeg", "name": "JPEG压缩", "params": {"quality": {"min": 50, "max": 95, "default": 80}}},
                {"id": "poisson", "name": "泊松噪声", "params": {}},
                {"id": "combo", "name": "随机组合攻击", "params": {}}
            ],
            "inpaint_models": [
                {"id": "sd_inpaint", "name": "SD Inpainting"},
                {"id": "controlnet", "name": "ControlNet"},
                {"id": "sdxl", "name": "SDXL"},
                {"id": "repaint", "name": "RePaint"}
            ]
        }
    }
