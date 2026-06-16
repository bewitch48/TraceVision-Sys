import base64
import io
import numpy as np
from PIL import Image


def pil_to_base64(img: Image.Image, fmt="PNG") -> str:
    buffer = io.BytesIO()
    img.save(buffer, format=fmt)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def base64_to_pil(b64: str) -> Image.Image:
    data = base64.b64decode(b64)
    return Image.open(io.BytesIO(data))


def np_to_base64(arr: np.ndarray, fmt="PNG") -> str:
    if arr.max() <= 1.0:
        arr = (arr * 255).astype(np.uint8)
    else:
        arr = arr.astype(np.uint8)
    img = Image.fromarray(arr)
    return pil_to_base64(img, fmt)


def base64_to_np(b64: str) -> np.ndarray:
    img = base64_to_pil(b64)
    return np.array(img.convert("RGB"))


def bytes_to_np(data: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(data))
    return np.array(img.convert("RGB"))


def np_to_bytes(arr: np.ndarray, fmt="PNG") -> bytes:
    if arr.max() <= 1.0:
        arr = (arr * 255).astype(np.uint8)
    else:
        arr = arr.astype(np.uint8)
    img = Image.fromarray(arr)
    buffer = io.BytesIO()
    img.save(buffer, format=fmt)
    return buffer.getvalue()


def calculate_residual(original: np.ndarray, watermarked: np.ndarray, magnify: int = 50):
    orig = original.astype(np.float32) / 255.0
    wm = watermarked.astype(np.float32) / 255.0
    
    # 调试信息
    print(f"[DEBUG] Original shape: {original.shape}, max: {original.max()}, min: {original.min()}")
    print(f"[DEBUG] Watermarked shape: {watermarked.shape}, max: {watermarked.max()}, min: {watermarked.min()}")
    
    diff = np.abs(orig - wm)
    print(f"[DEBUG] Diff shape: {diff.shape}, max: {diff.max()}, min: {diff.min()}, mean: {diff.mean()}")
    
    residual = np.clip(diff * magnify, 0, 1)
    max_diff = float(diff.max())
    mean_diff = float(diff.mean())
    return (residual * 255).astype(np.uint8), max_diff, mean_diff


def calculate_psnr(img1: np.ndarray, img2: np.ndarray) -> float:
    mse = np.mean((img1.astype(np.float32) - img2.astype(np.float32)) ** 2)
    if mse == 0:
        return 100.0
    return 20 * np.log10(255.0 / np.sqrt(mse))


def calculate_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    try:
        from skimage.metrics import structural_similarity as ssim
        return ssim(img1, img2, channel_axis=2, data_range=255)
    except Exception:
        # 降级：基于 PSNR 估算
        psnr = calculate_psnr(img1, img2)
        return min(1.0, psnr / 50.0)
