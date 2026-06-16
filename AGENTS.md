# TraceVision: Agent Development Guide

> **Project**: TraceVision — AIGC 数字水印与内容溯源系统  
> **Language**: Python (PyTorch) / TypeScript (React)

---

## 1. Project Overview

TraceVision is a full-stack web application for AIGC content watermarking and forensics:

1. **Tamper Localization**: Pixel-level detection of edited regions after image tampering.
2. **Copyright Protection**: Extraction of a 64-bit copyright message even after degradation.
3. **Web Interface**: React 19 + TypeScript + Vite frontend with FastAPI backend.

The core architecture combines:
- **Invertible Neural Networks (INN)** for reversible image transformation.
- **Bit Encoder/Decoder** (`DW_Encoder` / `DW_Decoder`) for message hiding.
- **Predictive Module** with Residual Blocks + Transformer Blocks for secret recovery.
- **Prompt Generation Module** for adaptive feature enhancement.
- Integration with Stable Diffusion pipelines (`diffusers`) for synthetic tampering evaluation.

---

## 2. Repository Structure

```
TraceVision/
├── code/                          # All source code
│   ├── api/                       # FastAPI backend
│   │   ├── main.py                # API entry point
│   │   ├── routers/               # API routes (logo, watermark, tamper, extract, config, report)
│   │   ├── services/              # Business logic (tracevision_service, image_utils, report, external_ai)
│   │   └── tests/                 # Test suite (unit + E2E)
│   ├── test.py                    # CLI inference script
│   ├── train.py                   # Stage-2 training (image recovery)
│   ├── train_bit.py               # Stage-1 training (bit encoding/decoding)
│   ├── maskextract.py             # Post-process: extract tamper masks from results
│   ├── options/                   # YAML configuration files
│   │   ├── options.py             # Config parser (sets CUDA, paths, etc.)
│   │   ├── test_tracevision.yml   # Test configuration
│   │   ├── train_tracevision_bit.yml   # Stage-1 training config
│   │   └── train_tracevision_image.yml # Stage-2 training config
│   ├── data/                      # Dataset loaders
│   │   ├── __init__.py            # `create_dataloader`, `create_dataset`
│   │   ├── coco_dataset.py        # Training dataset (CoCo / Vimeo90K style)
│   │   ├── coco_test_dataset.py   # Validation dataset
│   │   ├── test_dataset_td.py     # Test dataset (tamper-detection mode)
│   │   ├── data_sampler.py        # Distributed sampler
│   │   └── util.py                # Image I/O helpers
│   ├── models/                    # Network definitions
│   │   ├── __init__.py            # `create_model`
│   │   ├── IBSN.py                # Main model class `Model_VSN`
│   │   ├── base_model.py          # `BaseModel` (save/load/resume logic)
│   │   ├── networks.py            # `define_G_v2` → builds `VSN`
│   │   ├── lr_scheduler.py        # Custom LR schedulers
│   │   ├── modules/               # Sub-modules
│   │   │   ├── Inv_arch.py        # `VSN`, `InvNN`, `InvBlock`, transformers
│   │   │   ├── Subnet_constructor.py
│   │   │   ├── Quantization.py
│   │   │   ├── loss.py            # `ReconstructionLoss`, `ReconstructionMsgLoss`
│   │   │   └── common.py          # DWT / IWT utilities
│   │   └── bitnetwork/            # Bit encoder/decoder networks
│   │       ├── Encoder_U.py
│   │       ├── Decoder_U.py
│   │       └── ...
│   └── utils/                     # Utilities
│       ├── util.py                # PSNR, SSIM, tensor2img, logging, seed
│       ├── JPEG.py                # DiffJPEG wrapper (optional, try/except guarded)
│       ├── JPEG_utils.py
│       └── jpegtest.py
├── front/app/                     # React frontend
│   ├── src/
│   │   ├── pages/                 # 14 pages (Dashboard, Workbench, AttackLab, Forensics, etc.)
│   │   ├── components/            # Reusable UI components
│   │   ├── services/              # API client functions
│   │   ├── hooks/                 # Global store (useStore)
│   │   └── types/                 # TypeScript type definitions
│   └── package.json
├── checkpoints/                   # Pre-trained model storage (empty by default)
├── dataset/                       # Data storage
│   ├── examples/                  # Sample images
│   └── valAGE-Set / valAGE-Set-Mask  # Expected test data locations
├── logos/                         # Copyright logo images
├── asserts/                       # Assets (logo, result GIFs, sample videos)
├── requirements.txt               # Python dependencies
└── README.md                      # Human-facing documentation
```

---

## 3. Technology Stack

| Layer | Technology |
|-------|------------|
| Deep Learning Framework | PyTorch |
| CUDA | Required (GPU-only training/inference) |
| Diffusion Models | `diffusers` (StableDiffusionInpaintPipeline, ControlNet, SDXL, RePaint) |
| Image I/O | OpenCV, Pillow, scikit-image |
| Data Format | LMDB (optional), plain image folders |
| Backend API | FastAPI + Uvicorn |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Frontend Charts | Recharts |
| Frontend Animation | GSAP |
| Logging | Python `logging` + TensorBoard (via `tensorboardX`) |
| Distributed Training | PyTorch DDP (`torch.distributed`) |

---

## 4. Build & Run Commands

### 4.1 Environment Setup

```bash
pip install -r requirements.txt
cd front/app && npm install
```

### 4.2 Download Required Assets

1. **Pre-trained checkpoints** (place in `./checkpoints/`):
   - `clean.pth` — better fidelity, no degradation robustness.
   - `degrade.pth` — robust to Gaussian noise (σ=0-5), JPEG (Q=70-95), Poisson noise.

2. **Test dataset** (place in `./dataset/valAGE-Set` and `./dataset/valAGE-Set-Mask`):
   - Images + corresponding tamper masks.
   - `sep_testlist.txt` listing test image names.

3. **Training dataset** (for retraining):
   - COCO2017 `train2017` images.
   - Update `data_path` and `txt_path` in the YAML configs.

### 4.3 Start Web Application

```bash
# Terminal 1: Backend API
cd code/api
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd front/app
npx vite --host 0.0.0.0 --port 3000
```

Login credentials:

| Account | Password | Role |
|---------|----------|------|
| `admin` | `admin123` | Administrator |
| `guest` | `guest123` | Read-only |

### 4.4 Inference / Testing

```bash
cd code
# Clean model test
python test.py -opt options/test_tracevision.yml --ckpt ../checkpoints/clean.pth

# Extract tamper masks from results
python maskextract.py --threshold 0.2

# Degradation-robust test
python test.py -opt options/test_tracevision.yml --ckpt ../checkpoints/degrade.pth
python maskextract.py --threshold 0.4
```

Test outputs are saved to `results/test_age-set/` as PNG files with suffixes:
- `_SR.png` — reconstructed host image
- `_SR_h.png` — recovered secret (tamper localization reference)
- `_GT.png` — ground truth
- `_LR.png` — watermarked (stego) image
- `_LRGT.png` — secret ground truth

### 4.5 Training

Training is **two-stage**:

**Stage 1 — Train Bit Encoder/Decoder (BEM & BRM):**
```bash
cd code
python train_bit.py -opt options/train_tracevision_bit.yml
```

**Stage 2 — Train Image Recovery Module:**
1. Edit `options/train_tracevision_image.yml`, set `path.pretrain_model_G` to the Stage-1 checkpoint (line 87).
2. Run:
```bash
python train.py -opt options/train_tracevision_image.yml
```

### 4.6 Running Tests

```bash
# Backend unit tests
cd code && python -m pytest tests/test_backend.py -v

# Backend E2E tests (requires running backend)
cd code && python -m pytest tests/test_e2e.py -v

# Frontend tests
cd front/app && npx vitest run

# All tests
cd code && python run_tests.py
```

---

## 5. Code Organization & Module Divisions

### 5.1 Configuration System (`options/`)

- All hyperparameters live in **YAML files**.
- `options.py::parse()` reads YAML, sets `CUDA_VISIBLE_DEVICES`, expands paths, and creates output directories.
- `dict_to_nonedict()` wraps configs so missing keys return `None` instead of raising `KeyError`.

### 5.2 Data Pipeline (`data/`)

- `create_dataset()` dispatches by `mode`: `train` → `CoCoDataset`, `test` → `imageTestDataset` (coco), `td` → `imageTestDataset` (td).
- Training data expects a text file listing image paths and loads random crops of `GT_size` (default 400).
- Secret images (`LQ`) are typically a fixed blue placeholder during testing; during training they are random other images or a blue watermark image.
- Images are resized to **512×512** inside the dataset/dataloader.

### 5.3 Model Architecture (`models/`)

- **`Model_VSN`** (`IBSN.py`) is the top-level model class inheriting from `BaseModel`.
- **`VSN`** (`Inv_arch.py`) is the actual `nn.Module`:
  - `irn` — Invertible Neural Network (`InvNN`) with `InvBlock`s.
  - `bitencoder` / `bitdecoder` — U-Net style encoder/decoder for 64-bit messages.
  - `pm` — Predictive Module (ResBlocks + TransformerBlocks + optional PromptGen).
- Forward pass: host image + secret image → DWT → INN → bit-encoder → watermarked image.
- Reverse pass: watermarked image → bit-decoder (message) + DWT → INN (reverse) + predictive module → recovered host & secret.

### 5.4 Loss Functions (`models/modules/loss.py`)

- `ReconstructionLoss` — L1 / L2 / center losses for image recovery.
- `ReconstructionMsgLoss` — MSE / BCE for bit message recovery.

### 5.5 Utilities (`utils/`)

- `util.py` — Image tensor↔numpy conversion, PSNR/SSIM, logging setup, random seed, progress bar.
- `JPEG.py` — Differentiable JPEG compression (`DiffJPEG`) used during training for robustness. **Import is try/except guarded** — missing optional modules (`compression`, `decompression`) will not crash inference.

---

## 6. Development Conventions

### 6.1 Code Style

- No linter/formatter is enforced.
- Indentation: 4 spaces.
- Prefer minimal changes.

### 6.2 Naming Conventions

- `G` / `netG` — Generator / main network.
- `GT` — Ground Truth (host image).
- `LQ` — Low Quality / Secret image to hide.
- `SR` — Super-Resolution / Reconstructed host image.
- `SR_h` — Recovered secret image.
- `LR` — Watermarked (stego) image.
- `message` / `recmessage` — Original and decoded 64-bit copyright message.
- `forw_` — Forward direction (encoding).
- `back_` / `rec_` — Backward direction (decoding/recovery).

### 6.3 Key Constants

- Default image size: **512×512**.
- Message length: **64 bits** (`message_length: 64` in YAML).
- DWT (Discrete Wavelet Transform) is applied before INN; IWT after reverse INN.
- Quantization is simulated with a custom `Quantization` module during training.

---

## 7. Testing & Validation

### 7.1 Test Suites

- `code/tests/test_backend.py` — Backend unit tests (FastAPI TestClient + Mock models, no service needed).
- `code/tests/test_e2e.py` — End-to-end tests (requires running backend).
- `front/app/src/**/__tests__/**` — Frontend Vitest unit tests.

### 7.2 Evaluation Metrics

- **PSNR** between original and reconstructed images (cover, secret, stego).
- **Bit Error Rate (BER)** / Bit Accuracy for the 64-bit message.
- **Tamper Mask** extracted via pixel-wise residual thresholding.

### 7.3 Validation During Training

- `train.py` and `train_bit.py` run validation every `val_freq` iterations.
- Validation images are saved to `experiments/<name>/val_images/`.
- TensorBoard logs are written to `../tb_logger/<name>/`.

---

## 8. Path & Import Architecture

### 8.1 Backend Path Resolution

All path resolution uses `os.path.dirname(__file__)` or `Path(__file__).parent` to build absolute paths from the file's location — no hardcoded absolute paths remain.

### 8.2 Frontend API Proxy

Vite dev server proxies `/api/*` to `http://localhost:8000`. Ensure the backend is running on port 8000.

### 8.3 YAML Config Paths

Training configs use relative paths like `../dataset/train2017`. Run training scripts from the `code/` directory.

---

## 9. Security Considerations

1. **No Input Sanitization**: The API accepts file paths and binary strings without validation. Do not expose to untrusted networks.
2. **Pickle Loading**: Model checkpoints are loaded with `torch.load()`. Only load checkpoints from trusted sources.
3. **Diffusion Model Downloads**: The code auto-downloads Stable Diffusion checkpoints from Hugging Face on first use. Ensure compliance with their licenses.
4. **No Authentication**: The API server has no access control — frontend login is UI-only.
5. **Sensitive Data**: `logos/` directory and `logo_database.json` contain copyright information. Excluded via `.gitignore`.

---

## 10. Common Pitfalls for Agents

- **Working Directory Matters**: Most Python scripts must be run from `code/` because relative paths in YAML and Python code expect that layout.
- **GPU Required**: The model initialization calls `.cuda()` unconditionally. CPU-only execution is not supported without code changes.
- **Strict Load**: `train_tracevision_image.yml` sets `strict_load: False` by default; `test_tracevision.yml` sets `True`. Mismatched keys will silently fail during testing if `strict_load=True`.
- **Blue Placeholder Secret**: During testing, the secret image is a solid blue image. The recovered secret (`SR_h`) is compared against this blue reference to detect tampering. Real tampered regions will deviate from blue.
- **Two-Stage Dependency**: You cannot skip Stage-1 (bit training). Stage-2 requires pretrained BEM/BRM weights.
- **No Watermark = Detection Failure**: Images without TraceVision watermarks will report `no_watermark` diagnosis — this is expected behavior, not a bug.
- **Invisible Watermark**: The 64-bit watermark is visually imperceptible. The comparison slider in Workbench shows two nearly identical images by design.
- **Optional JPEG Module**: `utils/JPEG.py` imports `compression`/`decompression` conditionally. Missing these modules won't crash inference.
