import { useState, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import MarqueeText from '@/components/MarqueeText';
import { Plus, Search, Pencil, Trash2, Grid3X3, List, FileText, Download, CheckCircle, Shield, Calendar, Hash, QrCode, Upload, Printer } from 'lucide-react';
import { createLogo as apiCreateLogo, deleteLogo as apiDeleteLogo } from '@/services/api';
import { toast } from 'sonner';

export default function CopyrightPage() {
  const { copyrights, removeCopyright, addCopyright } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showCertificate, setShowCertificate] = useState<number | null>(null);
  const certRef = useRef<HTMLDivElement>(null);

  const filtered = copyrights.filter((c) => c.company.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAdd = async () => {
    if (!newCompany.trim()) return;
    try {
      const item = await apiCreateLogo(newCompany, newLogoFile || undefined);
      addCopyright({
        id: item.id,
        company: item.company,
        logoUrl: item.logo_url || '/img/logo-new.png',
        createdAt: item.created_at || new Date().toISOString().slice(0, 10),
      });
      setNewCompany(''); setNewLogoFile(null); setShowModal(false);
    } catch (err) {
      console.error('创建版权失败:', err);
      alert('创建版权失败，请确保后端服务已启动');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiDeleteLogo(id);
      removeCopyright(id);
    } catch (err) {
      console.error('删除版权失败:', err);
      alert('删除版权失败');
    }
  };

  const selectedCert = copyrights.find((c) => c.id === showCertificate);

  /** 生成证书 HTML */
  const getCertHtml = (cert: Copyright) => `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>数字版权登记证明 - ${cert.company}</title>
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
    <div class="info-card"><div class="label">登记编号</div><div class="value">TV-2026-${String(cert.id).padStart(4, '0')}</div></div>
    <div class="info-card"><div class="label">登记日期</div><div class="value">${cert.createdAt}</div></div>
  </div>
  <div class="owner">
    <img src="${cert.logoUrl}" alt="${cert.company}" />
    <div class="name">${cert.company}</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:4px">系统 ID: #${cert.id}</div>
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
    <div class="qr-box"><img src="/img/logo-new.png" width="40" height="40" alt="" /></div>
    <span style="font-size:11px;color:#94a3b8">通过溯影系统可验证真伪<br>编号: TV-2026-${String(cert.id).padStart(4, '0')}</span>
  </div>
  <div class="footer">
    <p>本证明由 TraceVision 溯影系统自动生成</p>
    <p>生成时间: ${new Date().toLocaleString('zh-CN')} | 此证明具有法律效力</p>
  </div>
</div>
</body></html>`;

  /** 预览证书（新窗口打开） */
  const handleCertPreview = (cert: Copyright) => {
    const html = getCertHtml(cert);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    toast.success('证书已在新窗口中打开');
  };

  /** 下载证书为 HTML 文件 */
  const handleCertDownload = (cert: Copyright) => {
    const html = getCertHtml(cert);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `版权登记证明_${cert.company}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('证书下载中', { description: `版权证明 ${cert.company}.html` });
  };

  return (
    <div className="space-y-6 relative">
      <div className="-mx-6 -mt-6 mb-4 py-2 bg-gradient-to-r from-[#F3E8FF] via-white to-[#F3E8FF] border-b border-[#E2E8F0] overflow-hidden">
        <MarqueeText speed={16} direction="left" className="text-xs text-[#A855F7]/50 font-display" separator="  ·  " items={['COPYRIGHT MANAGEMENT', '版权管理', 'IP PROTECTION', '知识产权', 'CERTIFICATE', '证书']} />
      </div>

      <div>
        <h1 className="section-title">版权信息管理</h1>
        <p className="section-subtitle">注册和管理数字内容版权归属信息，生成版权登记证明</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input type="text" placeholder="搜索版权..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-[#E2E8F0] rounded-md overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#94A3B8]'}`}><Grid3X3 className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#94A3B8]'}`}><List className="w-4 h-4" /></button>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary gap-2 text-xs"><Plus className="w-4 h-4" />新建版权</button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-4 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="card-surface p-5 text-center hover:shadow-lg hover:-translate-y-1 transition-all group relative">
              <img src={c.logoUrl} alt={c.company} className="w-20 h-20 object-contain mx-auto mb-3" />
              <div className="text-base font-semibold text-[#1E293B]">{c.company}</div>
              <div className="text-xs text-[#94A3B8] mt-1">ID: #{c.id}</div>
              <div className="text-[10px] text-[#94A3B8] mt-1">{c.createdAt}</div>
              <div className="flex items-center justify-center gap-2 mt-3">
                <button onClick={() => setShowCertificate(c.id)} className="px-2 py-1 rounded bg-[#EFF6FF] text-[#2563EB] text-[10px] font-medium hover:bg-[#2563EB] hover:text-white transition-all flex items-center gap-1">
                  <FileText className="w-3 h-3" />证明报告
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 hover:bg-[#F1F5F9] rounded-md" onClick={() => toast.info('编辑版权信息', { description: `正在编辑 #${c.id} ${c.company}` })}><Pencil className="w-3.5 h-3.5 text-[#94A3B8]" /></button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-[#FEE2E2] rounded-md"><Trash2 className="w-3.5 h-3.5 text-[#94A3B8] hover:text-[#EF4444]" /></button>
              </div>
            </div>
          ))}
          <button onClick={() => setShowModal(true)} className="card-surface p-5 text-center border-dashed hover:border-[#2563EB] hover:bg-[#EFF6FF] transition-all min-h-[200px] flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#CBD5E1] flex items-center justify-center"><Plus className="w-5 h-5 text-[#94A3B8]" /></div>
            <span className="text-xs text-[#94A3B8]">添加新版权</span>
          </button>
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">Logo</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">公司/作者</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">ID</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">创建时间</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-[#94A3B8]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4"><img src={c.logoUrl} alt={c.company} className="w-8 h-8 object-contain rounded" /></td>
                  <td className="py-3 px-4 font-medium text-[#1E293B]">{c.company}</td>
                  <td className="py-3 px-4 text-xs text-[#94A3B8]">#{c.id}</td>
                  <td className="py-3 px-4 text-xs text-[#94A3B8]">{c.createdAt}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => setShowCertificate(c.id)} className="p-1 hover:bg-[#EFF6FF] rounded mr-1" title="证明报告"><FileText className="w-3.5 h-3.5 text-[#2563EB]" /></button>
                    <button className="p-1 hover:bg-[#F1F5F9] rounded mr-1" onClick={() => toast.info('编辑版权信息', { description: `正在编辑 #${c.id} ${c.company}` })}><Pencil className="w-3.5 h-3.5 text-[#94A3B8]" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1 hover:bg-[#FEE2E2] rounded"><Trash2 className="w-3.5 h-3.5 text-[#94A3B8] hover:text-[#EF4444]" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Copyright Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl w-[480px] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#1E293B] mb-4">新建版权信息</h3>
            <div className="space-y-4">
              <div><label className="text-sm text-[#475569] mb-1.5 block">公司/作者名称</label><input type="text" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} className="input-field" placeholder="输入公司或作者名称" /></div>
              <div><label className="text-sm text-[#475569] mb-1.5 block">Logo 上传（可选）</label>
                <div className="upload-zone py-8 cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                  {newLogoFile ? (
                    <span className="text-xs text-[#10B981]">已选择: {newLogoFile.name}</span>
                  ) : (
                    <><Upload className="w-5 h-5 text-[#CBD5E1]" /><span className="text-xs text-[#94A3B8]">点击选择 Logo 图片</span></>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setNewLogoFile(e.target.files?.[0] || null)} />
                </div></div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="btn-ghost text-xs">取消</button>
                <button onClick={handleAdd} className="btn-primary text-xs">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificate && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            {/* Certificate Header */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #2563EB 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative z-10">
                <img src="/img/logo-new.png" alt="" className="w-12 h-12 mx-auto mb-3 opacity-80" />
                <h2 className="text-xl font-bold text-white">数字版权登记证明</h2>
                <p className="text-xs text-white/50 mt-1">TraceVision 溯影 · AIGC 知识产权保护系统</p>
              </div>
            </div>

            {/* Certificate Body */}
            <div ref={certRef} className="p-6 space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-[#10B981]" />
                <span className="text-sm font-semibold text-[#10B981]">该版权信息已在溯影系统登记</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] mb-1"><Hash className="w-3 h-3" />登记编号</div>
                  <div className="text-sm font-bold text-[#1E293B] font-display">TV-2026-{String(selectedCert.id).padStart(4, '0')}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] mb-1"><Calendar className="w-3 h-3" />登记日期</div>
                  <div className="text-sm font-bold text-[#1E293B]">{selectedCert.createdAt}</div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <div className="text-[10px] text-[#94A3B8] mb-2">版权归属方</div>
                <img src={selectedCert.logoUrl} alt="" className="w-16 h-16 object-contain mx-auto mb-2" />
                <div className="text-lg font-bold text-[#1E293B]">{selectedCert.company}</div>
                <div className="text-xs text-[#94A3B8] mt-1">系统 ID: #{selectedCert.id}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                <div className="flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-[#2563EB]" /><span className="text-xs font-semibold text-[#2563EB]">水印信息</span></div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div><div className="text-[10px] text-[#94A3B8]">算法</div><div className="font-medium text-[#1E293B]">溯影引擎</div></div>
                  <div><div className="text-[10px] text-[#94A3B8]">容量</div><div className="font-medium text-[#1E293B]">64 bit</div></div>
                  <div><div className="text-[10px] text-[#94A3B8]">载体</div><div className="font-medium text-[#1E293B]">图像/视频</div></div>
                </div>
              </div>

              {/* QR Code Placeholder */}
              <div className="flex items-center justify-center gap-3 p-3">
                <div className="w-16 h-16 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-[#CBD5E1]" />
                </div>
                <div className="text-xs text-[#94A3B8]">扫描二维码验证真伪<br />或在报告验证页输入编号</div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <button onClick={() => setShowCertificate(null)} className="btn-ghost text-xs">关闭</button>
              <div className="flex items-center gap-2">
                <button className="btn-secondary gap-1 text-xs" onClick={() => handleCertPreview(selectedCert)}><Printer className="w-3.5 h-3.5" />预览/打印</button>
                <button className="btn-primary gap-1 text-xs" onClick={() => handleCertDownload(selectedCert)}><Download className="w-3.5 h-3.5" />下载证明</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
