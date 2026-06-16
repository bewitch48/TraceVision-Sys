/**
 * 前端 API 服务层单元测试
 * 测试 api.ts 中的所有工具函数和 API 调用
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  toImageUrl,
  listLogos,
  createLogo,
  embedWatermark,
  extractForensics,
  compareImages,
} from '@/services/api';

// ---- 辅助函数测试 ----
describe('API 工具函数', () => {

  describe('toImageUrl', () => {
    it('空字符串返回空字符串', () => {
      expect(toImageUrl('')).toBe('');
    });

    it('已有 data: 前缀的原样返回', () => {
      const input = 'data:image/png;base64,abc123';
      expect(toImageUrl(input)).toBe(input);
    });

    it('纯 base64 自动补 data: 前缀', () => {
      const input = 'abc123def';
      expect(toImageUrl(input)).toBe('data:image/png;base64,abc123def');
    });
  });
});

// ---- API 调用测试 ----
describe('API 调用函数', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (global.fetch as any).mockReset();
  });

  const mockJsonResponse = (data: any) => ({
    ok: true,
    json: () => Promise.resolve({ code: 200, data }),
  });

  describe('listLogos', () => {
    it('成功获取版权列表', async () => {
      const mockData = [
        { id: 1, company: 'A公司', logo_url: '/logos/1.png' },
        { id: 2, company: 'B公司', logo_url: null },
      ];
      (global.fetch as any).mockResolvedValue(mockJsonResponse(mockData));

      const result = await listLogos();
      expect(result).toHaveLength(2);
      expect(result[0].company).toBe('A公司');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/logo/list'),
        undefined
      );
    });

    it('API 错误时抛出异常', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });
      await expect(listLogos()).rejects.toThrow('API 错误 500');
    });
  });

  describe('createLogo', () => {
    it('创建版权成功', async () => {
      const mockData = { id: 3, company: '新公司', logo_url: '/logos/3.png' };
      (global.fetch as any).mockResolvedValue(mockJsonResponse(mockData));

      const result = await createLogo('新公司');
      expect(result.id).toBe(3);
      expect(result.company).toBe('新公司');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/logo/create'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('embedWatermark', () => {
    it('嵌入水印成功返回结果', async () => {
      const mockData = {
        watermarked_image: 'base64data',
        psnr: 42.5,
        ssim: 0.99,
        logo_id: 1,
      };
      (global.fetch as any).mockResolvedValue(mockJsonResponse(mockData));

      const result = await embedWatermark('data:image/png;base64,xxx', 1, 'clean');
      expect(result.psnr).toBe(42.5);
      expect(result.ssim).toBe(0.99);
      expect(result.logo_id).toBe(1);
    });
  });

  describe('extractForensics', () => {
    it('取证分析返回完整结果', async () => {
      const mockData = {
        location_image: 'base64loc',
        tampered_regions: [],
        watermark: {
          detected: true,
          status: '✅',
          logo_id: 1,
          company: 'Test',
          logo_image: null,
          company_text: '版权归属: Test',
          confidence: 0.95,
          confidence_text: '置信度: 95.0%',
          raw_bits: '01'.repeat(32),
          bit_errors: 0,
        },
      };
      (global.fetch as any).mockResolvedValue(mockJsonResponse(mockData));

      const result = await extractForensics('data:image/png;base64,xxx');
      expect(result.watermark.detected).toBe(true);
      expect(result.watermark.logo_id).toBe(1);
    });
  });

  describe('compareImages', () => {
    it('对比图片返回残差数据', async () => {
      const mockData = {
        residual_image: 'base64res',
        max_diff: 0.05,
        mean_diff: 0.01,
      };
      (global.fetch as any).mockResolvedValue(mockJsonResponse(mockData));

      const result = await compareImages(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        50
      );
      expect(result.max_diff).toBe(0.05);
      expect(result.mean_diff).toBe(0.01);
    });
  });
});
