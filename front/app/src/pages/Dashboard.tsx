import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import LightBackground from '@/components/LightBackground';
import MarqueeText from '@/components/MarqueeText';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  ArrowRight, Upload, Fingerprint, Share2, Crosshair,
  Image, Layers, Palette, Sparkles, Volume2, FileArchive, Zap, Shuffle,
  TrendingUp, Activity, Shield, BarChart3, PieChart as PieIcon,
  Radar as RadarIcon, AreaChart as AreaIcon, Search, Copyright, FileCheck
} from 'lucide-react';

/* ─────────── 动画数字 ─────────── */
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        const duration = 1500;
        const start = performance.now();
        const animate = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(eased * value * 10) / 10);
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);
  return <span ref={ref}>{display.toFixed(value % 1 === 0 ? 0 : 1)}{suffix}</span>;
}

/* ─────────── 数据 ─────────── */
const kpiData = [
  { label: '本周水印嵌入', value: 1284, suffix: '', change: '+12.5%', up: true, icon: Shield, color: '#2563EB' },
  { label: '本周水印提取', value: 967, suffix: '', change: '+8.3%', up: true, icon: Activity, color: '#3B82F6' },
  { label: '篡改检测次数', value: 523, suffix: '', change: '+23.1%', up: true, icon: Search, color: '#10B981' },
  { label: '攻击模拟次数', value: 348, suffix: '', change: '+15.7%', up: true, icon: Zap, color: '#F59E0B' },
  { label: '版权注册数量', value: 156, suffix: '', change: '+6.2%', up: true, icon: Copyright, color: '#8B5CF6' },
  { label: '待处理任务', value: 12, suffix: '', change: '-4', up: false, icon: FileCheck, color: '#EF4444' },
];

const weeklyTrend = [
  { day: '周一', embed: 180, extract: 140, detect: 65 },
  { day: '周二', embed: 220, extract: 175, detect: 82 },
  { day: '周三', embed: 195, extract: 155, detect: 71 },
  { day: '周四', embed: 260, extract: 200, detect: 95 },
  { day: '周五', embed: 240, extract: 185, detect: 88 },
  { day: '周六', embed: 120, extract: 72, detect: 68 },
  { day: '周日', embed: 89, extract: 40, detect: 54 },
];

const attackTypeData = [
  { name: 'SD-Inpainting', value: 35, color: '#2563EB' },
  { name: 'ControlNet', value: 22, color: '#3B82F6' },
  { name: 'SDXL', value: 18, color: '#60A5FA' },
  { name: 'RePaint', value: 10, color: '#93C5FD' },
  { name: '高斯噪声', value: 8, color: '#F59E0B' },
  { name: 'JPEG压缩', value: 5, color: '#FBBF24' },
  { name: '其他', value: 2, color: '#CBD5E1' },
];

const radarData = [
  { metric: '隐蔽性', A: 95, B: 85 },
  { metric: '鲁棒性', A: 92, B: 78 },
  { metric: '容量', A: 88, B: 72 },
  { metric: '速度', A: 90, B: 82 },
  { metric: '准确率', A: 98, B: 88 },
  { metric: '抗攻击', A: 94, B: 76 },
];

const confidenceData = [
  { range: '90-100%', clean: 42, degrade: 8 },
  { range: '80-90%', clean: 35, degrade: 15 },
  { range: '70-80%', clean: 18, degrade: 28 },
  { range: '60-70%', clean: 8, degrade: 35 },
  { range: '50-60%', clean: 4, degrade: 42 },
  { range: '<50%', clean: 2, degrade: 52 },
];

const tamperRegionData = [
  { region: '人脸区域', count: 285 },
  { region: '背景区域', count: 198 },
  { region: '文字区域', count: 156 },
  { region: '边缘区域', count: 134 },
  { region: '纹理区域', count: 98 },
  { region: '平滑区域', count: 72 },
];

const monthlyEmbed = [
  { month: '1月', image: 420, video: 85 },
  { month: '2月', image: 580, video: 120 },
  { month: '3月', image: 720, video: 180 },
  { month: '4月', image: 890, video: 240 },
  { month: '5月', image: 1050, video: 310 },
  { month: '6月', image: 1284, video: 380 },
];

const steps = [
  { icon: Upload, title: '版权注册', desc: '上传 Logo 录入版权信息' },
  { icon: Fingerprint, title: '水印嵌入', desc: '注入不可见水印标记' },
  { icon: Share2, title: '内容传播', desc: '图像在各平台流转分享' },
  { icon: Crosshair, title: '取证溯源', desc: '检测篡改提取版权归属' },
];

const attackTypes = [
  { icon: Palette, name: 'SD-Inpainting' },
  { icon: Layers, name: 'ControlNet' },
  { icon: Image, name: 'SDXL' },
  { icon: Sparkles, name: 'RePaint' },
  { icon: Volume2, name: '高斯噪声' },
  { icon: FileArchive, name: 'JPEG 压缩' },
  { icon: Zap, name: '泊松噪声' },
  { icon: Shuffle, name: '组合攻击' },
];

const metrics = [
  { value: 95, suffix: '%+', label: '篡改定位像素级精度', sub: '精准检测 AI 修改区域' },
  { value: 100, suffix: '%', label: '水印提取准确率', sub: '近乎完美的版权恢复率' },
  { value: 64, suffix: 'bit', label: '隐蔽容量零感知嵌入', sub: '不可见水印载荷量' },
];

const CHART_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#F59E0B', '#FBBF24', '#CBD5E1'];

/* ─────────── 主组件 ─────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <div className="-m-6 relative">
      <LightBackground />

      {/* ====== Hero 区域 ====== */}
      <section className="relative overflow-hidden" style={{ height: '70vh', minHeight: 520 }}>
        <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(180deg, rgba(248,250,252,0) 0%, #F8FAFC 100%)' }} />

        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-12">
          {/* Logo */}
          <div className="mb-4">
            <img src="/img/logo-new.png" alt="TraceVision" className="w-20 h-20 object-contain drop-shadow-lg" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2563EB]/5 border border-[#2563EB]/10 mb-5">
            <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
            <span className="text-xs text-[#475569] font-medium">数字内容溯源与知识产权保护技术</span>
          </div>

          <h1 className="text-7xl font-bold text-[#1E293B] mb-2 font-display tracking-tight text-center">
            TraceVision
          </h1>
          <h2 className="text-xl text-[#475569] font-medium mb-3 text-center">
            AIGC 主动溯源与知识产权守护系统
          </h2>
          <p className="text-sm text-[#94A3B8] leading-relaxed mb-8 max-w-lg text-center">
            在 AI 生成内容泛滥的时代，我们为每一张图像嵌入不可见的信任印记，让每一次篡改都有迹可循，每一份版权皆可验证
          </p>

          {/* 快捷入口按钮 */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workbench')} className="px-6 py-2.5 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors shadow-lg shadow-[#2563EB]/20">
              开始水印嵌入
            </button>
            <button onClick={() => navigate('/forensics')} className="px-6 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[#475569] text-sm font-medium hover:border-[#2563EB]/40 hover:text-[#2563EB] transition-colors">
              取证分析
            </button>
            <button onClick={() => navigate('/copyright')} className="px-6 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[#475569] text-sm font-medium hover:border-[#2563EB]/40 hover:text-[#2563EB] transition-colors">
              版权管理
            </button>
          </div>
        </div>

        {/* 底部 Marquee */}
        <div className="absolute bottom-0 left-0 right-0 z-20 py-3 bg-white/50 backdrop-blur-sm border-t border-[#E2E8F0]/50">
          <MarqueeText
            items={['AIGC 溯源', '数字水印', '版权保护', '篡改检测', '像素级定位', '隐写分析', '数字水印', 'TraceVision 引擎', '深度学习', '知识产权']}
            speed={40} direction="left"
            className="text-[#CBD5E1] text-sm font-display tracking-widest"
            separator="    ·    "
          />
        </div>
      </section>

      {/* ====== 内容区域 ====== */}
      <div className="relative z-10 bg-[#F8FAFC]">

        {/* 蓝色品牌横幅 */}
        <div className="bg-[#2563EB] py-3 overflow-hidden">
          <MarqueeText
            items={['TraceVision', '数字水印', '数字取证', '隐写分析', '版权水印', 'AIGC 检测', 'AI 安全', '内容溯源']}
            speed={25} direction="right"
            className="text-white/90 text-xs font-display tracking-wider uppercase"
            separator="  ✦  "
          />
        </div>

        {/* ─── KPI 卡片 ─── */}
        <section className="py-8 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">洞察中心</h2>
                <p className="text-xs text-[#94A3B8]">系统运行数据实时概览</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                实时更新
              </div>
            </div>
            <div className="grid grid-cols-6 gap-3">
              {kpiData.map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}12` }}>
                        <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                      </div>
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${kpi.up ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}{kpi.change}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-[#1E293B] font-display">
                      <AnimatedNumber value={kpi.value} suffix={kpi.suffix} />
                    </div>
                    <div className="text-[11px] text-[#94A3B8] mt-1">{kpi.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 图表第1行：折线图 + 饼图 ─── */}
        <section className="px-6 pb-6">
          <div className="max-w-7xl mx-auto grid grid-cols-5 gap-4">
            {/* 折线图 - 占3列 */}
            <div className="col-span-3 bg-white rounded-xl border border-[#E2E8F0] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#2563EB]" />本周操作趋势
                  </h3>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">水印嵌入、提取与篡改检测的每日统计</p>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2563EB]" />嵌入</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981]" />提取</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" />检测</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                  <Line type="monotone" dataKey="embed" name="水印嵌入" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: '#2563EB' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="extract" name="水印提取" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981' }} />
                  <Line type="monotone" dataKey="detect" name="篡改检测" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 饼图 - 占2列 */}
            <div className="col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-5">
              <h3 className="text-sm font-semibold text-[#1E293B] mb-0.5 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#2563EB]" />攻击类型分布
              </h3>
              <p className="text-[10px] text-[#94A3B8] mb-3">各类攻击在检测中的占比</p>
              <div className="flex items-center gap-3">
                <ResponsiveContainer width={160} height={180}>
                  <PieChart>
                    <Pie data={attackTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {attackTypeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {attackTypeData.map((atk, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs text-[#475569]">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: atk.color }} />{atk.name}
                      </span>
                      <span className="text-xs font-medium text-[#1E293B]">{atk.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Marquee 分隔带 ─── */}
        <div className="py-4 bg-white border-y border-[#E2E8F0] overflow-hidden">
          <MarqueeText speed={15} direction="left"
            className="text-3xl font-bold text-[#E2E8F0] font-display select-none"
            separator="  ·  "
            items={['PIXEL-LEVEL', 'TAMPER DETECTION', 'WATERMARK EMBED', 'COPYRIGHT PROTECT', 'FORENSICS', 'AIGC TRACE', 'EDITGUARD', 'DEEP LEARNING']}
          />
        </div>

        {/* ─── 图表第2行：雷达图 + 面积图 ─── */}
        <section className="py-6 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-2 gap-4">
            {/* 雷达图 */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <h3 className="text-sm font-semibold text-[#1E293B] mb-0.5 flex items-center gap-2">
                <RadarIcon className="w-4 h-4 text-[#2563EB]" />模型能力雷达
              </h3>
              <p className="text-[10px] text-[#94A3B8] mb-3">TraceVision vs 基准方案 综合能力对比</p>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#475569' }} />
                  <PolarRadiusAxis tick={{ fontSize: 10, fill: '#94A3B8' }} domain={[0, 100]} />
                  <Radar name="TraceVision" dataKey="A" stroke="#2563EB" fill="#2563EB" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="基准方案" dataKey="B" stroke="#CBD5E1" fill="#CBD5E1" fillOpacity={0.15} strokeWidth={1.5} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* 面积图 */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <h3 className="text-sm font-semibold text-[#1E293B] mb-0.5 flex items-center gap-2">
                <AreaIcon className="w-4 h-4 text-[#2563EB]" />水印提取置信度
              </h3>
              <p className="text-[10px] text-[#94A3B8] mb-3">Clean 图像与 Degrade 攻击后的提取成功率</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={confidenceData}>
                  <defs>
                    <linearGradient id="gClean" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gDegrade" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="clean" name="Clean 图像" stroke="#2563EB" strokeWidth={2} fill="url(#gClean)" />
                  <Area type="monotone" dataKey="degrade" name="攻击后图像" stroke="#EF4444" strokeWidth={2} fill="url(#gDegrade)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ─── 图表第3行：柱状图 + 柱状图 ─── */}
        <section className="px-6 pb-6">
          <div className="max-w-7xl mx-auto grid grid-cols-2 gap-4">
            {/* 篡改区域分布 */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <h3 className="text-sm font-semibold text-[#1E293B] mb-0.5 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#2563EB]" />篡改区域分布
              </h3>
              <p className="text-[10px] text-[#94A3B8] mb-3">各区域篡改检测命中次数</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={tamperRegionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis dataKey="region" type="category" tick={{ fontSize: 11, fill: '#475569' }} axisLine={{ stroke: '#E2E8F0' }} width={70} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" name="检测次数" fill="#2563EB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 月度水印嵌入 */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <h3 className="text-sm font-semibold text-[#1E293B] mb-0.5 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#2563EB]" />月度水印嵌入量
              </h3>
              <p className="text-[10px] text-[#94A3B8] mb-3">图片与视频水印的月度增长趋势</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyEmbed} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="image" name="图片水印" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="video" name="视频水印" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ─── Marquee 分隔带 ─── */}
        <div className="py-3 bg-white border-y border-[#E2E8F0] overflow-hidden">
          <MarqueeText speed={20} direction="right"
            className="text-lg font-medium text-[#CBD5E1]/60 font-display select-none"
            separator="    "
            items={['像素级定位', '隐写分析', '数字取证', '版权保护', 'AI 篡改检测', '不可见水印', '深度学习', '知识产权保护']}
          />
        </div>

        {/* ─── 核心技术指标 ─── */}
        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-[#1E293B] mb-2">核心技术指标</h2>
              <p className="text-sm text-[#94A3B8]">基于 TraceVision 引擎的前沿性能表现</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {metrics.map((m, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center hover:shadow-lg transition-all hover:-translate-y-1">
                  <div className="text-5xl font-bold text-[#2563EB] font-display mb-2">
                    <AnimatedNumber value={m.value} suffix={m.suffix} />
                  </div>
                  <div className="text-base font-semibold text-[#1E293B]">{m.label}</div>
                  <div className="mt-1 text-sm text-[#94A3B8]">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 系统工作流程 ─── */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-[#1E293B] mb-2">系统工作流程</h2>
              <p className="text-sm text-[#94A3B8]">从注册到取证分析的四步闭环</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const isHovered = hoveredStep === i;
                return (
                  <div key={i} className="flex items-center gap-4">
                    <button
                      className={`flex flex-col items-center gap-3 p-6 rounded-xl border transition-all duration-300 min-w-[180px] ${
                        isHovered ? 'border-[#2563EB] bg-[#EFF6FF] shadow-[0_4px_20px_rgba(37,99,235,0.15)]' : 'border-[#E2E8F0] bg-white hover:border-[#3B82F6]/40'
                      }`}
                      onMouseEnter={() => setHoveredStep(i)} onMouseLeave={() => setHoveredStep(null)}
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${isHovered ? 'bg-[#2563EB]' : 'bg-[#F1F5F9]'}`}>
                        <Icon className={`w-5 h-5 transition-colors ${isHovered ? 'text-white' : 'text-[#475569]'}`} />
                      </div>
                      <div className="text-sm font-semibold text-[#1E293B]">{step.title}</div>
                      <div className="text-xs text-[#94A3B8] text-center leading-relaxed">{step.desc}</div>
                    </button>
                    {i < steps.length - 1 && <ArrowRight className="w-5 h-5 text-[#CBD5E1] flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 支持的攻击类型 ─── */}
        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-[#1E293B] mb-2">支持的攻击类型</h2>
              <p className="text-sm text-[#94A3B8]">全面抵御 AIGC 篡改与信号攻击</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {attackTypes.map((atk, i) => {
                const Icon = atk.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-[#E2E8F0] bg-white hover:border-[#2563EB]/40 hover:bg-[#EFF6FF] transition-all cursor-default">
                    <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#475569]" />
                    </div>
                    <span className="text-sm font-medium text-[#1E293B]">{atk.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="py-8 px-6 bg-[#F8FAFC] border-t border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/img/logo-new.png" alt="" className="w-6 h-6 object-contain" />
              <span className="text-sm font-semibold text-[#1E293B]">TraceVision</span>
            </div>
            <div className="text-xs text-[#94A3B8]">TraceVision · 数字内容保护系统</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
