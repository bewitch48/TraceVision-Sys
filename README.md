<div align="center">
<img src="./asserts/Logo.png" alt="TraceVision Logo" width="150" height="150">

# TraceVision — AIGC 数字水印与内容溯源系统

### Versatile Image Watermarking for Tamper Localization and Copyright Protection

[!\[Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/)
[!\[PyTorch](https://img.shields.io/badge/PyTorch-2.0+-ee4c2c.svg)](https://pytorch.org/)
[!\[React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[!\[FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg)](https://fastapi.tiangolo.com/)
[!\[License](https://img.shields.io/badge/License-Research%20Only-lightgrey.svg)](#license)

</div>

\---

## 项目简介

TraceVision 是一个面向 **AIGC 内容溯源** 的数字水印与取证系统，提供完整的前后端 Web 应用。

### 核心功能

|功能|说明|
|-|-|
|**水印嵌入**|将 64-bit 不可见版权信息嵌入图像，肉眼无法察觉|
|**攻击模拟**|高斯噪声 / JPEG 压缩 / 泊松噪声 / AIGC Inpaint 篡改 / 风格迁移|
|**取证分析**|像素级篡改定位 + 64-bit 版权水印提取|
|**版权管理**|版权信息（Logo + 公司名）CRUD 管理|
|**AI 报告**|一键生成专业取证分析报告|

### 技术亮点

* **可逆神经网络 (INN)** 实现图像的可逆变换
* **Bit Encoder/Decoder** (`DW\_Encoder` / `DW\_Decoder`) 实现 64-bit 消息隐藏
* **Predictive Module** (ResBlocks + TransformerBlocks) 实现秘密信息恢复
* **Prompt Generation Module** 自适应特征增强
* 集成 Stable Diffusion pipeline 用于合成篡改评估

\---

## 系统架构

```
TraceVision/
├── code/                        # Python 后端
│   ├── api/                     # FastAPI REST 服务
│   │   ├── main.py              # 入口
│   │   ├── routers/             # 路由 (logo / watermark / tamper / extract / config / report)
│   │   ├── services/            # 业务逻辑 + 模型封装
│   │   └── tests/               # 后端测试 (unit + E2E)
│   ├── data/                    # 数据集加载器 (COCO / TestSet)
│   ├── models/                  # 模型定义 + 训练脚本
│   │   ├── modules/             # INN / Transformer / Loss / DWT
│   │   └── bitnetwork/          # Bit Encoder \& Decoder
│   ├── options/                 # YAML 配置 (train / test)
│   ├── utils/                   # 工具函数 (PSNR / SSIM / JPEG / Logging)
│   ├── train.py                 # Stage-2 训练 (图像恢复)
│   ├── train\_bit.py             # Stage-1 训练 (Bit 编解码)
│   ├── test.py                  # CLI 推理脚本
│   └── maskextract.py           # 后处理：提取篡改区域 mask
├── front/app/                   # React 前端
│   ├── src/
│   │   ├── pages/               # 14 个业务页面
│   │   ├── components/          # 可复用 UI 组件
│   │   ├── services/            # API 调用层
│   │   ├── hooks/               # 全局状态管理 (useStore)
│   │   └── types/               # TypeScript 类型定义
│   └── package.json
├── checkpoints/                 # 预训练模型 (clean.pth / degrade.pth)
├── dataset/examples/            # 示例图像
├── logos/                       # 版权 Logo 图片
├── requirements.txt             # Python 依赖
└── README.md
```

\---

## 快速启动

### 环境要求

* **Python 3.9+**
* **Node.js 18+**
* **CUDA GPU**（模型推理 \& 训练必须）
* **Windows / Linux / macOS**

### 1\. 安装依赖

```bash
# Python 后端依赖
pip install -r requirements.txt

# 前端依赖
cd front/app \&\& npm install
```

### 2\. 下载预训练模型

将模型权重文件放入 `checkpoints/` 目录：

* `clean.pth` — 高保真模型（推荐日常使用）
* `degrade.pth` — 抗退化模型（高斯噪声 σ=0-5, JPEG Q=70-95, 泊松噪声）

> 模型下载地址请参考项目 Wiki 或 Release 页面。

### 3\. 启动服务

```bash
# 终端 1：后端 API → http://localhost:8000
cd code/api
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 终端 2：前端界面 → http://localhost:3000
cd front/app
npx vite --host 0.0.0.0 --port 3000
```

访问 http://localhost:3000，使用以下测试账号登录：

|账号|密码|角色|
|-|-|-|
|`admin`|`admin123`|管理员（全部功能）|
|`guest`|`guest123`|访客（只读）|

后端 API 文档：http://localhost:8000/docs

\---

## 使用指南

### 工作台（嵌入水印）

1. 上传一张图片（支持拖拽、拍照）
2. 选择一个版权 Logo（或新建版权）
3. 点击「嵌入水印」
4. 可拖拽滑块对比原图与水印图，查看 PSNR / SSIM 指标

### 攻击实验室（模拟攻击）

对水印图施加各种攻击以测试鲁棒性：

* 基础攻击：高斯噪声、JPEG 压缩、泊松噪声、组合攻击
* AIGC 攻击：AI Inpaint 区域篡改（需下载 Stable Diffusion Inpaint 模型）

### 取证分析（篡改检测）

1. 上传待检测图像
2. 点击「开始取证分析」
3. 查看篡改区域定位、水印提取结果、置信度趋势

> 注意：只有嵌入了 TraceVision 水印的图像才能进行篡改检测。未嵌入水印的图片会提示"无法分析"。

\---

## API 概览

|模块|方法|端点|
|-|-|-|
|版权管理|`GET / POST / DELETE`|`/api/logo/\*`|
|水印嵌入|`POST`|`/api/watermark/embed`|
|对比分析|`POST`|`/api/watermark/compare`|
|攻击模拟|`POST`|`/api/tamper/{type}`|
|取证提取|`POST`|`/api/extract`|
|系统配置|`GET`|`/api/config/\*`|
|AI 报告|`POST`|`/api/report/generate`|

\---

## 测试

```bash
# 后端单元测试
cd code \&\& python -m pytest tests/test\_backend.py -v

# 后端 E2E 测试（需先启动后端服务）
cd code \&\& python -m pytest tests/test\_e2e.py -v

# 前端测试
cd front/app \&\& npx vitest run

# 一键运行全部
cd code \&\& python run\_tests.py
```

\---

## 命令行推理

```bash
cd code

# 高保真模型
python test.py -opt options/test\_tracevision.yml --ckpt ../checkpoints/clean.pth
python maskextract.py --threshold 0.2

# 抗退化模型
python test.py -opt options/test\_tracevision.yml --ckpt ../checkpoints/degrade.pth
python maskextract.py --threshold 0.4
```

输出文件格式（保存在 `results/test\_age-set/`）：

|后缀|含义|
|-|-|
|`\_SR.png`|恢复的主图像|
|`\_SR\_h.png`|恢复的秘密图像（篡改定位参考）|
|`\_GT.png`|原始主图像|
|`\_LR.png`|含水印图 (stego)|
|`\_LRGT.png`|原始秘密图像|

\---

## 训练

训练分为两个阶段：

### Stage 1：训练 Bit Encoder/Decoder (BEM \& BRM)

```bash
cd code
python train\_bit.py -opt options/train\_tracevision\_bit.yml
```

### Stage 2：训练图像恢复模块

1. 编辑 `options/train\_tracevision\_image.yml`，将 `path.pretrain\_model\_G` 指向 Stage-1 的 checkpoint
2. 运行：

```bash
python train.py -opt options/train\_tracevision\_image.yml
```

### 数据集准备

下载 [COCO2017 train2017](http://images.cocodataset.org/zips/train2017.zip)，修改配置中的 `data\_path` 和 `txt\_path`。

\---

## 技术栈

|层级|技术|
|-|-|
|深度学习框架|PyTorch 2.0+|
|扩散模型|Diffusers (StableDiffusionInpaintPipeline, ControlNet)|
|图像处理|OpenCV, Pillow, scikit-image|
|后端框架|FastAPI + Uvicorn|
|前端框架|React 19 + TypeScript + Vite|
|UI 样式|Tailwind CSS|
|图表|Recharts|
|动画|GSAP|
|日志|Python logging + TensorBoard|
|分布式训练|PyTorch DDP|



