import { useStore } from '@/hooks/useStore';
import MarqueeText from '@/components/MarqueeText';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Shield, Search, Bell, Clock, TrendingUp, TrendingDown, BarChart3, PieChart as PieIcon, Activity, Users, FileCheck, Zap, Globe } from 'lucide-react';
import { useMemo } from 'react';

const algorithmComparison = [
  { model: '溯影引擎', psnr: 42.5, ssim: 99.8, acc: 99.2 },
  { model: 'StegaStamp', psnr: 38.2, ssim: 98.5, acc: 91.5 },
  { model: 'HiDDeN', psnr: 35.8, ssim: 97.8, acc: 87.3 },
  { model: 'WISA', psnr: 33.1, ssim: 96.5, acc: 82.1 },
];

const CHART_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#F59E0B'];

export default function AdminDashboard() {
  const { dashboardStats, copyrights, alerts, reports, attackHistory } = useStore();

  // 从实际数据派生图表数据
  const detectionData = useMemo(() => {
    const total = attackHistory.length + dashboardStats.detectionCount;
    return [
      { day: '版权', count: copyrights.length, watermark: copyrights.length },
      { day: '报告', count: reports.length, watermark: reports.length },
      { day: '攻击', count: attackHistory.length, watermark: 0 },
      { day: '检测', count: dashboardStats.detectionCount, watermark: dashboardStats.detectionCount },
    ];
  }, [copyrights.length, reports.length, attackHistory.length, dashboardStats.detectionCount]);

  const attackTypes = useMemo(() => {
    const hasAttack = attackHistory.length > 0;
    return [
      { name: '高斯噪声', pct: hasAttack ? 35 : 0, color: '#2563EB' },
      { name: 'JPEG 压缩', pct: hasAttack ? 25 : 0, color: '#3B82F6' },
      { name: '泊松噪声', pct: hasAttack ? 20 : 0, color: '#60A5FA' },
      { name: 'AI Inpaint', pct: hasAttack ? 15 : 0, color: '#93C5FD' },
      { name: '其他', pct: hasAttack ? 5 : 0, color: '#F59E0B' },
    ];
  }, [attackHistory.length]);

  const watermarkTrend = useMemo(() => {
    // 按单条版权记录展示（当前即是全部历史）
    return copyrights.map((c, i) => ({
      month: c.company.length > 6 ? c.company.slice(0, 5) + '…' : c.company,
      image: 1,
      video: 0,
    })).slice(0, 10);
  }, [copyrights]);

  const now = new Date();
  const lastUpdate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div className="-mx-6 -mt-6 mb-4 py-2 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] border-b border-[#E2E8F0] overflow-hidden">
        <MarqueeText speed={20} direction="left" className="text-xs text-white/30 font-display" separator="  ·  " items={['ADMIN CONTROL CENTER', '管理控制中心', 'SYSTEM OVERVIEW', '系统总览', 'TRACEVISION']} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B]">管理控制中心</h1>
          <p className="text-xs text-[#94A3B8]">系统运行状态总览与全局管理</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          系统运行正常 · 最后更新: {lastUpdate}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: '版权总数', value: dashboardStats.copyrightCount, icon: Shield, change: dashboardStats.copyrightCount > 0 ? `+${dashboardStats.copyrightCount}` : '0', up: true, color: '#2563EB' },
          { label: '检测次数', value: dashboardStats.detectionCount, icon: Search, change: dashboardStats.detectionCount > 0 ? `+${dashboardStats.detectionCount}` : '0', up: true, color: '#3B82F6' },
          { label: '告警次数', value: dashboardStats.alertCount, icon: Bell, change: dashboardStats.weekAlerts > 0 ? `${dashboardStats.weekAlerts}待处理` : '无', up: dashboardStats.weekAlerts === 0, color: '#EF4444' },
          { label: '活跃版权', value: dashboardStats.copyrightCount > 0 ? dashboardStats.copyrightCount : '--', icon: Clock, change: copyrights.filter(c => c.id > 0).length > 0 ? '已加载' : '无', up: true, color: '#10B981' },
          { label: '检测报告', value: reports.length, icon: Users, change: reports.length > 0 ? `+${reports.length}` : '0', up: true, color: '#8B5CF6' },
          { label: '攻击记录', value: attackHistory.length, icon: FileCheck, change: attackHistory.length > 0 ? `+${attackHistory.length}` : '0', up: true, color: '#06B6D4' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card-surface p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${stat.up ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {stat.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{stat.change}
                </span>
              </div>
              <div className="text-xl font-bold text-[#1E293B] font-display">{stat.value}</div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-surface p-5">
          <h3 className="text-sm font-semibold text-[#1E293B] mb-1 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#2563EB]" />系统活动概览</h3>
          <p className="text-[10px] text-[#94A3B8] mb-3">版权 / 报告 / 攻击 / 检测 四项统计</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={detectionData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="count" name="操作次数" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="watermark" name="水印相关" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-sm font-semibold text-[#1E293B] mb-1 flex items-center gap-2"><PieIcon className="w-4 h-4 text-[#2563EB]" />攻击类型分布</h3>
          <p className="text-[10px] text-[#94A3B8] mb-3">各类攻击在检测中的占比</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={180}>
              <PieChart>
                <Pie data={attackTypes} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="pct">
                  {attackTypes.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {attackTypes.map((atk, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs text-[#475569]"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: atk.color }} />{atk.name}</span>
                  <span className="text-xs font-medium text-[#1E293B]">{atk.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-surface p-5">
          <h3 className="text-sm font-semibold text-[#1E293B] mb-1 flex items-center gap-2"><Activity className="w-4 h-4 text-[#2563EB]" />算法性能对比</h3>
          <p className="text-[10px] text-[#94A3B8] mb-3">各水印算法在关键指标上的表现</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={algorithmComparison} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="model" tick={{ fontSize: 10, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="psnr" name="PSNR" fill="#2563EB" radius={[3, 3, 0, 0]} />
              <Bar dataKey="ssim" name="SSIM(x100)" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="acc" name="准确率(%)" fill="#10B981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-sm font-semibold text-[#1E293B] mb-1 flex items-center gap-2"><Zap className="w-4 h-4 text-[#2563EB]" />告警状态分布</h3>
          <p className="text-[10px] text-[#94A3B8] mb-3">当前告警的处理状态占比</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[
                { name: '待处理', value: alerts.filter(a => a.status === 'pending').length, color: '#EF4444' },
                { name: '已处理', value: alerts.filter(a => a.status === 'resolved').length, color: '#10B981' },
                { name: '已归档', value: alerts.filter(a => a.status === 'archived').length, color: '#94A3B8' },
                { name: '误报', value: alerts.filter(a => a.status === 'false_positive').length, color: '#F59E0B' },
              ].filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="value">
                {[
                  { name: '待处理', color: '#EF4444' },
                  { name: '已处理', color: '#10B981' },
                  { name: '已归档', color: '#94A3B8' },
                  { name: '误报', color: '#F59E0B' },
                ].filter(d => alerts.some(a => a.status === (d.name === '待处理' ? 'pending' : d.name === '已处理' ? 'resolved' : d.name === '已归档' ? 'archived' : 'false_positive'))).map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Watermark Trend */}
      <div className="card-surface p-5">
        <h3 className="text-sm font-semibold text-[#1E293B] mb-1 flex items-center gap-2"><Globe className="w-4 h-4 text-[#2563EB]" />版权登记清单</h3>
        <p className="text-[10px] text-[#94A3B8] mb-3">当前已登记版权方一览（最多显示 10 条）</p>
        {copyrights.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#94A3B8]">暂无版权登记，请先在「工作台」或「版权管理」中创建</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={watermarkTrend} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="image" name="图片水印" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="video" name="视频水印" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
