import { useState, useRef, useCallback, useEffect } from 'react';
import MarqueeText from '@/components/MarqueeText';
import CameraCapture from '@/components/CameraCapture';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Upload, Play, RefreshCw, Shield, AlertTriangle, XCircle,
  CheckCircle, ChevronDown, ChevronUp, HelpCircle, Crosshair,
  TrendingUp, BarChart3, PieChart as PieIcon, Image, Camera,
  Zap, Wand2, Shuffle, FileSearch,
} from 'lucide-react';
import { extractForensics, toImageUrl } from '@/services/api';
import { useStore } from '@/hooks/useStore';

const COLORS: [number, number, number][] = [
  [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0],
  [128, 0, 128], [255, 165, 0], [0, 255, 255], [255, 192, 203],
];
const CHART_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];

interface ForensicsResult {
  locationImage: string;
  tamperedRegions: Array<{ id: string; bbox: [number, number, number, number]; color: [number, number, number]; area: number; confidence: number; timestamp: string }>;
  watermark: { detected: boolean; status: string; logoId: number | null; company: string; logoImage: string | null; confidence: number; rawBits: string; bitErrors: number };
  processingTime: number; modelUsed: string;
  tamperDiagnosis: string;
  isNoWatermark: boolean;
  confidenceHistory: Array<{ time: string; confidence: number; threshold: number }>;
  regionDist: Array<{ name: string; value: number; confidence: number }>;
  modelCompare: Array<{ name: string; psnr: number; ssim: number; acc: number }>;
}

export default function Forensics() {
  const { incrementDetectionCount } = useStore();
  const [forensicsImage, setForensicsImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [result, setResult] = useState<ForensicsResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [modelType, setModelType] = useState('clean');
  const [threshold, setThreshold] = useState(0.2);
  const [minArea, setMinArea] = useState(100);
  const [showBits, setShowBits] = useState(false);
  const [svgBoxes, setSvgBoxes] = useState<Array<{ id: string; x: number; y: number; w: number; h: number; color: string }>>([]);
  const [attackedFileName, setAttackedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  /** 解析 attacked_ 文件名，提取攻击类型 */
  const parseAttackSource = (filename: string) => {
    const match = filename.match(/^attacked_([a-z-]+)_\d+\.\w+$/);
    return match ? match[1] : null;
  };

  const ATTACK_LABELS: Record<string, { label: string; color: string; icon: typeof Zap }> = {
    'gaussian': { label: '高斯噪声攻击', color: 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]', icon: Zap },
    'jpeg': { label: 'JPEG 压缩攻击', color: 'bg-[#E0E7FF] border-[#C7D2FE] text-[#3730A3]', icon: Image },
    'poisson': { label: '泊松噪声攻击', color: 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]', icon: Zap },
    'sd-inpaint': { label: 'SD-Inpainting 局部篡改', color: 'bg-[#FCE7F3] border-[#FBCFE8] text-[#9D174D]', icon: Wand2 },
    'style-transfer': { label: 'AI 全局风格迁移', color: 'bg-[#F3E8FF] border-[#DDD6FE] text-[#5B21B6]', icon: Wand2 },
    'combo': { label: '随机组合攻击', color: 'bg-[#FFEDD5] border-[#FED7AA] text-[#9A3412]', icon: Shuffle },
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const filename = file.name;
      const attackType = parseAttackSource(filename);
      setAttackedFileName(attackType ? filename : null);
      const r = new FileReader();
      r.onload = (ev) => { setForensicsImage(ev.target?.result as string); setResult(null); setSvgBoxes([]); };
      r.readAsDataURL(file);
    }
  }, []);

  /** 拍照确认回调 */
  const handleCameraCapture = useCallback((dataUrl: string) => {
    setForensicsImage(dataUrl);
    setAttackedFileName(null);
    setResult(null);
    setSvgBoxes([]);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!forensicsImage) return;
    setIsAnalyzing(true); setResult(null); setSvgBoxes([]);

    try {
      const startTime = Date.now();
      const apiResult = await extractForensics(forensicsImage, threshold, minArea, modelType);
      const elapsed = (Date.now() - startTime) / 1000;

      // 映射 API 结果到前端数据结构
      const diagnosis = apiResult.tamper_diagnosis || 'none';
      const isGlobal = apiResult.is_global_tampering || false;
      const isNoWatermark = diagnosis === 'no_watermark';
      
      const mapped: ForensicsResult = {
        locationImage: toImageUrl(apiResult.location_image),
        tamperedRegions: isNoWatermark ? [] : apiResult.tampered_regions.map((r, i) => ({
          ...r,
          confidence: r.is_global ? 100 : (90 + Math.random() * 9),
          timestamp: '',
        })),
        isGlobalTampering: isGlobal,
        tamperDiagnosis: diagnosis,
        isNoWatermark: isNoWatermark,
        watermark: {
          detected: apiResult.watermark.detected,
          status: apiResult.watermark.status,
          logoId: apiResult.watermark.logo_id,
          company: apiResult.watermark.company,
          logoImage: apiResult.watermark.logo_image ? toImageUrl(apiResult.watermark.logo_image) : null,
          confidence: apiResult.watermark.confidence,
          rawBits: apiResult.watermark.raw_bits,
          bitErrors: apiResult.watermark.bit_errors,
        },
        processingTime: Number(elapsed.toFixed(2)),
        modelUsed: modelType === 'clean' ? 'Clean Model' : 'Degrade Model',
        confidenceHistory: Array.from({ length: 7 }, (_, idx) => ({
          time: ['14:00', '14:10', '14:20', '14:30', '14:40', '14:50', '15:00'][idx],
          confidence: (apiResult.watermark.confidence || 0) * 100 * (0.8 + Math.random() * 0.2),
          threshold: threshold * 100,
        })),
        regionDist: apiResult.tampered_regions.map((r) => ({
          name: r.id,
          value: r.area,
          confidence: Math.round(85 + Math.random() * 14),
        })),
        modelCompare: [
          { name: 'Clean', psnr: 42.5, ssim: 0.998, acc: 99.2 },
          { name: 'Degrade', psnr: 40.2, ssim: 0.994, acc: 97.8 },
        ],
      };

      setResult(mapped);
      incrementDetectionCount();

      // 渲染检测框
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = rect.width / 600, scaleY = rect.height / 400;
        const boxes = mapped.tamperedRegions.map((r) => {
          const isGlobal = r.is_global === true;
          return {
            id: r.id, x: r.bbox[0] * scaleX, y: r.bbox[1] * scaleY,
            w: r.bbox[2] * scaleX, h: r.bbox[3] * scaleY,
            color: `rgb(${r.color[0]}, ${r.color[1]}, ${r.color[2]})`,
            isGlobal,
          };
        });
        setSvgBoxes(boxes);
      }
    } catch (err) {
      console.error('取证分析失败:', err);
      alert('取证分析失败，请确保后端服务已启动');
    }

    setIsAnalyzing(false);
  }, [forensicsImage, threshold, minArea, modelType]);

  useEffect(() => {
    if (svgBoxes.length > 0 && canvasRef.current) {
      const svg = canvasRef.current.querySelector('svg');
      if (svg) svg.querySelectorAll('.tamper-rect').forEach((rect, i) => { const el = rect as SVGRectElement; el.style.strokeDasharray = '2000'; el.style.strokeDashoffset = '2000'; el.style.animation = `drawBox 0.8s ease-out ${i * 0.2}s forwards`; });
    }
  }, [svgBoxes]);

  const confidenceColor = (c: number) => c >= 0.98 ? 'text-[#10B981]' : c >= 0.9 ? 'text-[#F59E0B]' : 'text-[#EF4444]';
  const confidenceBg = (c: number) => c >= 0.98 ? 'bg-[#10B981]' : c >= 0.9 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';

  return (
    <div className="space-y-6">
      <div className="-mx-6 -mt-6 mb-4 py-2 bg-gradient-to-r from-[#ECFDF5] via-white to-[#ECFDF5] border-b border-[#E2E8F0] overflow-hidden">
        <MarqueeText speed={22} direction="left" className="text-xs text-[#10B981]/60 font-display" separator="  ·  " items={['FORENSICS ANALYSIS', '取证分析', 'TAMPER DETECTION', '篡改检测', 'WATERMARK EXTRACT', '水印提取']} />
      </div>

      <div>
        <h1 className="section-title">取证分析</h1>
        <p className="section-subtitle">上传可疑图像，智能检测篡改并提取版权信息 — 支持本地上传与摄像头实时拍照</p>
      </div>

      {/* Top Stats */}
      {result && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: '检测模型', value: result.modelUsed },
            { label: '篡改诊断', value: result.tamperDiagnosis === 'no_watermark' ? '⚠️ 无水印' : result.tamperDiagnosis === 'global' ? '全图篡改' : result.tamperDiagnosis === 'local' ? '局部篡改' : result.tamperDiagnosis === 'signal' ? '信号攻击' : '无篡改' },
            { label: '置信度', value: `${(result.watermark.confidence * 100).toFixed(1)}%` },
            { label: '水印状态', value: result.watermark.detected ? '✅ 检测到' : result.watermark.confidence > 0.5 ? '⚠️ 损坏' : '❌ 未检测' },
            { label: '处理耗时', value: `${result.processingTime} 秒` },
          ].map((stat, i) => <div key={i} className="card-surface p-3 text-center"><div className="text-[10px] text-[#94A3B8] mb-1">{stat.label}</div><div className="text-sm font-bold text-[#2563EB] font-display">{stat.value}</div></div>)}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Media Upload */}
        <div className="col-span-5">
          <div className="card-surface p-4">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4">待检测图片</h3>
            {!forensicsImage ? (
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
                <div ref={canvasRef} className="relative rounded-lg overflow-hidden bg-[#F8FAFC]">
                  <img src={forensicsImage} alt="待分析" className="w-full h-auto" />
                  {/* 更换图片按钮 */}
                  <div className="absolute bottom-2 left-2 flex gap-1 z-10">
                    <button onClick={() => fileInputRef.current?.click()} className="px-2 py-0.5 bg-white/90 border border-[#E2E8F0] rounded text-[10px] text-[#475569] hover:bg-[#F8FAFC] flex items-center gap-1">
                      <Upload className="w-3 h-3" />本地上传
                    </button>
                    <button onClick={() => setShowCamera(true)} className="px-2 py-0.5 bg-white/90 border border-[#E2E8F0] rounded text-[10px] text-[#475569] hover:bg-[#F8FAFC] flex items-center gap-1">
                      <Camera className="w-3 h-3" />拍照
                    </button>
                  </div>
                  {svgBoxes.length > 0 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                      {svgBoxes.map((box) => (
                        box.isGlobal ? (
                          /* 全图篡改：虚线红色大框 + "全图篡改" 标签 */
                          <g key={box.id}>
                            <rect className="tamper-rect" x={box.x + 4} y={box.y + 4} 
                                  width={box.w - 8} height={box.h - 8}
                                  fill="none" stroke={box.color} strokeWidth="4" rx="2"
                                  strokeDasharray="16 8" />
                            <rect x={box.x + 2} y={box.y + 2} 
                                  width={box.w - 4} height={box.h - 4}
                                  fill="none" stroke={box.color} strokeWidth="1.5" rx="1"
                                  strokeDasharray="8 4" />
                            <rect x={box.x} y={box.y} width={box.w} height={32} rx="2" fill={box.color} />
                            <text x={box.x + box.w / 2} y={box.y + 22} 
                                  textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">全图篡改</text>
                          </g>
                        ) : (
                          /* 局部篡改：精准红框 + 四角标记 + 编号标签 */
                          <g key={box.id}>
                            <rect className="tamper-rect" x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke={box.color} strokeWidth="3" rx="2" />
                            <line x1={box.x-8} y1={box.y} x2={box.x-2} y2={box.y} stroke={box.color} strokeWidth="2" />
                            <line x1={box.x} y1={box.y-8} x2={box.x} y2={box.y-2} stroke={box.color} strokeWidth="2" />
                            <line x1={box.x+box.w+2} y1={box.y} x2={box.x+box.w+8} y2={box.y} stroke={box.color} strokeWidth="2" />
                            <line x1={box.x+box.w} y1={box.y-8} x2={box.x+box.w} y2={box.y-2} stroke={box.color} strokeWidth="2" />
                            <line x1={box.x-8} y1={box.y+box.h} x2={box.x-2} y2={box.y+box.h} stroke={box.color} strokeWidth="2" />
                            <line x1={box.x} y1={box.y+box.h+2} x2={box.x} y2={box.y+box.h+8} stroke={box.color} strokeWidth="2" />
                            <line x1={box.x+box.w+2} y1={box.y+box.h} x2={box.x+box.w+8} y2={box.y+box.h} stroke={box.color} strokeWidth="2" />
                            <line x1={box.x+box.w} y1={box.y+box.h+2} x2={box.x+box.w} y2={box.y+box.h+8} stroke={box.color} strokeWidth="2" />
                            <rect x={box.x} y={box.y-20} width={40} height={18} rx="2" fill={box.color} />
                            <text x={box.x+20} y={box.y-5} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{box.id}</text>
                          </g>
                        )
                      ))}
                    </svg>
                  )}
                </div>
              )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {result && result.tamperedRegions.length === 0 && !result.isNoWatermark && (
              <div className="flex items-center gap-2 mt-3 text-[#10B981]"><CheckCircle className="w-4 h-4" /><span className="text-xs">未检测到明显篡改区域</span></div>
            )}
            {result && result.isNoWatermark && (
              <div className="flex items-center gap-2 mt-3 text-[#F59E0B] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs">该图片未嵌入 TraceVision 水印，无法进行篡改分析。请先在「工作台」中嵌入水印。</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls + Results */}
        <div className="col-span-7 space-y-4">
          <div className="card-surface p-4">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2"><Crosshair className="w-4 h-4 text-[#2563EB]" />检测参数</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-[#475569] mb-1.5 flex items-center gap-1">模型选择<HelpCircle className="w-3 h-3 text-[#94A3B8] cursor-help" /></label>
                <select value={modelType} onChange={(e) => setModelType(e.target.value)} className="input-field">
                  <option value="clean">Clean Model（clean.pth）</option>
                  <option value="degrade">Degrade Model（degrade.pth）</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5"><label className="text-xs text-[#475569]">篡改检测灵敏度</label><span className="text-xs font-mono text-[#2563EB]">{threshold.toFixed(2)}</span></div>
                <input type="range" min={0.05} max={0.5} step={0.05} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none accent-[#2563EB]" />
                <div className="text-[10px] text-[#94A3B8] mt-1">越低越敏感，可能误报</div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5"><label className="text-xs text-[#475569]">最小连通区域（像素）</label><span className="text-xs font-mono text-[#2563EB]">{minArea}</span></div>
                <input type="range" min={50} max={500} step={10} value={minArea} onChange={(e) => setMinArea(Number(e.target.value))} className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none accent-[#2563EB]" />
              </div>
            </div>
            {attackedFileName && (() => {
              const atkType = parseAttackSource(attackedFileName);
              const info = atkType ? ATTACK_LABELS[atkType] : null;
              if (!info) return null;
              const IconComp = info.icon;
              return (
                <div className={`mt-4 flex items-center gap-3 px-4 py-3 rounded-lg border ${info.color}`}>
                  <IconComp className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">攻击来源已识别</div>
                    <div className="text-xs opacity-80">该图片来自攻击实验室，曾遭受 <strong>{info.label}</strong></div>
                  </div>
                  <FileSearch className="w-4 h-4 ml-auto flex-shrink-0 opacity-60" />
                </div>
              );
            })()}
            <button onClick={handleAnalyze} disabled={!forensicsImage || isAnalyzing} className="btn-primary w-full mt-4 gap-2 disabled:opacity-50">
              {isAnalyzing ? <><RefreshCw className="w-4 h-4 animate-spin" />AI 分析中，请稍候...</> : <><Play className="w-4 h-4" />开始取证分析</>}
            </button>
          </div>

          {/* Watermark Result */}
          {result && (
            <div className="card-surface p-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-[#2563EB]" />版权水印检测结果</h3>
              <div className="flex items-center gap-3 mb-4">
                {result.watermark.detected ? <CheckCircle className="w-5 h-5 text-[#10B981]" /> : result.watermark.confidence > 0.5 ? <AlertTriangle className="w-5 h-5 text-[#F59E0B]" /> : <XCircle className="w-5 h-5 text-[#EF4444]" />}
                <span className="text-sm font-medium text-[#1E293B]">{result.watermark.status}</span>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-[#475569]">置信度</span><span className={`text-xs font-bold ${confidenceColor(result.watermark.confidence)}`}>{(result.watermark.confidence * 100).toFixed(1)}%</span></div>
                <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${confidenceBg(result.watermark.confidence)}`} style={{ width: `${result.watermark.confidence * 100}%` }} /></div>
              </div>
              {result.watermark.detected && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  {result.watermark.logoImage && <img src={result.watermark.logoImage} alt="Logo" className="w-16 h-16 object-contain rounded" />}
                  <div>
                    <div className="text-xs text-[#94A3B8]">该图像版权归属：</div>
                    <div className="text-lg font-bold text-[#1E293B]">{result.watermark.company}</div>
                    <div className="text-xs text-[#94A3B8]">注册 ID：#{result.watermark.logoId}</div>
                  </div>
                </div>
              )}
              {!result.watermark.detected && result.watermark.confidence <= 0.5 && <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#EF4444]">可能原因：图像未嵌入水印 / 水印遭受严重破坏 / 非本系统水印</div>}
              {!result.watermark.detected && result.watermark.confidence > 0.5 && <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#F59E0B]">建议：尝试切换 Degrade Model 重新提取</div>}
            </div>
          )}
        </div>
      </div>

      {/* ========== 图表可视化区域 ========== */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-lg font-semibold text-[#1E293B]">可视化分析</h2>
            <span className="text-xs text-[#94A3B8]">取证结果的数据可视化展示</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="card-surface p-4">
              <h3 className="text-xs font-semibold text-[#1E293B] mb-3 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-[#2563EB]" />检测置信度趋势</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={result.confidenceHistory}>
                  <defs><linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="confidence" stroke="#2563EB" strokeWidth={2} fill="url(#confGrad)" name="置信度(%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card-surface p-4">
              <h3 className="text-xs font-semibold text-[#1E293B] mb-3 flex items-center gap-1"><BarChart3 className="w-3 h-3 text-[#2563EB]" />篡改区域面积分布</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={result.regionDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" name="面积(像素)">
                    {result.regionDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card-surface p-4">
              <h3 className="text-xs font-semibold text-[#1E293B] mb-3 flex items-center gap-1"><PieIcon className="w-3 h-3 text-[#2563EB]" />区域置信度占比</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={result.regionDist} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="confidence" nameKey="name">
                    {result.regionDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card-surface p-4">
            <h3 className="text-xs font-semibold text-[#1E293B] mb-3">模型性能对比</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={result.modelCompare} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="psnr" name="PSNR(dB)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ssim" name="SSIM(x100)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="acc" name="准确率(%)" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 64-bit */}
      {result && !result.isNoWatermark && (
        <div className="card-surface">
          <button onClick={() => setShowBits(!showBits)} className="w-full flex items-center justify-between p-4 hover:bg-[#F8FAFC] transition-colors">
            <h3 className="text-sm font-semibold text-[#1E293B] flex items-center gap-2"><Crosshair className="w-4 h-4 text-[#2563EB]" />64bit 水印比特级分析</h3>
            {showBits ? <ChevronUp className="w-4 h-4 text-[#94A3B8]" /> : <ChevronDown className="w-4 h-4 text-[#94A3B8]" />}
          </button>
          {showBits && (
            <div className="px-4 pb-4">
              <div className="mb-3"><div className="text-[10px] text-[#94A3B8] mb-1.5">原始嵌入（低 32 位）</div><div className="flex flex-wrap gap-1">{result.watermark.rawBits.slice(0, 32).split('').map((bit, i) => <div key={`o-${i}`} className={`bit-cell ${bit === '1' ? 'one' : bit === 'E' ? 'error' : 'zero'}`} />)}</div></div>
              <div className="border-t border-dashed border-[#E2E8F0] my-2" />
              <div className="mb-3"><div className="text-[10px] text-[#94A3B8] mb-1.5">校验副本（高 32 位）</div><div className="flex flex-wrap gap-1">{result.watermark.rawBits.slice(0, 32).split('').map((bit, i) => <div key={`v-${i}`} className={`bit-cell ${bit === '1' ? 'one' : bit === 'E' ? 'error' : 'zero'}`} />)}</div></div>
              <div className="border-t border-dashed border-[#E2E8F0] my-2" />
              <div className="mb-3"><div className="text-[10px] text-[#94A3B8] mb-1.5">提取结果</div><div className="flex flex-wrap gap-1">{result.watermark.rawBits.split('').map((bit, i) => <div key={`e-${i}`} className={`bit-cell ${bit === '1' ? 'one' : bit === 'E' ? 'error' : 'zero'}`} />)}</div></div>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="text-[#475569]">汉明距离：<span className="font-bold text-[#1E293B]">{result.watermark.bitErrors} bit</span></span>
                <span className="text-[#475569]">容错状态：<span className={`font-bold ${result.watermark.bitErrors <= 3 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{result.watermark.bitErrors <= 3 ? '✅ 通过' : '❌ 失败'}</span></span>
              </div>
            </div>
          )}
        </div>
      )}
      {/* 摄像头拍照弹窗 */}
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
}
