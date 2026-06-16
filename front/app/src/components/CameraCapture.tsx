import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, SwitchCamera } from 'lucide-react';

interface CameraCaptureProps {
  /** 拍照确认后的回调，返回 data URL */
  onCapture: (dataUrl: string) => void;
  /** 关闭回调 */
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /** 启动摄像头 */
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setLoading(true);
    setError(null);
    setCaptured(null);

    // 先释放旧的 stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError('无法访问摄像头，请检查权限设置');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** 拍照 */
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCaptured(canvas.toDataURL('image/png'));
  };

  /** 确认使用 */
  const handleConfirm = () => {
    if (captured) {
      onCapture(captured);
      onClose();
    }
  };

  /** 重拍 */
  const handleRetake = () => {
    setCaptured(null);
  };

  /** 切换摄像头 */
  const handleSwitch = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-6 w-96 text-center shadow-2xl">
          <div className="text-red-500 mb-3 text-4xl">⚠️</div>
          <p className="text-[#475569] mb-4">{error}</p>
          <button onClick={onClose} className="btn-primary px-6 py-2">关闭</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-2xl w-full mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 text-[#1E293B] font-semibold">
            <Camera className="w-5 h-5 text-[#2563EB]" />
            {captured ? '确认照片' : '实时拍照'}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#475569]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 画面区域 */}
        <div className="relative bg-black min-h-[360px] flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <RefreshCw className="w-8 h-8 text-white animate-spin" />
            </div>
          )}

          {captured ? (
            <img src={captured} alt="拍摄结果" className="max-w-full max-h-[500px] object-contain" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="max-w-full max-h-[500px]" />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-[#E2E8F0]">
          {captured ? (
            <>
              <button onClick={handleRetake} className="flex items-center gap-2 px-5 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] transition-colors">
                <RefreshCw className="w-4 h-4" /> 重拍
              </button>
              <button onClick={handleConfirm} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors">
                <Check className="w-4 h-4" /> 使用照片
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCapture} className="w-16 h-16 rounded-full bg-white border-4 border-[#2563EB] hover:scale-105 transition-transform shadow-lg">
                <div className="w-10 h-10 rounded-full bg-[#2563EB] mx-auto" />
              </button>
              <button onClick={handleSwitch} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] transition-colors absolute right-5" title="切换摄像头">
                <SwitchCamera className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
