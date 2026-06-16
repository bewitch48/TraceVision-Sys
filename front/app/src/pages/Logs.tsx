import { useState } from 'react';
import MarqueeText from '@/components/MarqueeText';
import { Search, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const mockLogs = [
  { id: 1, action: '水印嵌入', user: '管理员', ip: '192.168.1.100', time: '2026-03-15 17:06:37', status: 'success' as const },
  { id: 2, action: '取证分析', user: '管理员', ip: '192.168.1.100', time: '2026-03-15 16:45:12', status: 'success' as const },
  { id: 3, action: '攻击测试：高斯噪声', user: '研究员', ip: '192.168.1.105', time: '2026-03-15 15:30:00', status: 'success' as const },
  { id: 4, action: '新建版权信息', user: '管理员', ip: '192.168.1.100', time: '2026-03-15 14:20:18', status: 'success' as const },
  { id: 5, action: '生成取证报告', user: '管理员', ip: '192.168.1.100', time: '2026-03-15 13:10:45', status: 'success' as const },
  { id: 6, action: '用户登录', user: '研究员', ip: '192.168.1.105', time: '2026-03-15 09:00:00', status: 'success' as const },
  { id: 7, action: '新建任务：城市批量', user: '管理员', ip: '192.168.1.100', time: '2026-03-14 18:30:22', status: 'success' as const },
  { id: 8, action: '告警已处置', user: '管理员', ip: '192.168.1.100', time: '2026-03-14 16:15:00', status: 'success' as const },
  { id: 9, action: '更新系统配置', user: '管理员', ip: '192.168.1.100', time: '2026-03-14 11:45:33', status: 'warning' as const },
  { id: 10, action: '登录失败尝试', user: '未知', ip: '10.0.0.55', time: '2026-03-14 08:20:15', status: 'error' as const },
];

export default function Logs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = mockLogs.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (searchQuery && !l.action.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pageSize = 8;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = () => {
    const csv = 'ID,操作,用户,IP地址,时间,状态\n' + filtered.map((l) => `${l.id},${l.action},${l.user},${l.ip},${l.time},${l.status}`).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `操作日志_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('导出成功', { description: `已导出 ${filtered.length} 条日志记录` });
  };

  return (
    <div className="space-y-6">
      <div className="-mx-6 -mt-6 mb-4 py-2 bg-gradient-to-r from-[#F1F5F9] via-white to-[#F1F5F9] border-b border-[#E2E8F0] overflow-hidden">
        <MarqueeText speed={14} direction="right" className="text-xs text-[#64748B]/50 font-display" separator="  ·  " items={['OPERATION LOGS', '操作日志', 'SYSTEM AUDIT', '系统审计', 'API STATISTICS']} />
      </div>

      <div>
        <h1 className="section-title">操作日志</h1>
        <p className="section-subtitle">系统操作记录与 API 调用统计</p>
      </div>

      <div className="card-surface p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input type="text" placeholder="搜索日志..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-md w-full focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#94A3B8]" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-3 py-2 focus:outline-none">
              <option value="all">全部状态</option>
              <option value="success">成功</option>
              <option value="warning">警告</option>
              <option value="error">错误</option>
            </select>
          </div>
          <button className="btn-secondary gap-2 text-xs ml-auto" onClick={handleExport}><Download className="w-3.5 h-3.5" />导出</button>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">ID</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">操作</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">用户</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">IP 地址</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">时间</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8]">状态</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((log) => (
              <tr key={log.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                <td className="py-3 px-4 text-xs font-mono text-[#94A3B8]">#{log.id}</td>
                <td className="py-3 px-4 text-sm text-[#1E293B]">{log.action}</td>
                <td className="py-3 px-4 text-xs text-[#475569]">{log.user}</td>
                <td className="py-3 px-4 text-xs font-mono text-[#94A3B8]">{log.ip}</td>
                <td className="py-3 px-4 text-xs text-[#94A3B8]">{log.time}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${log.status === 'success' ? 'bg-[#ECFDF5] text-[#10B981]' : log.status === 'warning' ? 'bg-[#FFFBEB] text-[#F59E0B]' : 'bg-[#FEE2E2] text-[#EF4444]'}`}>
                    {log.status === 'success' ? '成功' : log.status === 'warning' ? '警告' : '错误'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#94A3B8]">共 {filtered.length} 条记录</span>
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
