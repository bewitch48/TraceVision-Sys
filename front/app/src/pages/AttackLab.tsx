import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import CameraCapture from '@/components/CameraCapture';
import MarqueeText from '@/components/MarqueeText';
import {
  Upload,
  Play,
  RotateCcw,
  Save,
  Zap,
  Image,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Wand2,
  SlidersHorizontal,
  Trash2,
  Eye,
  Camera,
  Download,
} from 'lucide-react';
import {
  inpaintAttack,
  styleTransfer,
  gaussianNoise,
  jpegCompress,
  poissonNoise,
  comboAttack,
  toImageUrl,
} from '@/services/api';

const attackCategories = [
  {
    name: 'AIGC 篡改',
    attacks: [
      { id: 'sd-inpaint', name: 'SD-Inpainting', icon: Wand2 },
    ],
  },
  {
    name: '信号攻击',
    attacks: [
      { id: 'gaussian', name: '高斯噪声', icon: Zap },
      { id: 'jpeg', name: 'JPEG 压缩', icon: Image },
      { id: 'poisson', name: '泊松噪声', icon: Zap },
    ],
  },
  {
    name: '组合攻击',
    attacks: [{ id: 'shuffle', name: '随机组合 Shuffle', icon: Shuffle }],
  },
];

const mockHistory = [
  { id: 'ATK-001', type: 'SD-Inpainting', params: '提示词: "添加建筑"', timestamp: '2026-03-15 14:20:00', detected: true },
  { id: 'ATK-002', type: '高斯噪声', params: 'σ = 5.0', timestamp: '2026-03-15 13:15:00', detected: true },
  { id: 'ATK-003', type: 'JPEG 压缩', params: 'Q = 75', timestamp: '2026-03-15 11:30:00', detected: false },
];

export default function AttackLab() {
  const { uploadedImage, setUploadedImage, addAttackRecord } = useStore();
  const [selectedAttack, setSelectedAttack] = useState('sd-inpaint');
  const [gaussianSigma, setGaussianSigma] = useState(5);
  const [jpegQuality, setJpegQuality] = useState(80);
  const [inpaintPrompt, setInpaintPrompt] = useState('');
  const [attackedImage, setAttackedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(mockHistory);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [fullImageEdit, setFullImageEdit] = useState(true);
  const [lastAttackType, setLastAttackType] = useState('');

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        setUploadedImage(url);
        setAttackedImage(null);
        setMaskDataUrl(null);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  /** 拍照确认回调 */
  const handleCameraCapture = useCallback((dataUrl: string) => {
    setUploadedImage(dataUrl);
    setAttackedImage(null);
    setMaskDataUrl(null);
  }, [setUploadedImage]);

  /** 遮罩绘制 - 初始化 canvas */
  const initMaskCanvas = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas || !uploadedImage) return;
    const img = document.createElement('img');
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    img.src = uploadedImage;
  }, [uploadedImage]);

  /** 遮罩绘制事件 */
  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    ctx.lineWidth = 50;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    const canvas = maskCanvasRef.current;
    if (canvas) {
      setMaskDataUrl(canvas.toDataURL('image/png'));
    }
  }, []);

  /** 清除遮罩 */
  const clearMask = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setMaskDataUrl(null);
  }, []);

  const handleApplyAttack = useCallback(async () => {
    if (!uploadedImage) return;
    setIsProcessing(true);

    try {
      let resultImage: string | null = null;
      let attackType = '';

      if (selectedAttack === 'gaussian') {
        const res = await gaussianNoise(uploadedImage, gaussianSigma);
        resultImage = res.noisy_image;
        attackType = `高斯噪声 σ=${res.sigma}`;
      } else if (selectedAttack === 'jpeg') {
        const res = await jpegCompress(uploadedImage, jpegQuality);
        resultImage = res.jpeg_image;
        attackType = `JPEG 压缩 Q=${res.quality}`;
      } else if (selectedAttack === 'poisson') {
        const res = await poissonNoise(uploadedImage);
        resultImage = res.poisson_image;
        attackType = '泊松噪声';
      } else if (selectedAttack === 'sd-inpaint') {
        if (fullImageEdit) {
          // 全图风格迁移 - 不需要遮罩
          const res = await styleTransfer(uploadedImage, inpaintPrompt || '赛格朋克风格，霓虹灯光');
          resultImage = res.tampered_image;
          attackType = `风格迁移 "${inpaintPrompt || '赛格朋克风格，霓虹灯光'}"`;
        } else {
          // 局部遮罩编辑
          if (!maskDataUrl) {
            alert('请绘制遮罩区域或开启全图编辑模式');
            setIsProcessing(false);
            return;
          }
          const res = await inpaintAttack(uploadedImage, maskDataUrl, inpaintPrompt || '赛格朋克风格，霓虹灯光');
          resultImage = res.tampered_image;
          attackType = `SD-Inpainting "${inpaintPrompt || '赛格朋克风格，霓虹灯光'}"`;
        }
      } else if (selectedAttack === 'shuffle') {
        const res = await comboAttack(uploadedImage);
        resultImage = res.attacked_image;
        attackType = `随机组合: ${res.applied_attacks.join(', ')}`;
      }

      if (resultImage) {
        setAttackedImage(toImageUrl(resultImage));
        // 记录本次攻击类型，供下载文件名使用
        if (selectedAttack === 'sd-inpaint') {
          setLastAttackType(fullImageEdit ? 'style-transfer' : 'sd-inpaint');
        } else {
          setLastAttackType(selectedAttack);
        }
      }

      const newRecord = {
        id: `ATK-${String(history.length + 1).padStart(3, '0')}`,
        type: attackType || selectedAttack,
        params: selectedAttack === 'sd-inpaint'
          ? (fullImageEdit ? `风格迁移: "${inpaintPrompt || '赛格朋克风格，霓虹灯光'}"` : `Inpainting: "${inpaintPrompt || '赛格朋克风格，霓虹灯光'}"`)
          : attackType,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        detected: true,
      };
      setHistory((prev) => [newRecord, ...prev]);
      addAttackRecord({
        id: newRecord.id,
        type: newRecord.type,
        params: { value: newRecord.params },
        timestamp: newRecord.timestamp,
        watermarkDetected: newRecord.detected,
        imageUrl: resultImage ? toImageUrl(resultImage) : '',
      });
    } catch (err) {
      console.error('攻击失败:', err);
      alert('攻击失败，请确保后端服务已启动');
    }

    setIsProcessing(false);
  }, [uploadedImage, selectedAttack, gaussianSigma, jpegQuality, inpaintPrompt, maskDataUrl, fullImageEdit, history.length, addAttackRecord]);

  const getSelectedAttackName = () => {
    return attackCategories.flatMap((c) => c.attacks).find((a) => a.id === selectedAttack)?.name || '';
  };

  return (
    <div className="space-y-6">
      {/* 动态滚动横幅 */}
      <div className="-mx-6 -mt-6 mb-4 py-2 bg-gradient-to-r from-[#FEF3C7] via-white to-[#FEF3C7] border-b border-[#E2E8F0] overflow-hidden">
        <MarqueeText
          speed={20}
          direction="right"
          className="text-xs text-[#F59E0B]/60 font-display"
          separator="  ·  "
          items={['ATTACK LABORATORY', '攻击实验室', 'ROBUSTNESS TEST', '鲁棒性测试', 'TAMPER SIMULATION', '篡改模拟']}
        />
      </div>

      <div>
        <h1 className="section-title">攻击实验室</h1>
        <p className="section-subtitle">模拟真实场景攻击，验证水印鲁棒性</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Attack Type Selection */}
        <div className="col-span-3">
          <div className="card-surface p-4">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4">攻击类型</h3>
            <div className="space-y-4">
              {attackCategories.map((category) => (
                <div key={category.name}>
                  <div className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider mb-2">{category.name}</div>
                  <div className="space-y-1">
                    {category.attacks.map((attack) => {
                      const Icon = attack.icon;
                      const isSelected = selectedAttack === attack.id;
                      return (
                        <button
                          key={attack.id}
                          onClick={() => setSelectedAttack(attack.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm transition-all ${
                            isSelected
                              ? 'bg-[#EFF6FF] border-l-[3px] border-[#2563EB] text-[#2563EB] font-medium'
                              : 'text-[#475569] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{attack.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview & Controls */}
        <div className="col-span-9 space-y-6">
          {/* Three-image comparison */}
          <div className="card-surface p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[#94A3B8] mb-2 flex items-center justify-between">
                  <span>原始图片（含水印）</span>
                  {selectedAttack === 'sd-inpaint' && !fullImageEdit && <span className="text-[10px] text-[#F59E0B]">用鼠标在图上涂抹遮罩区域</span>}
                </div>
                <div className="rounded-lg overflow-hidden bg-[#F8FAFC] border border-[#E2E8F0] h-48 flex items-center justify-center relative">
                  {uploadedImage ? (
                    <>
                      <img src={uploadedImage} alt="原始" className="w-full h-full object-contain" />
                      {selectedAttack === 'sd-inpaint' && !fullImageEdit && (
                        <canvas
                          ref={maskCanvasRef}
                          className="absolute inset-0 w-full h-full cursor-crosshair"
                          style={{ mixBlendMode: 'overlay' }}
                          onMouseDown={startDraw}
                          onMouseMove={draw}
                          onMouseUp={endDraw}
                          onMouseLeave={endDraw}
                        />
                      )}
                      {selectedAttack === 'sd-inpaint' && !fullImageEdit && maskDataUrl && (
                        <button onClick={clearMask} className="absolute top-1 right-1 px-2 py-0.5 bg-white/90 border border-[#E2E8F0] rounded text-[10px] text-[#EF4444] hover:bg-[#FEF2F2]">
                          清除遮罩
                        </button>
                      )}
                      {/* 更换图片按钮 */}
                      <div className="absolute bottom-1 left-1 flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="px-2 py-0.5 bg-white/90 border border-[#E2E8F0] rounded text-[10px] text-[#475569] hover:bg-[#F8FAFC] flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />本地上传
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
                          className="px-2 py-0.5 bg-white/90 border border-[#E2E8F0] rounded text-[10px] text-[#475569] hover:bg-[#F8FAFC] flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3" />拍照
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="upload-zone h-full border-0 flex-col gap-2">
                      <Upload className="w-5 h-5 text-[#CBD5E1]" />
                      <span className="text-xs text-[#94A3B8]">上传图片</span>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="btn-primary text-[10px] px-2.5 py-1 gap-1"
                        >
                          <Upload className="w-3 h-3" />本地上传
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
                          className="btn-secondary text-[10px] px-2.5 py-1 gap-1"
                        >
                          <Camera className="w-3 h-3" />实时拍照
                        </button>
                      </div>
                    </div>
                  )}
                  {/* 隐藏的文件输入，必须始终渲染 */}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </div>
              </div>

              <div>
                <div className="text-xs text-[#94A3B8] mb-2 flex items-center justify-between">
                  <span>攻击后图片</span>
                  {attackedImage && (
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = attackedImage;
                        const slug = lastAttackType || selectedAttack;
                        a.download = `attacked_${slug}_${Date.now()}.png`;
                        a.click();
                      }}
                      className="flex items-center gap-1 text-[10px] text-[#3B82F6] hover:text-[#2563EB] transition-colors"
                    >
                      <Download className="w-3 h-3" />下载
                    </button>
                  )}
                </div>
                <div className="rounded-lg overflow-hidden bg-[#F8FAFC] border border-[#E2E8F0] h-48 flex items-center justify-center">
                  {attackedImage ? (
                    <img src={attackedImage} alt="攻击后" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-[#CBD5E1]">{isProcessing ? '处理中...' : '应用攻击后查看结果'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Attack Parameters Panel */}
          <div className="card-surface p-4">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#2563EB]" />
              攻击参数：{getSelectedAttackName()}
            </h3>

            {selectedAttack === 'sd-inpaint' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[#475569]">全图编辑（无需画遮罩）</label>
                  <button
                    onClick={() => { setFullImageEdit(!fullImageEdit); setMaskDataUrl(null); }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      fullImageEdit ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      fullImageEdit ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <div>
                  <label className="text-xs text-[#475569] mb-1.5 block">
                    {fullImageEdit ? '风格描述' : 'Inpainting 提示词'}
                  </label>
                  <textarea
                    value={inpaintPrompt}
                    onChange={(e) => setInpaintPrompt(e.target.value)}
                    placeholder={fullImageEdit ? '描述你想要的整体效果...' : '描述你想把遮罩区域改成什么...'}
                    className="input-field h-20 resize-none"
                  />
                </div>
                {!fullImageEdit && <div className="text-xs text-[#94A3B8]">在图片上绘制 mask 定义篡改区域</div>}
              </div>
            )}

            {selectedAttack === 'gaussian' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#475569]">噪声强度 σ</label>
                  <span className="text-xs font-mono text-[#2563EB]">{gaussianSigma}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={gaussianSigma}
                  onChange={(e) => setGaussianSigma(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none cursor-pointer accent-[#2563EB]"
                />
                <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                  <span>1</span>
                  <span>15</span>
                </div>
              </div>
            )}

            {selectedAttack === 'jpeg' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#475569]">压缩质量 Q</label>
                  <span className="text-xs font-mono text-[#2563EB]">{jpegQuality}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  value={jpegQuality}
                  onChange={(e) => setJpegQuality(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none cursor-pointer accent-[#2563EB]"
                />
                <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                  <span>50（高压缩）</span>
                  <span>95（低压缩）</span>
                </div>
                <div className="mt-2 text-xs text-[#94A3B8]">预估大小：~{Math.round((jpegQuality / 95) * 15)}% 原始大小</div>
              </div>
            )}

            {selectedAttack === 'poisson' && (
              <div className="text-sm text-[#475569]">模拟光子噪声，无额外参数</div>
            )}

            {selectedAttack === 'shuffle' && (
              <div className="space-y-2">
                <div className="text-sm text-[#475569]">随机叠加 2-3 种组合攻击</div>
                {attackedImage && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFF6FF] text-xs text-[#2563EB]">
                    已应用：高斯噪声 + JPEG 压缩
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleApplyAttack}
                disabled={!uploadedImage || isProcessing}
                className="btn-primary gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                应用攻击
              </button>
              <button
                onClick={() => {
                  setAttackedImage(null);
                }}
                className="btn-ghost gap-2 text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                重置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attack History */}
      <div className="card-surface">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 hover:bg-[#F8FAFC] transition-colors"
        >
          <h3 className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
            <Save className="w-4 h-4 text-[#2563EB]" />
            最近攻击记录（{history.length}）
          </h3>
          {showHistory ? <ChevronUp className="w-4 h-4 text-[#94A3B8]" /> : <ChevronDown className="w-4 h-4 text-[#94A3B8]" />}
        </button>

        {showHistory && (
          <div className="px-4 pb-4">
            {history.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left py-2 px-3 text-xs font-medium text-[#94A3B8]">时间</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[#94A3B8]">攻击类型</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[#94A3B8]">参数</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[#94A3B8]">水印状态</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-[#94A3B8]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-3 text-xs text-[#475569]">{record.timestamp}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs font-medium text-[#1E293B]">{record.type}</span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#94A3B8] truncate max-w-[150px]">{record.params}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            record.detected ? 'text-[#10B981]' : 'text-[#EF4444]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${record.detected ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                          {record.detected ? '可检测' : '已丢失'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button className="p-1 hover:bg-[#F1F5F9] rounded transition-colors">
                          <Eye className="w-3.5 h-3.5 text-[#94A3B8]" />
                        </button>
                        <button className="p-1 hover:bg-[#F1F5F9] rounded transition-colors ml-1">
                          <Trash2 className="w-3.5 h-3.5 text-[#94A3B8] hover:text-[#EF4444]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8">
                <div className="text-sm text-[#CBD5E1]">暂无攻击记录</div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* 摄像头拍照弹窗 */}
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
}
