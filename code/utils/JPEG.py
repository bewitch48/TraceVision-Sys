
import torch
import torch.nn as nn

from .JPEG_utils import diff_round, quality_to_factor, Quantization

# 尝试导入可微分 JPEG 模块（仅训练时使用，推理不需要）
try:
    from .compression import compress_jpeg
    from .decompression import decompress_jpeg
    _DIFF_JPEG_AVAILABLE = True
except ImportError:
    _DIFF_JPEG_AVAILABLE = False


class DiffJPEG(nn.Module):
    def __init__(self, differentiable=True, quality=75):
        super(DiffJPEG, self).__init__()
        if not _DIFF_JPEG_AVAILABLE:
            raise RuntimeError(
                "DiffJPEG 不可用：缺少 utils/compression.py 和 utils/decompression.py。"
                "请从原项目补充这两个文件，或确保只在非 JPEG 退化模式下训练/推理。"
            )
        if differentiable:
            rounding = diff_round
        else:
            rounding = torch.round
        factor = quality_to_factor(quality)
        self.compress = compress_jpeg(rounding=rounding, factor=factor)
        self.decompress = decompress_jpeg(rounding=rounding, factor=factor)

    def forward(self, x):
        org_height = x.shape[2]
        org_width = x.shape[3]
        y, cb, cr = self.compress(x)
        recovered = self.decompress(y, cb, cr, org_height, org_width)
        return recovered


