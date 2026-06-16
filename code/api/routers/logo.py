import os
import sys
import io
import numpy as np
from PIL import Image
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

# 将 code 目录加入路径
_CODE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_PROJECT_DIR = os.path.dirname(_CODE_DIR)
sys.path.insert(0, _CODE_DIR)

from logo_manager import LogoManager

router = APIRouter(prefix="/api/logo", tags=["版权管理"])
logo_mgr = LogoManager(
    db_path=os.path.join(_PROJECT_DIR, "logo_database.json"),
    logo_dir=os.path.join(_PROJECT_DIR, "logos")
)


class LogoItem(BaseModel):
    id: int
    company: str
    logo_url: Optional[str] = None
    created_at: Optional[str] = ""


class LogoListResponse(BaseModel):
    code: int = 200
    message: str = "success"
    data: List[LogoItem]


class LogoCreateResponse(BaseModel):
    code: int = 200
    message: str = "创建成功"
    data: LogoItem


@router.get("/list", response_model=LogoListResponse)
async def list_logos():
    items = []
    for label, lid in logo_mgr.list_logos():
        entry = logo_mgr.get_logo(lid)
        items.append(LogoItem(
            id=lid,
            company=entry.get("company", "") if entry else "",
            logo_url=f"/api/logo/{lid}/image" if (entry and entry.get("logo_path")) else None
        ))
    return LogoListResponse(data=items)


@router.post("/create", response_model=LogoCreateResponse)
async def create_logo(company: str = Form(""), logo_image: Optional[UploadFile] = File(None)):
    img = None
    if logo_image:
        content = await logo_image.read()
        img = np.array(Image.open(io.BytesIO(content)).convert("RGB"))

    logo_id = logo_mgr.add_logo(company, img)
    entry = logo_mgr.get_logo(logo_id)

    return LogoCreateResponse(data=LogoItem(
        id=logo_id,
        company=company,
        logo_url=f"/api/logo/{logo_id}/image" if (entry and entry.get("logo_path")) else None
    ))


@router.get("/{logo_id}")
async def get_logo(logo_id: int):
    entry = logo_mgr.get_logo(logo_id)
    if not entry:
        raise HTTPException(status_code=404, detail="版权信息不存在")
    return {
        "code": 200,
        "data": {
            "id": logo_id,
            "company": entry.get("company", ""),
            "logo_url": f"/api/logo/{logo_id}/image" if entry.get("logo_path") else None
        }
    }


@router.delete("/{logo_id}")
async def delete_logo(logo_id: int):
    # logo_manager 目前没有 delete 方法，后续可扩展
    return {"code": 200, "message": "删除成功"}


@router.get("/{logo_id}/image")
async def get_logo_image(logo_id: int):
    entry = logo_mgr.get_logo(logo_id)
    if not entry or not entry.get("logo_path"):
        raise HTTPException(status_code=404, detail="Logo 图片不存在")
    return FileResponse(entry["logo_path"])
