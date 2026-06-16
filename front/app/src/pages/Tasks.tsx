import { useState } from 'react';
import MarqueeText from '@/components/MarqueeText';
import { Plus, Search, Pencil, Trash2, Play, Pause, Eye, Settings, ToggleRight, ToggleLeft, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';

const mockTasks = [
  { id: 'TSK-001', name: '城市图片批量检测', model: 'Clean Model', threshold: 3, status: 'running' as const, created: '2026-03-15 10:00' },
  { id: 'TSK-002', name: '风景图鲁棒性测试', model: 'Degrade Model', threshold: 5, status: 'paused' as const, created: '2026-03-14 14:30' },
  { id: 'TSK-003', name: '办公室内景扫描', model: 'Clean Model', threshold: 2, status: 'stopped' as const, created: '2026-03-12 09:15' },
  { id: 'TSK-004', name: '社交媒体流监控', model: 'Degrade Model', threshold: 4, status: 'running' as const, created: '2026-03-10 16:45' },
];

const statusConfig = {
  running: { color: 'text-[#10B981]', bg: 'bg-[#ECFDF5]', dot: 'bg-[#10B981]', label: '运行中' },
  paused: { color: 'text-[#F59E0B]', bg: 'bg-[#FFFBEB]', dot: 'bg-[#F59E0B]', label: '已暂停' },
  stopped: { color: 'text-[#EF4444]', bg: 'bg-[#FEE2E2]', dot: 'bg-[#EF4444]', label: '已停止' },
};

export default function Tasks() {
  const [tasks, setTasks] = useState(mockTasks);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{ name: string; model: string; threshold: number; enableAlert: boolean; mode: 'precise' | 'fast'; location: string }>({ name: '', model: 'clean', threshold: 3, enableAlert: true, mode: 'precise', location: '' });

  const toggleStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const states: Array<'running' | 'paused' | 'stopped'> = ['running', 'paused', 'stopped'];
        const idx = states.indexOf(t.status);
        return { ...t, status: states[(idx + 1) % 3] };
      })
    );
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    setTasks((prev) => [{
      id: `TSK-${String(prev.length + 1).padStart(3, '0')}`,
      name: formData.name,
      model: formData.model === 'clean' ? 'Clean Model' : 'Degrade Model',
      threshold: formData.threshold,
      status: 'running',
      created: new Date().toISOString().slice(0, 16).replace('T', ' '),
    }, ...prev]);
    setShowForm(false);
    setFormData({ name: '', model: 'clean', threshold: 3, enableAlert: true, mode: 'precise', location: '' });
  };

  return (
    <div className="space-y-6">
      <div className="-mx-6 -mt-6 mb-4 py-2 bg-gradient-to-r from-[#F3E8FF] via-white to-[#F3E8FF] border-b border-[#E2E8F0] overflow-hidden">
        <MarqueeText speed={19} direction="left" className="text-xs text-[#A855F7]/50 font-display" separator="  ·  " items={['TASK MANAGER', '任务管理', 'DETECTION TASKS', '检测任务', 'MONITORING']} />
      </div>

      <div>
        <h1 className="section-title">检测任务管理</h1>
        <p className="section-subtitle">管理检测任务、监控源与模型配置</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input type="text" placeholder="搜索任务..." className="pl-9 pr-4 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary gap-2 text-xs">
          <Plus className="w-4 h-4" />
          新建任务
        </button>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">任务 ID</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">任务名称</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">检测模型</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">告警阈值</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">状态</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">创建时间</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-[#94A3B8]">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const status = statusConfig[task.status];
              return (
                <tr key={task.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-4 text-xs font-mono text-[#94A3B8]">{task.id}</td>
                  <td className="py-3 px-4 font-medium text-[#1E293B]">{task.name}</td>
                  <td className="py-3 px-4 text-xs text-[#475569]">{task.model}</td>
                  <td className="py-3 px-4 text-xs text-[#475569]">{task.threshold}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#94A3B8]">{task.created}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => toggleStatus(task.id)} className="p-1 hover:bg-[#F1F5F9] rounded transition-colors mr-1" title="切换状态">
                      {task.status === 'running' ? <Pause className="w-3.5 h-3.5 text-[#F59E0B]" /> : <Play className="w-3.5 h-3.5 text-[#10B981]" />}
                    </button>
                    <button className="p-1 hover:bg-[#F1F5F9] rounded transition-colors mr-1" onClick={() => toast.info('查看任务详情', { description: `${task.id}: ${task.name}` })}><Eye className="w-3.5 h-3.5 text-[#94A3B8]" /></button>
                    <button className="p-1 hover:bg-[#F1F5F9] rounded transition-colors mr-1" onClick={() => toast.info('编辑任务', { description: `正在编辑 ${task.id}` })}><Pencil className="w-3.5 h-3.5 text-[#94A3B8]" /></button>
                    <button className="p-1 hover:bg-[#FEE2E2] rounded transition-colors" onClick={() => { setTasks((prev) => prev.filter((t) => t.id !== task.id)); toast.success('任务已删除', { description: `${task.id}: ${task.name}` }); }}><Trash2 className="w-3.5 h-3.5 text-[#94A3B8] hover:text-[#EF4444]" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl w-[560px] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[#1E293B] mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-[#2563EB]" />新建检测任务</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#475569] mb-1.5 block">任务名称</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="输入任务名称" className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-[#475569] mb-1.5 block">检测模型</label>
                  <select value={formData.model} onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))} className="input-field">
                    <option value="clean">Clean Model</option>
                    <option value="degrade">Degrade Model</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#475569] mb-1.5 block">图片源路径</label>
                <input type="text" placeholder="/data/images/batch_001/" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#475569] mb-1.5 block">告警阈值（篡改区域数）</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={10} value={formData.threshold} onChange={(e) => setFormData((p) => ({ ...p, threshold: Number(e.target.value) }))} className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full appearance-none accent-[#2563EB]" />
                    <span className="text-xs font-mono text-[#2563EB] w-6">{formData.threshold}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#475569] mb-1.5 block">开启告警</label>
                  <button onClick={() => setFormData((p) => ({ ...p, enableAlert: !p.enableAlert }))} className="flex items-center gap-2">
                    {formData.enableAlert ? <ToggleRight className="w-8 h-8 text-[#2563EB]" /> : <ToggleLeft className="w-8 h-8 text-[#CBD5E1]" />}
                    <span className="text-xs text-[#475569]">{formData.enableAlert ? '开' : '关'}</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#475569] mb-1.5 block">检测模式</label>
                <div className="flex gap-3">
                  {['fast', 'precise'].map((m) => (
                    <button key={m} onClick={() => setFormData((p) => ({ ...p, mode: m as 'precise' | 'fast' }))} className={`flex-1 py-2.5 text-xs font-medium rounded-md border transition-all ${formData.mode === m ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#E2E8F0] text-[#475569] hover:border-[#2563EB]/30'}`}>
                      <SlidersHorizontal className="w-3.5 h-3.5 mx-auto mb-1" />
                      {m === 'fast' ? '快速模式' : '精确模式'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#475569] mb-1.5 block">任务地点</label>
                <input type="text" value={formData.location} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} placeholder="例如：北京数据中心" className="input-field" />
              </div>
              <div>
                <label className="text-xs text-[#475569] mb-1.5 block">备注</label>
                <textarea placeholder="可选配置备注..." className="input-field h-16 resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-ghost text-xs">取消</button>
              <button onClick={handleSubmit} className="btn-primary text-xs gap-2"><Play className="w-3.5 h-3.5" />创建任务</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
