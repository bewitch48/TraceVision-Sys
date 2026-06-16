import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import MarqueeText from '@/components/MarqueeText';
import { Search, Filter, Download, Eye, CheckCircle, Trash2, AlertTriangle, Info, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const levelConfig = {
  critical: { icon: XCircle, color: 'text-[#EF4444]', bg: 'bg-[#FEE2E2]', label: '严重' },
  warning: { icon: AlertTriangle, color: 'text-[#F59E0B]', bg: 'bg-[#FFFBEB]', label: '一般' },
  info: { icon: Info, color: 'text-[#3B82F6]', bg: 'bg-[#EFF6FF]', label: '提示' },
};

const statusConfig = {
  pending: { label: '未处置', color: 'text-[#F59E0B]' },
  resolved: { label: '已确认', color: 'text-[#10B981]' },
  false_positive: { label: '误报', color: 'text-[#94A3B8]' },
  archived: { label: '已归档', color: 'text-[#64748B]' },
};

export default function Alerts() {
  const { alerts, resolveAlert, deleteAlert } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = alerts.filter((a) => {
    if (levelFilter !== 'all' && a.level !== levelFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pageSize = 5;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = () => {
    const csv = '标题,级别,来源,时间,区域数,置信度\n' + filtered.map((a) => `${a.title},${a.level},${a.source},${a.timestamp},${a.regionCount},${a.confidence}%`).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `告警列表_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('导出成功', { description: `已导出 ${filtered.length} 条告警记录` });
  };

  return (
    <div className="space-y-6">
      <div className="-mx-6 -mt-6 mb-4 py-2 bg-gradient-to-r from-[#FEE2E2] via-white to-[#FEE2E2] border-b border-[#E2E8F0] overflow-hidden">
        <MarqueeText speed={18} direction="left" className="text-xs text-[#EF4444]/50 font-display" separator="  ·  " items={['ALERT CENTER', '告警中心', 'TAMPER WARNING', '篡改预警', 'SECURITY ALERT']} />
      </div>

      <div>
        <h1 className="section-title">告警中心</h1>
        <p className="section-subtitle">篡改检测预警记录与处置</p>
      </div>

      <div className="card-surface p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input type="text" placeholder="搜索告警..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#94A3B8]" />
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-3 py-2 focus:outline-none">
              <option value="all">全部级别</option>
              <option value="critical">严重</option>
              <option value="warning">一般</option>
              <option value="info">提示</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-3 py-2 focus:outline-none">
              <option value="all">全部状态</option>
              <option value="pending">未处置</option>
              <option value="resolved">已确认</option>
              <option value="false_positive">误报</option>
            </select>
          </div>
          <button className="btn-secondary gap-2 text-xs ml-auto" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            导出
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {paged.map((alert) => {
          const level = levelConfig[alert.level];
          const status = statusConfig[alert.status];
          const LevelIcon = level.icon;
          return (
            <div key={alert.id} className="card-surface p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#F8FAFC] flex-shrink-0">
                <img src={alert.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${level.bg} ${level.color}`}>
                    <LevelIcon className="w-3 h-3" />
                    {level.label}
                  </span>
                  <span className="text-xs text-[#94A3B8]">{alert.source}</span>
                </div>
                <div className="text-sm font-medium text-[#1E293B] truncate">{alert.title}</div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-[#94A3B8]">
                  <span>{alert.timestamp}</span>
                  <span>{alert.regionCount} 个区域</span>
                  <span>置信度 {alert.confidence}%</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="p-1.5 hover:bg-[#F1F5F9] rounded transition-colors" title="查看" onClick={() => toast.info('查看告警详情', { description: alert.title })}><Eye className="w-4 h-4 text-[#94A3B8]" /></button>
                <button className="p-1.5 hover:bg-[#ECFDF5] rounded transition-colors" title="处置" onClick={() => { resolveAlert(alert.id); toast.success('告警已处置', { description: alert.title }); }}><CheckCircle className="w-4 h-4 text-[#10B981]" /></button>
                <button className="p-1.5 hover:bg-[#FEE2E2] rounded transition-colors" title="删除" onClick={() => { deleteAlert(alert.id); toast.error('告警已删除', { description: alert.title }); }}><Trash2 className="w-4 h-4 text-[#94A3B8] hover:text-[#EF4444]" /></button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#94A3B8]">共 {filtered.length} 条告警，{alerts.filter((a) => a.status === 'pending').length} 条待处置</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-[#F1F5F9] disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded text-xs font-medium transition-colors ${currentPage === i + 1 ? 'bg-[#2563EB] text-white' : 'hover:bg-[#F1F5F9] text-[#475569]'}`}>{i + 1}</button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-[#F1F5F9] disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
