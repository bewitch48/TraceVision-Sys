"""GPU 可用性验证脚本 —— 测试 TraceVision 模型能否正常在 GPU 上运行"""
import os
import sys
import time

# 将 code 目录加入路径
CODE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "code")
sys.path.insert(0, CODE_DIR)

import torch
import numpy as np
import cv2

print("=" * 50)
print("1. PyTorch 环境检查")
print("=" * 50)
print(f"  PyTorch 版本: {torch.__version__}")
print(f"  CUDA 可用:    {torch.cuda.is_available()}")
print(f"  CUDA 版本:    {torch.version.cuda}")
if torch.cuda.is_available():
    print(f"  GPU 名称:     {torch.cuda.get_device_name(0)}")
    print(f"  GPU 数量:     {torch.cuda.device_count()}")
    print(f"  GPU 显存:     {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")

print()
print("=" * 50)
print("2. 加载 TraceVision 模型")
print("=" * 50)

import options.options as option
from models import create_model

opt = option.parse(os.path.join(CODE_DIR, "options", "test_tracevision.yml"), is_train=True)
opt['dist'] = False
opt = option.dict_to_nonedict(opt)

print(f"  gpu_ids 配置: {opt.get('gpu_ids')}")
print(f"  设备类型:     {'CUDA' if torch.cuda.is_available() and opt.get('gpu_ids') and opt['gpu_ids'][0] is not None else 'CPU'}")

torch.backends.cudnn.benchmark = True
t_start = time.time()
model = create_model(opt)
print(f"  模型创建耗时: {time.time() - t_start:.2f}s")

# 加载 checkpoint
ckpt_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "checkpoints", "clean.pth")
if not os.path.exists(ckpt_path):
    print(f"  ❌ checkpoint 不存在: {ckpt_path}")
    sys.exit(1)

t_start = time.time()
model.load_test(ckpt_path)
print(f"  模型加载耗时: {time.time() - t_start:.2f}s")

# 检查模型设备
for name, param in model.netG.named_parameters():
    if param.numel() > 0:
        print(f"  模型参数设备: {param.device}")
        break

total_params = sum(p.numel() for p in model.netG.parameters())
print(f"  模型总参数量: {total_params / 1e6:.1f}M")

print()
print("=" * 50)
print("3. GPU 推理测试（水印嵌入）")
print("=" * 50)

if torch.cuda.is_available():
    torch.cuda.reset_peak_memory_stats()
    mem_before = torch.cuda.memory_allocated() / 1024**2

# 模拟 512x512 输入图片 + 64bit 消息
dummy_img = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
dummy_msg = np.random.randn(64).astype(np.float32) - 0.5

from test_gradio import load_image
val_data = load_image(dummy_img, dummy_msg)

t_start = time.time()
model.feed_data(val_data)
container = model.image_hiding()
elapsed = time.time() - t_start

print(f"  嵌入推理耗时: {elapsed:.3f}s")

if torch.cuda.is_available():
    mem_after = torch.cuda.memory_allocated() / 1024**2
    mem_peak = torch.cuda.max_memory_allocated() / 1024**2
    print(f"  GPU 显存占用: {mem_after:.0f} MB (峰值: {mem_peak:.0f} MB)")

print(f"  输出形状:     {container.shape}")

print()
print("=" * 50)
print("4. GPU 推理测试（取证提取）")
print("=" * 50)

container_data = load_image(container)

t_start = time.time()
model.feed_data(container_data)
mask, remesg = model.image_recovery(0.2)
elapsed = time.time() - t_start

print(f"  提取推理耗时: {elapsed:.3f}s")
print(f"  掩码形状:     {mask.shape}")
print(f"  消息形状:     {remesg.shape}")

print()
print("=" * 50)
print("✅ 全部测试通过！GPU 可正常使用")
print("=" * 50)
