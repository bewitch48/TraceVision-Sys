import { useState } from 'react';
import MarqueeText from '@/components/MarqueeText';
import { Database, Shield, Bell, HelpCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [config, setConfig] = useState({
    defaultModel: 'clean',
    defaultThreshold: 0.2,
    defaultMinArea: 100,
    messageLength: 64,
    alertThreshold: 3,
    alertNotification: 'in-app',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    toast.success('配置已保存', {
      description: '系统配置参数已更新并生效',
      duration: 3000,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="-mx-6 -mt-6 mb-4 py-2 bg-gradient-to-r from-[#F1F5F9] via-white to-[#F1F5F9] border-b border-[#E2E8F0] overflow-hidden">
        <MarqueeText speed={16} direction="left" className="text-xs text-[#64748B]/50 font-display" separator="  ·  " items={['SYSTEM SETTINGS', '系统配置', 'CONFIGURATION', '参数设置', 'GLOBAL OPTIONS']} />
      </div>

      <div>
        <h1 className="section-title">系统配置</h1>
        <p className="section-subtitle">配置系统级参数</p>
      </div>

      <div className="space-y-6 max-w-3xl">
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E2E8F0]">
            <Database className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-semibold text-[#1E293B]">模型配置</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#475569] mb-1.5 block">默认模型</label>
              <select value={config.defaultModel} onChange={(e) => setConfig((p) => ({ ...p, defaultModel: e.target.value }))} className="input-field">
                <option value="clean">Clean Model（clean.pth）— 高保真</option>
                <option value="degrade">Degrade Model（degrade.pth）— 抗攻击</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#475569] mb-1.5 block">模型文件路径</label>
              <input type="text" value="/models/tracevision/" readOnly className="input-field bg-[#F8FAFC] text-[#94A3B8]" />
            </div>
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E2E8F0]">
            <Shield className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-semibold text-[#1E293B]">水印参数</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#475569]">默认篡改阈值（0.05 ~ 0.50）</label>
                <span className="text-xs font-mono text-[#2563EB]">{config.defaultThreshold.toFixed(2)}</span>
              </div>
              <input type="range" min={0.05} max={0.5} step={0.05} value={config.defaultThreshold} onChange={(e) => setConfig((p) => ({ ...p, defaultThreshold: Number(e.target.value) }))} className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none accent-[#2563EB]" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#475569]">默认最小面积（50 ~ 500 像素）</label>
                <span className="text-xs font-mono text-[#2563EB]">{config.defaultMinArea}</span>
              </div>
              <input type="range" min={50} max={500} step={10} value={config.defaultMinArea} onChange={(e) => setConfig((p) => ({ ...p, defaultMinArea: Number(e.target.value) }))} className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none accent-[#2563EB]" />
            </div>
            <div>
              <label className="text-xs text-[#475569] mb-1.5 block">消息长度</label>
              <div className="input-field bg-[#F8FAFC] text-[#94A3B8]">{config.messageLength}bit（固定）</div>
            </div>
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E2E8F0]">
            <Bell className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-semibold text-[#1E293B]">告警规则</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#475569]">默认告警阈值（篡改区域数，1~10）</label>
                <span className="text-xs font-mono text-[#2563EB]">{config.alertThreshold}</span>
              </div>
              <input type="range" min={1} max={10} value={config.alertThreshold} onChange={(e) => setConfig((p) => ({ ...p, alertThreshold: Number(e.target.value) }))} className="w-full h-1.5 bg-[#E2E8F0] rounded-full appearance-none accent-[#2563EB]" />
            </div>
            <div>
              <label className="text-xs text-[#475569] mb-1.5 block">告警通知方式</label>
              <select value={config.alertNotification} onChange={(e) => setConfig((p) => ({ ...p, alertNotification: e.target.value }))} className="input-field">
                <option value="in-app">站内信通知</option>
                <option value="email">邮件通知</option>
                <option value="webhook">Webhook</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E2E8F0]">
            <HelpCircle className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-semibold text-[#1E293B]">关于系统</h3>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: '系统版本', value: 'TraceVision v1.0' },
              { label: '核心引擎', value: 'TraceVision 自研引擎' },
              { label: '技术框架', value: 'PyTorch 2.0 + React 19' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[#475569]">{item.label}</span>
                <span className="font-medium text-[#1E293B]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          {saved && <span className="text-xs text-[#10B981] font-medium flex items-center gap-1"><Save className="w-3.5 h-3.5" />配置已保存</span>}
          <button onClick={handleSave} className="btn-primary ml-auto gap-2 text-xs"><Save className="w-3.5 h-3.5" />保存配置</button>
        </div>
      </div>
    </div>
  );
}
