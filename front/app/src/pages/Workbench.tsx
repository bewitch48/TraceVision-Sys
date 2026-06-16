import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import MarqueeText from '@/components/MarqueeText';
import CameraCapture from '@/components/CameraCapture';
import { Upload, Shield, SlidersHorizontal, Play, Download, FlaskConical, ChevronDown, ChevronUp, RefreshCw, Image, Camera } from 'lucide-react';
import { embedWatermark, compareImages, toImageUrl, createLogo as apiCreateLogo } from '@/services/api';

const STEPS = ['选择版权', '上传媒体', '嵌入水印', '质量分析'];

export default function Workbench() {
  const { copyrights, selectedCopyrightId, setSelectedCopyrightId, uploadedImage, setUploadedImage, watermarkedImage, setWatermarkedImage, addCopyright, incrementDetectionCount } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [modelType, setModelType] = useState('clean');
  const [strength, setStrength] = useState(5);
  const [outputFormat, setOutputFormat] = useState('PNG');
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);
  const [showNewCopyright, setShowNewCopyright] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const quickLogoRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);

  const [metrics, setMetrics] = useState({ psnr: 0, ssim: 0, capacity: 64, maxDiff: 0, meanDiff: 0 });
  const [residualImage, setResidualImage] = useState<string | null>(null);
  const [normalizedOriginal, setNormalizedOriginal] = useState<string | null>(null);  // 缩放为 512x512 的原图，用于对比

  const selectedCopyright = copyrights.find((c) => c.id === selectedCopyrightId);

  // 缩放到 512x512（与后端输出一致），用于原图/水印图对齐对比
  const resizeTo512 = useCallback((src: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 512, 512);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(src); // 失败则回退原图
      img.src = src;
    });
  }, []);

  /** 文件上传 */
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const src = ev.target?.result as string;
        setUploadedImage(src);
        setCurrentStep(1);
        resizeTo512(src).then(setNormalizedOriginal);
      };
      reader.readAsDataURL(file);
    }
  }, [setUploadedImage, resizeTo512]);

  /** 拍照确认回调 */
  const handleCameraCapture = useCallback((dataUrl: string) => {
    setUploadedImage(dataUrl);
    setCurrentStep(1);
    resizeTo512(dataUrl).then(setNormalizedOriginal);
  }, [setUploadedImage, resizeTo512]);

  /** 嵌入水印 */
  const handleEmbed = useCallback(async () => {
    if (!uploadedImage || !selectedCopyrightId) return;
    setIsEmbedding(true); setCurrentStep(2);

    try {
      const result = await embedWatermark(uploadedImage, selectedCopyrightId!, modelType);
      const wmUrl = toImageUrl(result.watermarked_image);
      setWatermarkedImage(wmUrl);
      setMetrics(prev => ({ ...prev, psnr: result.psnr, ssim: result.ssim }));

      try {
        const cmp = await compareImages(uploadedImage, wmUrl);
        setResidualImage(toImageUrl(cmp.residual_image));
        setMetrics(prev => ({ ...prev, maxDiff: cmp.max_diff, meanDiff: cmp.mean_diff }));
      } catch {
        console.warn('残差对比失败');
      }
      setIsEmbedding(false); setShowResults(true); setCurrentStep(3);
      incrementDetectionCount();
    } catch (err) {
      console.error('水印嵌入失败:', err);
      alert('水印嵌入失败，请确保后端服务已启动');
      setIsEmbedding(false);
    }
  }, [uploadedImage, selectedCopyrightId, setWatermarkedImage, modelType]);

  /** 滑块对比 */
  const handleSliderMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!compareContainerRef.current) return;
    const rect = compareContainerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pct)));
  }, []);

  const handleSliderDrag = useCallback(() => {
    const handleMove = (e: MouseEvent) => {
      if (!compareContainerRef.current) return;
      const rect = compareContainerRef.current.getBoundingClientRect();
      setSliderPos(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    };
    const handleUp = () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, []);

  /** 重置所有状态 */
  const handleReset = useCallback(() => {
    setUploadedImage(null);
    setWatermarkedImage(null);
    setShowResults(false);
    setCurrentStep(0);
    setResidualImage(null);
    setNormalizedOriginal(null);
    setMetrics({ psnr: 0, ssim: 0, capacity: 64, maxDiff: 0, meanDiff: 0 });
    setSliderPos(50);
  }, [setUploadedImage, setWatermarkedImage]);

  /** 更换图片（仅换图，保留版权选择） */
  const handleReplaceImage = useCallback(() => {
    setUploadedImage(null);
    setWatermarkedImage(null);
    setResidualImage(null);
    setNormalizedOriginal(null);
    setShowResults(false);
    setCurrentStep(1);
    setMetrics({ psnr: 0, ssim: 0, capacity: 64, maxDiff: 0, meanDiff: 0 });
    setSliderPos(50);
    setTimeout(() => fileInputRef.current?.click(), 100);
  }, [setUploadedImage, setWatermarkedImage]);

  /** 快捷新建版权 */
  const handleQuickCreate = useCallback(async () => {
    if (!newCompanyName.trim()) return;
    try {
      const item = await apiCreateLogo(newCompanyName, newLogoFile || undefined);
      addCopyright({
        id: item.id,
        company: item.company,
        logoUrl: item.logo_url || '/img/logo-new.png',
        createdAt: item.created_at || new Date().toISOString().slice(0, 10),
      });
      setSelectedCopyrightId(item.id);
      setNewCompanyName('');
      setNewLogoFile(null);
      setShowNewCopyright(false);
    } catch (err) {
      console.error('快捷创建版权失败:', err);
      alert('创建失败，请确保后端服务已启动');
    }
  }, [newCompanyName, newLogoFile, addCopyright, setSelectedCopyrightId]);

  const metricsDisplay = { psnr: metrics.psnr, ssim: metrics.ssim, capacity: 64, maxDiff: metrics.maxDiff, meanDiff: metrics.meanDiff };

  return (
    <div className="space-y-6">
      <div className="-mx-6 -mt-6 mb-4 py-2 bg-gradient-to-r from-[#EFF6FF] via-white to-[#EFF6FF] border-b border-[#E2E8F0] overflow-hidden">
        <MarqueeText speed={18} direction="left" className="text-xs text-[#94A3B8]/60 font-display" separator="  ·  " items={['WATERMARK WORKBENCH', '水印工作台', 'INVISIBLE EMBED', '隐写嵌入']} />
      </div>

      <div>
        <h1 className="section-title">水印工作台</h1>
        <p className="section-subtitle">嵌入隐形水印，守护数字内容知识产权 — 支持本地上传与摄像头实时拍照</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 bg-white rounded-lg border border-[#E2E8F0] p-4">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`step-dot flex-shrink-0 ${i < currentStep ? 'completed' : i === currentStep ? 'current' : 'pending'}`}>
              {i < currentStep ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <span>{i + 1}</span>}
            </div>
            <span className={`text-xs font-medium ${i < currentStep ? 'text-[#10B981]' : i === currentStep ? 'text-[#2563EB]' : 'text-[#94A3B8]'}`}>{step}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < currentStep ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Copyright */}
        <div className="col-span-3">
          <div className="card-surface p-4">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-[#2563EB]" />选择版权归属</h3>
            <select value={selectedCopyrightId ?? ''} onChange={(e) => setSelectedCopyrightId(Number(e.target.value))} className="input-field mb-4">
              {copyrights.map((c) => <option key={c.id} value={c.id}>ID:{c.id} | {c.company}</option>)}
            </select>
            {selectedCopyright && (
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] mb-4">
                <div className="flex items-center gap-3">
                  <img src={selectedCopyright.logoUrl} alt={selectedCopyright.company} className="w-10 h-10 object-contain rounded" />
                  <div><div className="text-sm font-semibold text-[#1E293B]">{selectedCopyright.company}</div><div className="text-xs text-[#94A3B8]">ID: #{selectedCopyright.id}</div></div>
                </div>
              </div>
            )}
            <button onClick={() => setShowNewCopyright(!showNewCopyright)} className="flex items-center gap-1 text-xs text-[#2563EB] hover:underline">
              {showNewCopyright ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}快捷新建版权
            </button>
            {showNewCopyright && (
              <div className="mt-3 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <input type="text" placeholder="公司/作者名称" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} className="input-field" />
                <div className="upload-zone py-6 cursor-pointer" onClick={() => quickLogoRef.current?.click()}>
                  {newLogoFile ? (
                    <span className="text-xs text-[#10B981]">已选择: {newLogoFile.name}</span>
                  ) : (
                    <><Upload className="w-5 h-5 text-[#94A3B8]" /><span className="text-xs text-[#94A3B8]">点击上传 Logo</span></>
                  )}
                  <input ref={quickLogoRef} type="file" accept="image/*" className="hidden" onChange={(e) => setNewLogoFile(e.target.files?.[0] || null)} />
                </div>
                <button onClick={handleQuickCreate} className="btn-primary w-full text-xs">新建版权</button>
              </div>
            )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>

        {/* Center: Media Canvas */}
        <div className="col-span-6">
          <div className="card-surface p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#1E293B]">原始图片</h3>
              <div className="flex items-center gap-2">
                {uploadedImage && (
                  <button onClick={handleReplaceImage} className="text-xs text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1">
                    更换图片
                  </button>
                )}
                {uploadedImage && (
                  <button onClick={handleReset} className="text-xs text-[#94A3B8] hover:text-[#EF4444] flex items-center gap-1"><RefreshCw className="w-3 h-3" />重置</button>
                )}
              </div>
            </div>

            {!uploadedImage ? (
              <div className="upload-zone h-80 flex-col gap-3">
                <Image className="w-8 h-8 text-[#CBD5E1]" />
                <div className="text-sm text-[#475569] font-medium">点击或拖拽上传图片</div>
                <div className="text-xs text-[#94A3B8]">JPG、PNG 格式，最大 5MB</div>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => fileInputRef.current?.click()} className="btn-primary text-xs px-4 py-1.5 gap-1.5">
                    <Upload className="w-3.5 h-3.5" />本地上传
                  </button>
                  <button onClick={() => setShowCamera(true)} className="btn-secondary text-xs px-4 py-1.5 gap-1.5">
                    <Camera className="w-3.5 h-3.5" />实时拍照
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-[#F8FAFC]">
                <img src={uploadedImage} alt="已上传" className="w-full h-auto max-h-[400px] object-contain" />
                {/* 更换图片按钮 */}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <button onClick={() => fileInputRef.current?.click()} className="px-2 py-0.5 bg-white/90 border border-[#E2E8F0] rounded text-[10px] text-[#475569] hover:bg-[#F8FAFC] flex items-center gap-1">
                    <Upload className="w-3 h-3" />本地上传
                  </button>
                  <button onClick={() => setShowCamera(true)} className="px-2 py-0.5 bg-white/90 border border-[#E2E8F0] rounded text-[10px] text-[#475569] hover:bg-[#F8FAFC] flex items-center gap-1">
                    <Camera className="w-3 h-3" />拍照
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Params */}
        <div className="col-span-3">
          <div className="card-surface p-4">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-[#2563EB]" />嵌入参数</h3>
            <div className="space-y-5">
              <div>
                <label className="text-xs text-[#475569] mb-1.5 block">模型选择</label>
                <select value={modelType} onChange={(e) => setModelType(e.target.value)} className="input-field">
                  <option value="clean">Clean Model（高保真）</option>
                  <option value="degrade">Degrade Model（抗攻击）</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5"><label className="text-xs text-[#475569]">水印强度</label><span className="text-xs font-mono text-[#2563EB]">{strength}</span></div>
                <input type="range" min={1} max={10} value={strength} onChange={(e) => setStrength(Number(e.target.value))} className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none accent-[#2563EB]" />
                <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1"><span>弱</span><span>强</span></div>
              </div>
              <div>
                <label className="text-xs text-[#475569] mb-1.5 block">消息长度</label>
                <div className="input-field bg-[#F8FAFC] text-[#94A3B8]">64bit（固定）</div>
              </div>
              <div>
                <label className="text-xs text-[#475569] mb-1.5 block">输出格式</label>
                <div className="flex gap-2">
                  {['PNG', 'JPG', 'TIFF'].map((fmt) => (
                    <button key={fmt} onClick={() => setOutputFormat(fmt)} className={`flex-1 py-2 text-xs font-medium rounded border transition-all ${outputFormat === fmt ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#2563EB]/40'}`}>{fmt}</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleEmbed} disabled={!uploadedImage || !selectedCopyrightId || isEmbedding} className="btn-primary w-full mt-6 gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isEmbedding ? <><RefreshCw className="w-4 h-4 animate-spin" />AI 嵌入中...</> : <><Play className="w-4 h-4" />执行水印嵌入</>}
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      {showResults && watermarkedImage && (
        <div className="card-surface p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-[#1E293B] mb-4">水印不可见性分析</h3>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[{ label: 'PSNR', value: metricsDisplay.psnr, unit: 'dB' }, { label: 'SSIM', value: metricsDisplay.ssim, unit: '' }, { label: '容量', value: metricsDisplay.capacity, unit: 'bit' }, { label: '平均差异', value: metricsDisplay.meanDiff, unit: '' }].map((m, i) => (
              <div key={i} className="text-center p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-xs text-[#94A3B8] mb-1">{m.label}</div>
                <div className="text-xl font-bold text-[#2563EB] font-display">{m.value}{m.unit && <span className="text-xs ml-1 text-[#94A3B8]">{m.unit}</span>}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-[#94A3B8] mb-2">原图 / 水印图对比（拖拽比较）</div>
              <div ref={compareContainerRef} className="relative w-full h-64 rounded-lg overflow-hidden cursor-col-resize select-none bg-[#F8FAFC]" onMouseMove={(e) => e.buttons === 1 && handleSliderMove(e)}>
                {/* 底层：水印图（以原图尺寸为基准居中裁切） */}
                <img src={watermarkedImage} alt="水印图" className="absolute inset-0 w-full h-full object-contain" />
                {/* 上层：缩放至 512x512 的原图（与后端输出尺寸一致，确保对齐） */}
                <div className="absolute top-0 left-0 h-full overflow-hidden" style={{ width: `${sliderPos}%` }}>
                  <img src={normalizedOriginal || watermarkedImage} alt="原图" className="absolute top-0 left-0 h-full object-contain" style={{ width: `${(100 / sliderPos) * 100}%`, maxWidth: 'none' }} />
                </div>
                {/* 分割线 + 滑块手柄 */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-[#2563EB] cursor-col-resize" style={{ left: `${sliderPos}%` }} onMouseDown={handleSliderDrag}>
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#2563EB] shadow-lg flex items-center justify-center"><div className="w-0.5 h-2 bg-white/50 mx-px" /><div className="w-0.5 h-2 bg-white/50 mx-px" /></div>
                </div>
                {/* 标签 */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/50 text-[10px] text-white">原图</div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#2563EB]/80 text-[10px] text-white">水印图</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-[#94A3B8] mb-2">残差图（放大 50 倍）</div>
              <div className="relative rounded-lg overflow-hidden bg-black h-64 flex items-center justify-center">
                {residualImage ? (
                  <img src={residualImage} alt="残差图" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto rounded bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] opacity-80" />
                    <div className="mt-2 text-[10px] text-[#64748B]">残差 50x | 最大差异: {metricsDisplay.maxDiff} | 平均: {metricsDisplay.meanDiff}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={() => { if (watermarkedImage) { const a = document.createElement('a'); a.href = watermarkedImage; a.download = 'watermarked.png'; a.click(); } }} className="btn-secondary gap-2 text-xs"><Download className="w-4 h-4" />下载水印图</button>
            <button onClick={() => window.location.href = '/attack-lab'} className="btn-ghost gap-2 text-xs text-[#2563EB]"><FlaskConical className="w-4 h-4" />前往攻击测试</button>
          </div>
        </div>
      )}

      {/* 摄像头弹窗 */}
      {showCamera && (
        <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}
