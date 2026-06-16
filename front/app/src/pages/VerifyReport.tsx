import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import MarqueeText from '@/components/MarqueeText';
import {
  FileCheck, QrCode, Search, Shield, CheckCircle, XCircle,
  FileText, BarChart3, Award, Download, Sparkles, Printer, Copy, X,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

/** 生成默认报告内容 */
function mockReportContent(id: string) {
  return `# 取证分析报告 - ${id}

**报告编号**: ${id}
**生成时间**: ${new Date().toLocaleString('zh-CN')}

---

## 1. 报告摘要

本报告基于溯影 TraceVision 系统对编号 \`${id}\` 的数字内容进行取证分析，验证内容真实性及水印完整性。

## 2. 核心指标

| 指标 | 数值 |
| :--- | :--- |
| 水印完整性 | 98.7% |
| 检测置信度 | 99.2% |
| 篡改区域数 | 0 |
| 算法引擎 | 溯影引擎 V3 |

## 3. 检测结论

经系统验证，该数字内容**通过所有完整性校验**，水印状态正常，未检测到篡改痕迹。

## 4. 验证信息

- 验证系统：TraceVision 溯影 AIGC 溯源系统
- 水印算法：INN + DWT 双重水印嵌入
- 水印容量：64 位版权信息
- 检测模型：溯影引擎 Clean Model

---
*本报告由 TraceVision 溯影系统自动生成*`;
}

export default function VerifyReport() {
  const { reports, copyrights } = useStore();
  const [mode, setMode] = useState<'report' | 'certificate'>('report');
  const [inputValue, setInputValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<'valid' | 'invalid' | null>(null);
  const [previewContent, setPreviewContent] = useState<{ title: string; content: string } | null>(null);

  const handleVerify = () => {
    if (!inputValue.trim()) return;
    setIsVerifying(true); setResult(null);
    setTimeout(() => { 
      setIsVerifying(false);
      if (mode === 'report') {
        setResult(matchedReport ? 'valid' : 'invalid');
      } else {
        setResult(matchedCopyright ? 'valid' : 'invalid');
      }
    }, 800);
  };

  /** 根据输入匹配报告 — 支持 RPT-001 / #1 / 1 多种格式 */
  const matchedReport = (() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return undefined;
    // 直接匹配 ID
    const direct = reports.find(r => r.id.toLowerCase().includes(q));
    if (direct) return direct;
    // 匹配 #N 或纯数字：按报告列表索引查找
    const numMatch = q.match(/#?(\d+)/);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10);
      // 从 reports 列表按数字匹配（#1 → RPT-001, #2 → RPT-002...）
      const byNum = reports.find(r => {
        const parts = r.id.match(/\d+/);
        return parts && parseInt(parts[0], 10) === idx;
      });
      return byNum;
    }
    return undefined;
  })();

  /** 证书模式下匹配 copyright — 支持 TV-2026-0001 / #1 / 1 多种格式 */
  const matchedCopyright = (() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return undefined;
    // 直接匹配 company 或 id
    const direct = copyrights.find(c =>
      String(c.id).includes(q) || c.company.toLowerCase().includes(q) || q.includes(String(c.id))
    );
    if (direct) return direct;
    // 匹配 #N 或纯数字
    const numMatch = q.match(/#?(\d+)/);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10);
      return copyrights.find(c => c.id === idx);
    }
    return undefined;
  })();

  /** 预览报告 */
  const handleReportPreview = () => {
    if (matchedReport?.content) {
      setPreviewContent({ title: matchedReport.title, content: matchedReport.content });
    } else {
      // 没有匹配到报告，生成一份基础预览
      const demoContent = mockReportContent(inputValue);
      setPreviewContent({ title: `取证分析报告 - ${inputValue}`, content: demoContent });
    }
  };

  /** 下载报告为 Markdown 文件 */
  const handleReportDownload = () => {
    const content = matchedReport?.content || mockReportContent(inputValue);
    const filename = matchedReport?.title ? `${matchedReport.title}.md` : `取证报告_${inputValue}.md`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('报告下载中', { description: filename });
  };

  /** 生成登记证明 HTML */
  const getCertHtml = () => {
    const cert = matchedCopyright;
    const co = cert?.company || '未知版权方';
    const logo = cert?.logoUrl || '/img/logo-new.png';
    const date = cert?.createdAt || '2026-03-10';
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>数字版权登记证明 - ${co}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#f9fafb;display:flex;justify-content:center;padding:40px 20px}
  .cert{background:#fff;width:800px;padding:60px;box-shadow:0 4px 24px rgba(0,0,0,.08);position:relative}
  .cert::before{content:'';position:absolute;top:20px;left:20px;right:20px;bottom:20px;border:2px solid #2563eb;opacity:.15;pointer-events:none}
  .header{text-align:center;border-bottom:2px solid #2563eb;padding-bottom:24px;margin-bottom:32px}
  .header h1{font-size:28px;color:#1e293b;margin-bottom:8px}
  .header .sub{font-size:13px;color:#94a3b8}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px}
  .info-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px}
  .info-card .label{font-size:11px;color:#94a3b8;margin-bottom:4px}
  .info-card .value{font-size:18px;font-weight:700;color:#1e293b}
  .owner{text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:24px;margin-bottom:32px}
  .owner img{width:80px;height:80px;object-fit:contain;margin-bottom:12px}
  .owner .name{font-size:22px;font-weight:700;color:#1e293b}
  .watermark-info{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:32px}
  .watermark-info h3{font-size:14px;color:#2563eb;margin-bottom:12px}
  .watermark-info .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center}
  .watermark-info .grid .v{font-size:14px;font-weight:600;color:#1e293b}
  .watermark-info .grid .l{font-size:11px;color:#94a3b8}
  .footer{text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px}
  .qr{display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:16px}
  .qr-box{width:64px;height:64px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center}
  .stamp{position:absolute;bottom:80px;right:80px;width:120px;height:120px;border:3px solid #dc2626;border-radius:50%;display:flex;align-items:center;justify-content:center;transform:rotate(-15deg);opacity:.6}
  .stamp span{font-size:12px;color:#dc2626;font-weight:700;text-align:center;line-height:1.4}
  @media print{body{background:#fff;padding:0}.cert{box-shadow:none}.stamp{opacity:.8}}
</style></head>
<body>
<div class="cert">
  <div class="stamp"><span>版权登记<br>数字证明</span></div>
  <div class="header">
    <h1>数字版权登记证明</h1>
    <p class="sub">TraceVision 溯影 · AIGC 知识产权保护系统</p>
  </div>
  <div class="info-grid">
    <div class="info-card"><div class="label">登记编号</div><div class="value">#${cert?.id || inputValue}</div></div>
    <div class="info-card"><div class="label">登记日期</div><div class="value">${date}</div></div>
  </div>
  <div class="owner">
    <img src="${logo}" alt="${co}" />
    <div class="name">${co}</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:4px">编号: #${cert?.id || inputValue}</div>
  </div>
  <div class="watermark-info">
    <h3>🔒 水印信息</h3>
    <div class="grid">
      <div><div class="v">溯影引擎</div><div class="l">算法</div></div>
      <div><div class="v">64 bit</div><div class="l">容量</div></div>
      <div><div class="v">图像/视频</div><div class="l">载体</div></div>
    </div>
  </div>
  <div class="qr">
    <div class="qr-box"><img src="${logo}" width="40" height="40" alt="" /></div>
    <span style="font-size:11px;color:#94a3b8">通过溯影系统可验证真伪<br>编号: #${cert?.id || inputValue}</span>
  </div>
  <div class="footer">
    <p>本证明由 TraceVision 溯影系统自动生成</p>
    <p>生成时间: ${new Date().toLocaleString('zh-CN')} | 此证明具有法律效力</p>
  </div>
</div>
</body></html>`;
  };

  /** 预览证书 */
  const handleCertPreview = () => {
    const w = window.open('', '_blank');
    if (w) { w.document.write(getCertHtml()); w.document.close(); }
    toast.success('证书已在新窗口中打开');
  };

  /** 下载证书 */
  const handleCertDownload = () => {
    const blob = new Blob([getCertHtml()], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `版权登记证明_${inputValue}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('证书下载中', { description: `版权证明 ${inputValue}.html` });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="-mx-6 -mt-6 mb-4 py-2 bg-gradient-to-r from-[#ECFDF5] via-white to-[#ECFDF5] border-b border-[#E2E8F0] overflow-hidden">
        <MarqueeText speed={15} direction="right" className="text-xs text-[#10B981]/50 font-display" separator="  ·  " items={['REPORT VERIFICATION', '报告验证', 'AUTHENTICITY CHECK', '真伪校验', 'CERTIFICATE']} />
      </div>

      <div className="text-center">
        <h1 className="section-title">报告与证明验证</h1>
        <p className="section-subtitle">验证取证分析报告或版权登记证明的真实性</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-2 bg-white rounded-lg border border-[#E2E8F0] p-1 w-fit mx-auto">
        <button onClick={() => { setMode('report'); setResult(null); setInputValue(''); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'report' ? 'bg-[#2563EB] text-white' : 'text-[#475569] hover:bg-[#F8FAFC]'}`}>
          <FileText className="w-4 h-4" />取证分析报告
        </button>
        <button onClick={() => { setMode('certificate'); setResult(null); setInputValue(''); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'certificate' ? 'bg-[#2563EB] text-white' : 'text-[#475569] hover:bg-[#F8FAFC]'}`}>
          <Award className="w-4 h-4" />版权登记证明
        </button>
      </div>

      <div className="card-surface p-8">
        {/* Sub title */}
        <div className="text-center mb-6">
          {mode === 'report' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              AI 智能生成 · 包含取证分析与可视化数据
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ECFDF5] text-[#10B981] text-xs font-medium">
              <Shield className="w-3.5 h-3.5" />
              官方登记证明 · 含防伪二维码
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder={mode === 'report' ? '输入报告 ID（如 RPT-20260315-001）' : '输入登记编号（如 TV-2026-0001）'}
              className="pl-9 pr-4 py-3 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>
          <button onClick={handleVerify} disabled={!inputValue.trim() || isVerifying} className="btn-primary gap-2 disabled:opacity-50">
            {isVerifying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            验证
          </button>
        </div>

        {/* Quick match — 报告模式：匹配已知报告 */}
        {mode === 'report' && matchedReport && inputValue.trim().length >= 2 && (
          <div className="mt-4 p-4 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <FileCheck className="w-4 h-4 text-[#2563EB]" />
              <span className="text-sm font-semibold text-[#1E40AF]">已匹配到对应报告</span>
              <span className="text-xs text-[#3B82F6] bg-[#DBEAFE] px-2 py-0.5 rounded-full font-mono">{matchedReport.id}</span>
            </div>
            <div className="text-xs text-[#475569] mb-3 line-clamp-2">{matchedReport.title} · {matchedReport.createdAt}</div>
            <div className="flex items-center gap-2">
              <button className="flex-1 btn-primary gap-1.5 text-xs py-2" onClick={handleReportPreview}><FileText className="w-3.5 h-3.5" />预览</button>
              <button className="flex-1 btn-secondary gap-1.5 text-xs py-2" onClick={handleReportDownload}><Download className="w-3.5 h-3.5" />下载</button>
            </div>
          </div>
        )}

        {/* Quick match — 证书模式：匹配已登记版权 */}
        {mode === 'certificate' && matchedCopyright && inputValue.trim().length >= 1 && (
          <div className="mt-4 p-4 rounded-lg border border-[#BFDBFE] bg-[#ECFDF5] animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-[#10B981]" />
              <span className="text-sm font-semibold text-[#065F46]">已匹配到登记版权</span>
              <span className="text-xs text-[#059669] bg-[#D1FAE5] px-2 py-0.5 rounded-full font-mono">#{matchedCopyright.id}</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <img src={matchedCopyright.logoUrl} alt="" className="w-10 h-10 object-contain rounded" />
              <div>
                <div className="text-sm font-semibold text-[#1E293B]">{matchedCopyright.company}</div>
                <div className="text-xs text-[#64748B]">登记日期: {matchedCopyright.createdAt}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex-1 btn-primary gap-1.5 text-xs py-2" onClick={handleCertPreview}><Printer className="w-3.5 h-3.5" />预览/打印</button>
              <button className="flex-1 btn-secondary gap-1.5 text-xs py-2" onClick={handleCertDownload}><Download className="w-3.5 h-3.5" />下载</button>
            </div>
          </div>
        )}

        {/* Report Valid Result */}
        {result === 'valid' && mode === 'report' && (
          <div className="mt-6 space-y-4 animate-fade-in">
            <div className="p-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-[#10B981]" />
                <div>
                  <div className="text-sm font-semibold text-[#065F46]">报告验证通过</div>
                  <div className="text-xs text-[#059669] mt-1">报告 ID：<span className="font-mono">{inputValue}</span> 为溯影系统生成的真实报告</div>
                </div>
              </div>
            </div>
            {/* Report Preview */}
            <div className="p-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
              <h4 className="text-sm font-semibold text-[#1E293B] mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-[#2563EB]" />报告预览</h4>
              <div className="space-y-2 text-xs text-[#475569]">
                <div className="flex justify-between border-b border-[#E2E8F0] pb-2"><span>报告类型</span><span className="font-medium">篡改检测取证报告</span></div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-2"><span>生成时间</span><span className="font-medium">2026-03-15 17:06:37</span></div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-2"><span>包含内容</span><span className="font-medium">取证分析 + 可视化图表</span></div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-2"><span>检测模型</span><span className="font-medium">Clean Model / Degrade Model</span></div>
                <div className="flex justify-between"><span>页数</span><span className="font-medium">6 页（含 4 张数据图表）</span></div>
              </div>
              {/* Mini Charts Preview */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="h-16 bg-gradient-to-r from-[#2563EB]/10 to-[#3B82F6]/10 rounded flex items-center justify-center"><BarChart3 className="w-5 h-5 text-[#2563EB]" /></div>
                <div className="h-16 bg-gradient-to-r from-[#10B981]/10 to-[#34D399]/10 rounded flex items-center justify-center"><BarChart3 className="w-5 h-5 text-[#10B981]" /></div>
                <div className="h-16 bg-gradient-to-r from-[#F59E0B]/10 to-[#FBBF24]/10 rounded flex items-center justify-center"><BarChart3 className="w-5 h-5 text-[#F59E0B]" /></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary gap-2 text-xs flex-1" onClick={handleReportDownload}><Download className="w-4 h-4" />下载完整报告</button>
              <button className="btn-secondary gap-2 text-xs flex-1" onClick={handleReportPreview}><FileText className="w-4 h-4" />预览报告</button>
            </div>
          </div>
        )}

        {/* Certificate Valid Result */}
        {result === 'valid' && mode === 'certificate' && (
          <div className="mt-6 space-y-4 animate-fade-in">
            <div className="p-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-[#10B981]" />
                <div>
                  <div className="text-sm font-semibold text-[#065F46]">登记证明验证通过</div>
                  <div className="text-xs text-[#059669] mt-1">登记编号：<span className="font-mono">{inputValue}</span> 已在溯影系统登记</div>
                </div>
              </div>
            </div>
            {/* Certificate Preview */}
            <div className="p-4 rounded-lg border-2 border-[#2563EB]/20 bg-gradient-to-b from-[#F8FAFC] to-white">
              <div className="flex items-center justify-center gap-2 mb-4">
                <img src="/img/logo-new.png" alt="" className="w-8 h-8 object-contain" />
                <span className="text-sm font-bold text-[#1E293B]">数字版权登记证明</span>
              </div>
              <div className="text-center mb-4">
                <img src={matchedCopyright?.logoUrl || '/img/logo-new.png'} alt="" className="w-12 h-12 object-contain mx-auto mb-2" />
                <div className="text-base font-bold text-[#1E293B]">{matchedCopyright?.company || '未知版权方'}</div>
                <div className="text-xs text-[#94A3B8]">登记编号: #{matchedCopyright?.id || inputValue}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-[#F8FAFC] text-center"><div className="text-[10px] text-[#94A3B8]">登记日期</div><div className="font-medium text-[#1E293B]">{matchedCopyright?.createdAt || '2026-03-10'}</div></div>
                <div className="p-2 rounded bg-[#F8FAFC] text-center"><div className="text-[10px] text-[#94A3B8]">水印容量</div><div className="font-medium text-[#1E293B]">64 bit</div></div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="w-12 h-12 rounded bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center"><QrCode className="w-6 h-6 text-[#CBD5E1]" /></div>
                <span className="text-[10px] text-[#94A3B8]">扫码验证真伪</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary gap-2 text-xs flex-1" onClick={handleCertDownload}><Download className="w-4 h-4" />下载登记证明</button>
              <button className="btn-secondary gap-2 text-xs flex-1" onClick={handleCertPreview}><Printer className="w-4 h-4" />预览/打印</button>
            </div>
          </div>
        )}

        {result === 'invalid' && (
          <div className="mt-6 p-4 rounded-lg bg-[#FEE2E2] border border-[#FECACA] animate-fade-in">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-[#EF4444]" />
              <div>
                <div className="text-sm font-semibold text-[#991B1B]">验证失败</div>
                <div className="text-xs text-[#DC2626] mt-1">
                  {mode === 'report'
                    ? <>编号 <span className="font-mono">{inputValue}</span> 未匹配到已有报告，请输入有效的报告 ID（如 RPT-001、RPT-002）</>
                    : <>编号 <span className="font-mono">{inputValue}</span> 未匹配到已登记版权，请输入有效的登记编号（如 #1、#2）</>
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card-surface p-5">
        <h3 className="text-sm font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#2563EB]" />
          验证方法
        </h3>
        <div className="space-y-2 text-xs text-[#475569]">
          <p>1. 选择「取证分析报告」或「版权登记证明」验证模式</p>
          <p>2. 输入对应的报告 ID 或登记编号</p>
          <p>3. 取证报告包含：取证分析过程、可视化数据图表、水印检测数据</p>
          <p>4. 登记证明包含：版权归属方信息、水印参数、防伪二维码</p>
          <p>5. 点击「验证」按钮检查真实性</p>
        </div>
      </div>

      {/* 报告预览弹窗 */}
      {previewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPreviewContent(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">{previewContent.title}</h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">{previewContent.content.length} 字符</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { navigator.clipboard.writeText(previewContent.content); toast.success('已复制'); }} className="p-2 hover:bg-[#F1F5F9] rounded-lg" title="复制"><Copy className="w-4 h-4 text-[#64748B]" /></button>
                <button onClick={() => {
                  const blob = new Blob([previewContent.content], { type: 'text/markdown;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `${previewContent.title}.md`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                  toast.success('报告已下载');
                }} className="p-2 hover:bg-[#EFF6FF] rounded-lg" title="下载"><Download className="w-4 h-4 text-[#2563EB]" /></button>
                <button onClick={() => setPreviewContent(null)} className="p-2 hover:bg-[#F1F5F9] rounded-lg"><X className="w-4 h-4 text-[#64748B]" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none prose-headings:text-[#1E293B] prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-sm prose-p:text-[#475569] prose-table:text-xs prose-th:bg-[#F8FAFC] prose-strong:text-[#1E293B]">
                <ReactMarkdown>{previewContent.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
