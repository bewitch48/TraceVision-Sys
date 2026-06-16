import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import MarqueeText from '@/components/MarqueeText';
import { FileText, Download, Eye, Calendar, FileBarChart, CheckSquare, Sparkles, FileCheck, X, Copy } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { generateReport } from '@/services/api';

const reportTypes = [
  { id: 'watermark', name: '水印嵌入质量报告', icon: FileCheck },
  { id: 'forensics', name: '篡改检测取证报告', icon: FileBarChart },
  { id: 'system', name: '系统运行综合报告', icon: FileText },
];

const contentSections = [
  { id: 'metrics', label: '核心指标概览（PSNR/SSIM/置信度）', defaultChecked: true },
  { id: 'ai_summary', label: 'AI 智能分析文字总结', defaultChecked: true },
  { id: 'charts', label: '可视化图表（分布、趋势）', defaultChecked: true },
  { id: 'recommendations', label: '篡改热点与管理建议', defaultChecked: true },
  { id: 'snapshots', label: '典型篡改现场抓拍', defaultChecked: true },
];

export default function Reports() {
  const { reports, addReport, dashboardStats } = useStore();
  const [selectedType, setSelectedType] = useState('forensics');
  const [dateRange, setDateRange] = useState({ start: '2026-03-01', end: '2026-03-31' });
  const [sections, setSections] = useState<Record<string, boolean>>(
    Object.fromEntries(contentSections.map((s) => [s.id, s.defaultChecked]))
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewReport, setPreviewReport] = useState<{ title: string; content: string } | null>(null);

  const toggleSection = (id: string) => setSections((prev) => ({ ...prev, [id]: !prev[id] }));

  /** 调用 DeepSeek API 生成报告 */
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const checkedSections = Object.entries(sections)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const result = await generateReport({
        type: selectedType,
        date_start: dateRange.start,
        date_end: dateRange.end,
        sections: checkedSections.join(','),
        copyright_count: dashboardStats.copyrightCount,
        detection_count: dashboardStats.detectionCount,
        alert_count: dashboardStats.alertCount,
        today_detections: dashboardStats.todayDetections,
        week_alerts: dashboardStats.weekAlerts,
        uptime: dashboardStats.uptime,
      });

      const typeName = reportTypes.find((rt) => rt.id === selectedType)?.name || '分析报告';
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const newReport = {
        id: `RPT-${String(reports.length + 1).padStart(3, '0')}`,
        title: `${typeName}_${dateStr}`,
        type: selectedType,
        createdAt: result.generated_at || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
        pageCount: Math.max(1, Math.ceil(result.char_count / 2000)),
        downloadUrl: '#',
        content: result.content,
      };
      addReport(newReport);
      toast.success('AI 报告生成完成', {
        description: `${typeName} 已添加到报告列表（${result.char_count} 字）`,
      });
    } catch (err: any) {
      toast.error('报告生成失败', {
        description: err.message || '请检查后端服务是否启动',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /** 预览报告 */
  const handlePreview = (report: typeof reports[0]) => {
    if (!report.content) {
      toast.info('报告内容为空', { description: '该报告为旧版数据，请重新生成' });
      return;
    }
    setPreviewReport({ title: report.title, content: report.content });
  };

  /** 下载报告为 .md 文件 */
  const handleDownload = (report: typeof reports[0]) => {
    if (!report.content) {
      toast.info('报告内容为空', { description: '该报告为旧版数据，请重新生成。是否重新生成？' });
      return;
    }
    const blob = new Blob([report.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('报告下载中', { description: `${report.title}.md` });
  };

  return (
    <div className="space-y-6">
      <div className="-mx-6 -mt-6 mb-4 py-2 bg-gradient-to-r from-[#EFF6FF] via-white to-[#EFF6FF] border-b border-[#E2E8F0] overflow-hidden">
        <MarqueeText speed={17} direction="right" className="text-xs text-[#3B82F6]/50 font-display" separator="  ·  " items={['REPORT CENTER', '报告中心', 'AI ANALYSIS', '智能分析', 'FORENSICS REPORT']} />
      </div>

      <div>
        <h1 className="section-title">取证报告中心</h1>
        <p className="section-subtitle">基于 DeepSeek AI 一键生成专业取证分析报告</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5">
          <div className="card-surface p-5 space-y-5">
            <h3 className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
              报告配置
            </h3>

            <div>
              <label className="text-xs text-[#475569] mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" />时间范围</label>
              <div className="flex items-center gap-2">
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))} className="input-field flex-1" />
                <span className="text-[#94A3B8]">至</span>
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))} className="input-field flex-1" />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#475569] mb-2 block">报告类型</label>
              <div className="space-y-2">
                {reportTypes.map((rt) => {
                  const Icon = rt.icon;
                  return (
                    <button key={rt.id} onClick={() => setSelectedType(rt.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-sm transition-all ${selectedType === rt.id ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#E2E8F0] text-[#475569] hover:border-[#2563EB]/30'}`}>
                      <Icon className="w-4 h-4" />
                      {rt.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs text-[#475569] mb-2 flex items-center gap-1"><CheckSquare className="w-3 h-3" />包含内容</label>
              <div className="space-y-2">
                {contentSections.map((section) => (
                  <label key={section.id} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                    <input type="checkbox" checked={sections[section.id]} onChange={() => toggleSection(section.id)} className="w-4 h-4 rounded border-[#CBD5E1] text-[#2563EB] accent-[#2563EB]" />
                    <span className="text-xs text-[#475569]">{section.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary w-full gap-2 disabled:opacity-50">
              {isGenerating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI 生成中...</> : <><FileText className="w-4 h-4" />生成 AI 分析报告</>}
            </button>
          </div>
        </div>

        <div className="col-span-7">
          <div className="card-surface p-5">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4">已生成报告</h3>
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center gap-4 p-4 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB]/30 hover:bg-[#F8FAFC] transition-all">
                  <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1E293B] truncate">{report.title}</div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#94A3B8]">
                      <span>生成时间: {report.createdAt}</span>
                      <span>{report.pageCount} 页</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB]">{report.type}</span>
                      {report.content && <span className="text-[#22C55E]">● 已生成</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handlePreview(report)} className="p-1.5 hover:bg-[#F1F5F9] rounded transition-colors" title="预览">
                      <Eye className="w-4 h-4 text-[#94A3B8] hover:text-[#2563EB]" />
                    </button>
                    <button onClick={() => handleDownload(report)} className="p-1.5 hover:bg-[#EFF6FF] rounded transition-colors" title="下载 Markdown">
                      <Download className="w-4 h-4 text-[#2563EB]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-surface p-5 mt-4">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4">报告模板预览</h3>
            <div className="space-y-3 text-xs text-[#475569]">
              {[
                '封面：报告标题、生成时间、检测时段、检测对象',
                '核心指标：总检测次数、平均置信度、最大篡改区域数、水印完好率',
                'AI 分析：总体概况文字、趋势与高峰分析',
                '可视化：篡改类型饼图、时间维度趋势折线图',
                '热点与建议：重点治理对象、管理建议',
                '现场抓拍：原始图 vs 篡改图 vs 定位结果对比',
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 预览弹窗 */}
      {previewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPreviewReport(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">{previewReport.title}</h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">Markdown 格式 · {previewReport.content.length} 字符</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewReport.content);
                    toast.success('已复制到剪贴板');
                  }}
                  className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
                  title="复制全文"
                >
                  <Copy className="w-4 h-4 text-[#64748B]" />
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([previewReport.content], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${previewReport.title}.md`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success('报告已下载');
                  }}
                  className="p-2 hover:bg-[#EFF6FF] rounded-lg transition-colors"
                  title="下载"
                >
                  <Download className="w-4 h-4 text-[#2563EB]" />
                </button>
                <button onClick={() => setPreviewReport(null)} className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors">
                  <X className="w-4 h-4 text-[#64748B]" />
                </button>
              </div>
            </div>

            {/* 报告内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none prose-headings:text-[#1E293B] prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-sm prose-p:text-[#475569] prose-li:text-sm prose-li:text-[#475569] prose-table:text-xs prose-th:bg-[#F8FAFC] prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-code:text-xs prose-code:bg-[#F1F5F9] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#1E293B] prose-pre:text-[#E2E8F0] prose-strong:text-[#1E293B]">
                <ReactMarkdown>{previewReport.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
