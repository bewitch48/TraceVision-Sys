/**
 * 溯影 TraceVision API 服务层
 * 封装所有后端接口调用
 */

const API_BASE = '/api';

// ==================== 通用工具函数 ====================

/** data URL 转 Blob */
function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

/** data URL 转 File */
function dataUrlToFile(dataUrl: string, filename: string): File {
  return new File([dataUrlToBlob(dataUrl)], filename, { type: 'image/png' });
}

/** 带 base64 前缀的图片 URL 转纯 base64 */
function stripBase64Prefix(data: string): string {
  if (data.startsWith('data:')) {
    return data.split(',')[1];
  }
  return data;
}

/** base64 响应转完整 data URL */
export function toImageUrl(base64: string): string {
  if (!base64) return '';
  if (base64.startsWith('data:')) return base64;
  return `data:image/png;base64,${base64}`;
}

/** FormData 构建辅助 */
function buildForm(data: Record<string, string | Blob | number | undefined>): FormData {
  const fd = new FormData();
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && val !== null) {
      fd.append(key, typeof val === 'number' ? String(val) : val);
    }
  }
  return fd;
}

// ==================== 类型定义 ====================

export interface CopyrightItem {
  id: number;
  company: string;
  logo_url: string | null;
  created_at?: string;
}

export interface EmbedResult {
  watermarked_image: string;
  psnr: number;
  ssim: number;
  logo_id: number;
}

export interface CompareResult {
  residual_image: string;
  max_diff: number;
  mean_diff: number;
}

export interface TamperRegion {
  id: string;
  bbox: [number, number, number, number];
  color: [number, number, number];
  area: number;
}

export interface WatermarkInfo {
  detected: boolean;
  status: string;
  logo_id: number | null;
  company: string;
  logo_image: string | null;
  company_text: string;
  confidence: number;
  confidence_text: string;
  raw_bits: string;
  bit_errors: number;
}

export interface ExtractResult {
  location_image: string;
  tampered_regions: TamperRegion[];
  watermark: WatermarkInfo;
}

export interface TamperResult {
  tampered_image: string;
  model_used: string;
}

export interface NoiseResult {
  noisy_image: string;
  sigma: number;
}

export interface JpegResult {
  jpeg_image: string;
  quality: number;
}

export interface PoissonResult {
  poisson_image: string;
}

export interface ComboResult {
  attacked_image: string;
  applied_attacks: string[];
}

interface ApiResponse<T> {
  code: number;
  message?: string;
  data: T;
}

// ==================== API 请求 ====================

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API 错误 ${res.status}: ${text}`);
  }
  return res.json();
}

async function postForm<T>(endpoint: string, data: Record<string, string | Blob | number | undefined>): Promise<T> {
  const fd = buildForm(data);
  const json = await request<ApiResponse<T>>(`${API_BASE}${endpoint}`, {
    method: 'POST',
    body: fd,
  });
  return json.data;
}

async function getJson<T>(endpoint: string): Promise<T> {
  const json = await request<ApiResponse<T>>(`${API_BASE}${endpoint}`);
  return json.data;
}

// ==================== 版权 Logo 管理 ====================

/** 获取版权列表 */
export async function listLogos(): Promise<CopyrightItem[]> {
  return getJson<CopyrightItem[]>('/logo/list');
}

/** 创建版权 */
export async function createLogo(company: string, logoFile?: File): Promise<CopyrightItem> {
  const fd: Record<string, string | Blob | undefined> = { company };
  if (logoFile) fd.logo_image = logoFile;
  return postForm<CopyrightItem>('/logo/create', fd);
}

/** 删除 Logo */
export async function deleteLogo(logoId: number): Promise<void> {
  await request(`${API_BASE}/logo/${logoId}`, { method: 'DELETE' });
}

// ==================== 水印嵌入 ====================

/** 嵌入水印 - 通过 data URL */
export async function embedWatermark(
  imageDataUrl: string,
  logoId: number,
  modelType: string = 'clean'
): Promise<EmbedResult> {
  const file = dataUrlToFile(imageDataUrl, 'image.png');
  return postForm<EmbedResult>('/watermark/embed', {
    image: file,
    logo_id: logoId,
    model_type: modelType,
  });
}

/** 对比原图与水印图 */
export async function compareImages(
  originalDataUrl: string,
  watermarkedDataUrl: string,
  magnify: number = 50
): Promise<CompareResult> {
  const origFile = dataUrlToFile(originalDataUrl, 'original.png');
  const wmFile = dataUrlToFile(watermarkedDataUrl, 'watermarked.png');
  return postForm<CompareResult>('/watermark/compare', {
    original: origFile,
    watermarked: wmFile,
    magnify,
  });
}

// ==================== 取证分析 ====================

/** 提取水印 & 检测篡改 */
export async function extractForensics(
  imageDataUrl: string,
  threshold: number = 0.2,
  minArea: number = 100,
  modelType: string = 'clean'
): Promise<ExtractResult> {
  const file = dataUrlToFile(imageDataUrl, 'image.png');
  return postForm<ExtractResult>('/extract', {
    image: file,
    threshold,
    min_area: minArea,
    model_type: modelType,
  });
}

// ==================== 攻击模拟 ====================

/** SD-Inpainting 篡改 */
export async function inpaintAttack(
  imageDataUrl: string,
  maskDataUrl: string,
  prompt: string = ''
): Promise<TamperResult> {
  const imgFile = dataUrlToFile(imageDataUrl, 'image.png');
  const maskFile = dataUrlToFile(maskDataUrl, 'mask.png');
  return postForm<TamperResult>('/tamper/inpaint', {
    image: imgFile,
    mask: maskFile,
    prompt,
    model: 'sd_inpaint',
  });
}

/** 全图风格迁移 - 保留原图结构，仅改变风格 */
export async function styleTransfer(
  imageDataUrl: string,
  prompt: string = ''
): Promise<TamperResult> {
  const imgFile = dataUrlToFile(imageDataUrl, 'image.png');
  return postForm<TamperResult>('/tamper/style-transfer', {
    image: imgFile,
    prompt,
  });
}

/** 高斯噪声攻击 */
export async function gaussianNoise(
  imageDataUrl: string,
  sigma: number = 5
): Promise<NoiseResult> {
  const file = dataUrlToFile(imageDataUrl, 'image.png');
  return postForm<NoiseResult>('/tamper/noise', {
    image: file,
    sigma,
  });
}

/** JPEG 压缩攻击 */
export async function jpegCompress(
  imageDataUrl: string,
  quality: number = 80
): Promise<JpegResult> {
  const file = dataUrlToFile(imageDataUrl, 'image.png');
  return postForm<JpegResult>('/tamper/jpeg', {
    image: file,
    quality,
  });
}

/** 泊松噪声攻击 */
export async function poissonNoise(
  imageDataUrl: string
): Promise<PoissonResult> {
  const file = dataUrlToFile(imageDataUrl, 'image.png');
  return postForm<PoissonResult>('/tamper/poisson', {
    image: file,
  });
}

/** 随机组合攻击 */
export async function comboAttack(
  imageDataUrl: string
): Promise<ComboResult> {
  const file = dataUrlToFile(imageDataUrl, 'image.png');
  return postForm<ComboResult>('/tamper/combo', {
    image: file,
  });
}

// ==================== 报告生成 ====================

export interface ReportGenParams {
  type: string;
  date_start: string;
  date_end: string;
  sections: string;
  copyright_count: number;
  detection_count: number;
  alert_count: number;
  today_detections: number;
  week_alerts: number;
  uptime: string;
}

export interface ReportGenResult {
  content: string;
  type: string;
  type_name: string;
  date_start: string;
  date_end: string;
  sections: string[];
  generated_at: string;
  char_count: number;
}

/** 调用 DeepSeek 生成 AI 分析报告 */
export async function generateReport(params: ReportGenParams): Promise<ReportGenResult> {
  return postForm<ReportGenResult>('/reports/generate', params);
}
