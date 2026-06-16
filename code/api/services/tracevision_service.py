import os
import sys
import base64
import numpy as np
import torch
import cv2
from PIL import Image
from typing import Dict, Any

# 加载环境变量配置
try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
    env_path = os.path.join(project_dir, ".env")
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()
except FileNotFoundError:
    pass

# 设置 Hugging Face 国内镜像（AIGC 模型下载用）
os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

# 将 code 目录加入路径以导入项目模块
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_CODE_DIR = os.path.dirname(os.path.dirname(_CURRENT_DIR))
_PROJECT_DIR = os.path.dirname(_CODE_DIR)
sys.path.insert(0, _CODE_DIR)

import options.options as option
from models import create_model
from test_gradio import load_image, image_editing
from logo_manager import LogoManager
from api.services.image_utils import np_to_base64, calculate_psnr, calculate_ssim

logo_mgr = LogoManager(
    db_path=os.path.join(_PROJECT_DIR, "logo_database.json"),
    logo_dir=os.path.join(_PROJECT_DIR, "logos")
)

# AI 服务模式: local | external
AI_SERVICE = os.environ.get("AI_SERVICE", "local")


class TraceVisionService:
    """TraceVision 模型服务封装 —— 水印嵌入、取证分析"""

    # DWT 多级分解的块边界位置（3 级 Haar 小波）
    _DWT_BOUNDARIES = [128, 256, 384]
    _DWT_MARGIN = 30  # 边界附近容差（像素，加大以覆盖 DWT 伪影扩散范围）

    @staticmethod
    def _is_dwt_artifact(rx, ry, rw, rh, h, w):
        """判断检测框是否位于 DWT 块边界伪影区域
        
        伪影特征：窄条状（宽<25 或 高<25），且紧贴 DWT 块边界或图像边缘
        真实篡改区域通常是较大的矩形块，不会恰好压在边界上
        """
        # 首先过滤窄条状区域
        is_narrow = (rw < 25) or (rh < 25)
        if not is_narrow:
            return False
        
        # 同图片边缘一起检查
        all_boundaries = list(TraceVisionService._DWT_BOUNDARIES) + [0, h, w]
        
        for boundary in all_boundaries:
            # 水平边界：bbox 起点/终点在 boundary +/- margin 内
            if abs(ry - boundary) <= TraceVisionService._DWT_MARGIN or \
               abs(ry + rh - boundary) <= TraceVisionService._DWT_MARGIN:
                return True
            # 垂直边界：bbox 起点/终点在 boundary +/- margin 内
            if abs(rx - boundary) <= TraceVisionService._DWT_MARGIN or \
               abs(rx + rw - boundary) <= TraceVisionService._DWT_MARGIN:
                return True
        return False

    def __init__(self):
        self.model = None
        self.model_type = "clean"
        self._loaded = False

    def _load_model(self, model_type: str):
        if self._loaded and model_type == self.model_type and self.model is not None:
            return

        opt = option.parse(os.path.join(_CODE_DIR, "options", "test_tracevision.yml"), is_train=True)
        opt['dist'] = False
        opt = option.dict_to_nonedict(opt)
        torch.backends.cudnn.benchmark = True

        self.model = create_model(opt)

        if model_type == "clean":
            ckpt_path = os.path.join(_PROJECT_DIR, "checkpoints", "clean.pth")
        else:
            ckpt_path = os.path.join(_PROJECT_DIR, "checkpoints", "degrade.pth")

        if not os.path.exists(ckpt_path):
            raise FileNotFoundError(f"模型文件不存在: {ckpt_path}")

        self.model.load_test(ckpt_path)
        self.model_type = model_type
        self._loaded = True
        print(f"[TraceVision] 模型加载完成: {model_type}")

    def switch_model(self, model_type: str):
        self._load_model(model_type)

    def embed(self, image: np.ndarray, logo_id: int):
        self._load_model(self.model_type)
        bits = logo_mgr.id_to_bits(logo_id)
        message = bits.astype(np.float32) - 0.5
        val_data = load_image(image, message)
        self.model.feed_data(val_data)
        container = self.model.image_hiding()
        # tensor2img 内部做了 [2,1,0] 通道翻转，BGR tensor → RGB numpy
        # 此处不需要再做 cvtColor，直接返回即是 RGB
        image_resized = cv2.resize(image, (512, 512))
        psnr = calculate_psnr(image_resized, container)
        ssim = calculate_ssim(image_resized, container)
        return container, psnr, ssim

    def _postprocess_mask(self, mask: np.ndarray, threshold: float,
                          min_area: int = 100, dwt_border: int = 8) -> Dict[str, Any]:
        """对 image_recovery 返回的 mask 做后处理，模拟原版 maskextract.py 的逻辑

        参数:
            mask: image_recovery 返回的 mask, shape (H, W)，值域 0~3（三个通道之和）
            threshold: 诊断用的阈值
            min_area: 最小连通区域面积，小于此值的视为噪声
            dwt_border: DWT 边界清除宽度，设为 0 可关闭
        返回:
            dict 包含 mask_binary、residual_heatmap、regions
        """
        h, w = mask.shape
        print(f"\n[取证诊断] 阈值={threshold:.3f}, min_area={min_area}")
        print(f"[取证诊断] Mask 形状: {mask.shape}, "
              f"非零像素: {np.count_nonzero(mask)}, "
              f"最大值: {mask.max()}, 均值: {mask.mean():.4f}")

        # 将三通道累加值转为二值图（与原版 maskextract.py 一致）
        mask_binary = (mask > 0).astype(np.uint8) * 255

        # 生成残差热力图（归一化到 0~255，红色越深代表残差越大）
        residual_heatmap = None
        if mask.max() > 0:
            residual_norm = (mask.astype(np.float32) / mask.max() * 255).astype(np.uint8)
            residual_heatmap = cv2.applyColorMap(residual_norm, cv2.COLORMAP_JET)

        # DWT 边界伪影清除（可配置宽度）
        if dwt_border > 0:
            mask_binary[:dwt_border, :] = 0
            mask_binary[-dwt_border:, :] = 0
            mask_binary[:, :dwt_border] = 0
            mask_binary[:, -dwt_border:] = 0

        # 形态学开运算滤除噪点（使用较小的核，避免滤掉真实区域）
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        mask_binary = cv2.morphologyEx(mask_binary, cv2.MORPH_OPEN, kernel)

        # 连通域分析（提前执行，用于诊断篡改类型）
        contours, _ = cv2.findContours(mask_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        total_area = h * w
        non_zero_after = np.count_nonzero(mask_binary)
        after_ratio = non_zero_after / total_area

        # 统计有效连通域（面积 >= min_area）
        valid_contours = [c for c in contours if cv2.contourArea(c) >= min_area]
        valid_count = len(valid_contours)
        total_contour_area = sum(cv2.contourArea(c) for c in valid_contours)

        # 篡改类型诊断 —— 基于连通域数量，而非像素比
        # 大量碎小区域 → 信号攻击（combo/noise/jpeg 等）
        # 少量连通域覆盖 > 80% → 真正全局篡改（风格迁移等）
        # 若干中等区域 → 局部篡改
        if valid_count > 30:
            diagnosis = "signal"    # 大量小区域 = 信号攻击，不是全局篡改
        elif total_contour_area > total_area * 0.80:
            diagnosis = "global"    # 少量连通域覆盖 > 80% = 真正全局篡改
        elif valid_count > 0:
            diagnosis = "local"
        else:
            diagnosis = "none"

        print(f"[取证诊断] 后处理非零像素: {non_zero_after} ({after_ratio*100:.1f}%)")
        print(f"[取证诊断] 有效连通域: {valid_count} 个, 总面积占比: {total_contour_area/total_area*100:.1f}%")
        print(f"[取证诊断] 篡改类型: {diagnosis}")
        regions = []
        idx = 0
        is_global = (diagnosis == "global")

        color_palette = [
            (255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0),
            (128, 0, 128), (0, 255, 255), (255, 140, 0), (255, 105, 180),
        ]

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue
            # 超大轮廓（> 80%）：由 global 分支统一处理，不重复渲染
            if area > total_area * 0.8:
                continue

            rx, ry, rw, rh = cv2.boundingRect(cnt)

            # 过滤 DWT 块边界伪影（窄条状区域紧贴 128/256/384 边界）
            if self._is_dwt_artifact(rx, ry, rw, rh, h, w):
                continue

            # 过滤跨全图宽度的水平条带（DWT 块边界典型伪影）
            if rw > w * 0.9 and rh < h * 0.1:
                continue
            if rh > h * 0.9 and rw < w * 0.1:
                continue

            color = color_palette[idx % len(color_palette)]
            idx += 1
            regions.append({
                "id": f"AI-{idx}",
                "bbox": [int(rx), int(ry), int(rw), int(rh)],
                "color": [int(c) for c in color],
                "area": int(area),
                "area_pct": round(area / total_area * 100, 2),
                "is_global": False,
            })

        # 全图篡改：添加覆盖全图的标记区域
        if is_global:
            coverage = total_contour_area / total_area
            regions.append({
                "id": "global",
                "bbox": [0, 0, w, h],
                "color": [255, 0, 0],
                "area": int(total_contour_area),
                "area_pct": round(coverage * 100, 2),
                "is_global": True,
            })
            print(f"[取证诊断] 全图篡改: {coverage*100:.1f}% 像素被修改")

        print(f"[取证诊断] 检测到 {len(regions)} 个篡改区域")

        return {
            "mask_binary": mask_binary,
            "residual_heatmap": residual_heatmap,
            "regions": regions,
            "contours": contours,
            "non_zero_pixels": non_zero_after,
            "is_global": is_global,
            "diagnosis": diagnosis,
        }

    def _draw_regions(self, vis_image: np.ndarray, regions: list) -> np.ndarray:
        """在可视化图像上绘制篡改区域框和标签，全局篡改画全图虚线红框"""
        for idx, region in enumerate(regions):
            x, y, w, h = region["bbox"]
            color = tuple(region["color"])
            is_global = region.get("is_global", False)

            if is_global:
                # 全图篡改：绘制双层醒目红色边框 + 顶部居中标签
                label = "全图篡改"
                thickness = 5
                # 外层粗红框
                cv2.rectangle(vis_image, (x + 2, y + 2), (x + w - 2, y + h - 2), (0, 0, 255), thickness)
                cv2.rectangle(vis_image, (x + 6, y + 6), (x + w - 6, y + h - 6), (0, 0, 255), thickness)
                # 顶部红色标签条
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 3)
                bar_y = y + 30
                cv2.rectangle(vis_image, (x, y), (x + w, y + 50), (0, 0, 255), -1)
                cv2.putText(vis_image, label, (x + (w - tw) // 2, y + 38),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 3)
                # 四角加强标记
                corner_len = 60
                cv2.line(vis_image, (x, y), (x + corner_len, y), (0, 0, 255), 6)
                cv2.line(vis_image, (x, y), (x, y + corner_len), (0, 0, 255), 6)
                cv2.line(vis_image, (x + w, y), (x + w - corner_len, y), (0, 0, 255), 6)
                cv2.line(vis_image, (x + w, y), (x + w, y + corner_len), (0, 0, 255), 6)
                cv2.line(vis_image, (x, y + h), (x + corner_len, y + h), (0, 0, 255), 6)
                cv2.line(vis_image, (x, y + h), (x, y + h - corner_len), (0, 0, 255), 6)
                cv2.line(vis_image, (x + w, y + h), (x + w - corner_len, y + h), (0, 0, 255), 6)
                cv2.line(vis_image, (x + w, y + h), (x + w, y + h - corner_len), (0, 0, 255), 6)
                continue

            label = region["id"]
            cv2.rectangle(vis_image, (x, y), (x + w, y + h), color, 3)

            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
            cv2.rectangle(vis_image, (x, y - th - 8), (x + tw, y), color, -1)
            cv2.putText(vis_image, label, (x, y - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        return vis_image

    def _decode_watermark(self, remesg, is_global: bool = False) -> Dict[str, Any]:
        """解码 64-bit 版权水印并匹配数据库

        参数:
            remesg: 模型解码的 64-bit 张量
            is_global: 是否全图篡改（全局篡改时降低置信度门槛至 0.4）
        """
        bits = remesg.cpu().numpy()[0].astype(int)
        logo_id, confidence = logo_mgr.bits_to_id(bits)

        # 全图篡改时降低置信度门槛
        threshold = 0.4 if is_global else 0.5

        result = {
            "detected": False,
            "status": "❌ 未检测到有效版权水印",
            "logo_id": None,
            "company": "",
            "logo_image": None,
            "company_text": "",
            "confidence": 0.0,
            "confidence_text": "",
            "raw_bits": "".join([str(b) for b in bits]),
            "bit_errors": 0
        }

        if logo_id is not None and confidence > threshold:
            entry = logo_mgr.get_logo(logo_id)
            if entry:
                company = entry.get("company", "未知")
                logo_path = entry.get("logo_path")
                result.update({
                    "detected": True,
                    "status": "✅ 检测到版权水印",
                    "logo_id": logo_id,
                    "company": company,
                    "company_text": f"该图像版权归属：{company}",
                    "confidence": confidence,
                    "confidence_text": f"水印置信度：{confidence*100:.1f}%"
                })
                if logo_path and os.path.exists(logo_path):
                    logo_img = np.array(Image.open(logo_path).convert("RGB"))
                    result["logo_image"] = np_to_base64(logo_img)
            elif logo_id == 0:
                # ID=0 为默认空水印，在数据库中无记录但解码有效
                result.update({
                    "detected": True,
                    "status": "✅ 检测到默认版权水印（ID=0）",
                    "logo_id": 0,
                    "company": "默认水印",
                    "company_text": "该图像嵌入了默认水印（ID=0），建议在「版权管理」中注册正式版权信息",
                    "confidence": confidence,
                    "confidence_text": f"水印置信度：{confidence*100:.1f}%"
                })
            else:
                result["status"] = "⚠️ 检测到水印，但ID不在数据库中"
                result["logo_id"] = logo_id
                result["confidence"] = confidence
                result["confidence_text"] = f"水印置信度：{confidence*100:.1f}%"
        else:
            result["confidence"] = confidence
            if confidence > 0:
                result["confidence_text"] = f"水印置信度：{confidence*100:.1f}%"

        return result

    def extract(self, image: np.ndarray, threshold: float = 0.2,
                min_area: int = 100) -> Dict[str, Any]:
        """取证分析：对水印化后的图像检测篡改区域并提取版权水印

        完整复现 TraceVision 的 image_recovery() + maskextract.py 流程：
        1. 调用模型逆向恢复 secret 并计算篡改残差
        2. 按原版 maskextract.py 的方式二值化 + 连通域分析
        3. 若初始阈值无检测结果，自动降阈值重试
        4. 生成可视化定位图 + 残差热力图
        5. 解码 64-bit 版权水印
        """
        orig_h, orig_w = image.shape[:2]

        self._load_model(self.model_type)
        # 用 load_image 喂数据（与 embed 路径一致，保持 BGR tensor 格式）
        # 这样 image_recovery 的 INN 逆向才能正确恢复 secret
        container_data = load_image(image)
        self.model.feed_data(container_data)

        # 用指定阈值调用 image_recovery（与 Gradio demo 的 revealing 函数一致）
        primary_results = None
        applied_threshold = threshold

        # 第一轮：使用用户指定的阈值
        mask, remesg = self.model.image_recovery(threshold)
        # 诊断日志：检查 rec_loc 和 template 的实际值
        if self.model.rec_loc is not None and self.model.template is not None:
            t = self.model.template.squeeze()
            r = self.model.rec_loc.squeeze()
            adiff = (r - t).abs()
            print(f"[取证诊断] template range=[{t.min():.4f},{t.max():.4f}], rec_loc range=[{r.min():.4f},{r.max():.4f}]")
            print(f"[取证诊断] |rec_loc - template| mean={adiff.mean():.4f}, >0.2={((adiff > 0.2)).float().mean():.4f}")
            for ci, cn in enumerate(['R', 'G', 'B']):
                print(f"[取证诊断]   {cn}: t={t[ci].mean():.4f}, r={r[ci].mean():.4f}, diff_mean={(r[ci]-t[ci]).abs().mean():.4f}")
        primary_results = self._postprocess_mask(mask, threshold, min_area, dwt_border=8)
        # 保存 Clean 模型在原始阈值下的结果，用于后续模型回退判断
        # 不随降阈值循环被覆盖，避免降阈值后的假阳性触发错误的 Degrade 回退
        clean_model_result = primary_results

        # 如果没有检测到区域，自动降低阈值重试
        fallback_used = False
        fallback_thresholds = [0.1]  # 最多降至 0.1，避免 0.05 引入模型基底噪声
        for fb_th in fallback_thresholds:
            if fb_th >= threshold:
                continue
            # 非零像素为 0 意味着图像完全无损，无需降阈值
            if primary_results["non_zero_pixels"] == 0:
                break
            if len(primary_results["regions"]) > 0:
                break
            print(f"[取证诊断] 阈值 {threshold} 无检测结果，自动降为 {fb_th} 重试...")
            mask_fb, _ = self.model.image_recovery(fb_th)
            # 降阈值时使用更大的 min_area 过滤噪声
            fallback_min_area = max(min_area, 250)
            primary_results = self._postprocess_mask(mask_fb, fb_th, fallback_min_area, dwt_border=8)
            applied_threshold = fb_th
            fallback_used = True

        if fallback_used and len(primary_results["regions"]) == 0:
            print("[取证诊断] [WARN] 所有阈值均未检测到篡改区域，请检查：")
            print("  1. 图片是否经过 TraceVision 水印嵌入")
            print("  2. 模型 checkpoint 是否包含完整权重（irn + pm + bitencoder + bitdecoder）")
            print("  3. 篡改幅度是否过小")

        # 智能模型回退：Clean 模型检测不到篡改时自动切 Degrade 重试
        # 风格迁移、重度噪声等全局攻击需要 Degrade 模型的鲁棒性
        # 但仅在残差信号足够大时触发（非零像素 > 1000），避免模型噪声误触发
        model_fallback_used = False
        if (len(clean_model_result["regions"]) == 0 and
            clean_model_result["non_zero_pixels"] > 1000 and
            self.model_type == "clean"):
            print("[取证诊断] Clean 模型检测到残差但无连通域，切换 Degrade 模型重试...")
            self._load_model("degrade")
            old_model = "clean"
            model_fallback_used = True
            # Degrade 模型使用更高的阈值（0.4），匹配原始 Gradio demo
            degrade_threshold = 0.4
            print(f"[取证诊断] Degrade 模型使用阈值: {degrade_threshold}")

            container_data2 = load_image(image)
            self.model.feed_data(container_data2)
            mask2, remesg2 = self.model.image_recovery(degrade_threshold)
            primary_results2 = self._postprocess_mask(mask2, degrade_threshold, min_area, dwt_border=8)

            # Degrade 检出更多区域时替换结果
            if len(primary_results2["regions"]) > 0 or primary_results2["non_zero_pixels"] > primary_results["non_zero_pixels"]:
                print(f"[取证诊断] Degrade 模型更好的结果: regions={len(primary_results2['regions'])}, non_zero={primary_results2['non_zero_pixels']}")
                primary_results = primary_results2
                remesg = remesg2
                applied_threshold = applied_threshold  # 保持不变
            else:
                print(f"[取证诊断] Clean 模型结果已是最优，保持")
                model_fallback_used = False

        # 绘制可视化定位图
        vis_image = image.copy()
        vis_image = self._draw_regions(vis_image, primary_results["regions"])

        # 解码水印（全图篡改时传入 is_global 降低置信度门槛）
        watermark_result = self._decode_watermark(remesg, is_global=primary_results.get("is_global", False))

        # 水印未检测到：图像没有嵌入过 TraceVision 水印
        # 此时不应报告"篡改"，而应告知用户无法分析
        if not watermark_result.get("detected", False):
            primary_results["diagnosis"] = "no_watermark"
            primary_results["regions"] = []
            primary_results["is_global"] = False
            print(f"[取证诊断] 未检测到水印，判定为未嵌入水印，无法进行篡改分析")

        # 生成残差热力图的 base64
        residual_map_b64 = None
        if primary_results["residual_heatmap"] is not None:
            residual_map_b64 = np_to_base64(primary_results["residual_heatmap"])

        return {
            "location_image": vis_image,
            "residual_heatmap": residual_map_b64,
            "tampered_regions": primary_results["regions"],
            "watermark": watermark_result,
            "tamper_diagnosis": primary_results.get("diagnosis", "none"),
            "is_global_tampering": primary_results.get("is_global", False),
            "diagnostics": {
                "applied_threshold": applied_threshold,
                "requested_threshold": threshold,
                "fallback_used": fallback_used,
                "model_fallback_used": model_fallback_used,
                "non_zero_pixels": primary_results["non_zero_pixels"],
            }
        }

    def inpaint(self, image: np.ndarray, mask: np.ndarray, prompt: str, model: str = "sd_inpaint") -> np.ndarray:
        print(f"[DEBUG] AI_SERVICE: {AI_SERVICE}")
        print(f"[DEBUG] 提示词: {prompt}")
        print(f"[DEBUG] 遮罩尺寸: {mask.shape}, 遮罩白色像素: {np.sum(mask > 0)}")
        
        if AI_SERVICE == "external":
            print("[DEBUG] 使用外部 API")
            return self._inpaint_external(image, mask, prompt)
        else:
            print("[DEBUG] 使用本地模型")
            return image_editing(image, mask, prompt)
    
    def style_transfer(self, image: np.ndarray, prompt: str) -> np.ndarray:
        """全图风格迁移 - 保留原图结构，仅改变风格"""
        print(f"[DEBUG] 风格迁移 - 提示词: {prompt}")
        
        if AI_SERVICE == "external":
            return self._style_transfer_external(image, prompt)
        else:
            # 本地模式：回退到 img2img（如果可用）
            print("[DEBUG] 本地模式暂不支持风格迁移，返回原图")
            return image
    
    def _inpaint_external(self, image: np.ndarray, mask: np.ndarray, prompt: str) -> np.ndarray:
        from api.services.external_ai_service import external_ai_service
        import cv2
        
        # 记录原始尺寸
        h, w = image.shape[:2]
        
        # 通义万相要求 512-4096，统一 resize 到安全尺寸
        MIN_SIZE = 512
        MAX_SIZE = 2048
        print(f"[DEBUG] 原始尺寸 - 图片: {w}x{h}, 遮罩: {mask.shape[1]}x{mask.shape[0]}")
        
        # 确保遮罩和图片尺寸一致（无条件执行）
        mask_h, mask_w = mask.shape[:2]
        if mask_h != h or mask_w != w:
            print(f"[DEBUG] 遮罩尺寸不匹配: 图片 {w}x{h}, 遮罩 {mask_w}x{mask_h}，强制对齐")
            mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
        
        # 无条件缩放到 512-2048 范围
        orig_h, orig_w = h, w
        scale_factor = 1.0
        if min(h, w) < MIN_SIZE:
            scale_factor = MIN_SIZE / min(h, w)
        elif max(h, w) > MAX_SIZE:
            scale_factor = MAX_SIZE / max(h, w)
        
        if scale_factor != 1.0:
            new_w, new_h = int(w * scale_factor), int(h * scale_factor)
            print(f"[DEBUG] 缩放图片 {w}x{h} → {new_w}x{new_h} (factor={scale_factor:.2f})")
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            mask = cv2.resize(mask, (new_w, new_h), interpolation=cv2.INTER_NEAREST)
        
        image_base64 = np_to_base64(image).split(",")[-1]
        mask_rgb = np.stack([mask] * 3, axis=-1)
        mask_base64 = np_to_base64(mask_rgb).split(",")[-1]
        
        result_base64 = external_ai_service.inpaint(image_base64, mask_base64, prompt)
        
        import base64
        import io
        image_bytes = base64.b64decode(result_base64)
        img = Image.open(io.BytesIO(image_bytes))
        result = np.array(img.convert("RGB"))
        
        # 如果缩放比例不是1，缩回原始尺寸
        if scale_factor != 1.0:
            print(f"[DEBUG] 结果缩回原始尺寸 {orig_w}x{orig_h}")
            result = cv2.resize(result, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
        
        return result

    def _style_transfer_external(self, image: np.ndarray, prompt: str) -> np.ndarray:
        """通过通义万相 stylization_all 进行全图风格迁移（与测试脚本完全一致的流程）"""
        from api.services.external_ai_service import external_ai_service
        import io as _io
        
        h, w = image.shape[:2]
        print(f"[DEBUG] 风格迁移原始尺寸: {w}x{h}")
        
        # 与测试脚本完全一致：PIL convert RGB + resize 512x512
        img = Image.fromarray(image).convert("RGB").resize((512, 512))
        
        # 直接用 PIL 编码为 PNG base64（和测试脚本一样）
        buf = _io.BytesIO()
        img.save(buf, format="PNG")
        image_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        
        result_base64 = external_ai_service.style_transfer(image_base64, prompt)
        
        image_bytes = base64.b64decode(result_base64)
        result_img = Image.open(_io.BytesIO(image_bytes)).convert("RGB")
        result = np.array(result_img)
        
        # 缩回原始尺寸
        if (result.shape[1], result.shape[0]) != (w, h):
            import cv2
            result = cv2.resize(result, (w, h), interpolation=cv2.INTER_LINEAR)
        
        return result


# 全局单例
tracevision_service = TraceVisionService()
