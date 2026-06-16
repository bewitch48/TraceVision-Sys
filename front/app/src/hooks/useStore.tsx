import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { Copyright, AttackRecord, AlertItem, ReportItem, DashboardStats } from '@/types';
import { listLogos } from '@/services/api';

interface User {
  id: number;
  username: string;
  role: 'guest' | 'admin';
  avatar: string;
}

interface AppState {
  // Auth
  user: User | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => { success: boolean; role: 'guest' | 'admin' };
  logout: () => void;

  // Copyrights
  copyrights: Copyright[];
  selectedCopyrightId: number | null;
  setSelectedCopyrightId: (id: number | null) => void;
  addCopyright: (c: Copyright) => void;
  removeCopyright: (id: number) => void;
  updateCopyright: (id: number, data: Partial<Copyright>) => void;

  // Images
  uploadedImage: string | null;
  setUploadedImage: (img: string | null) => void;
  watermarkedImage: string | null;
  setWatermarkedImage: (img: string | null) => void;

  // Attack Lab
  attackHistory: AttackRecord[];
  addAttackRecord: (r: AttackRecord) => void;

  // Activity counter (incremented on any detection/embed/extract operation)
  detectionCount: number;
  incrementDetectionCount: () => void;

  // Alerts
  alerts: AlertItem[];
  resolveAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  archiveAlert: (id: string) => void;

  // Reports
  reports: ReportItem[];
  addReport: (r: ReportItem) => void;

  // Dashboard
  dashboardStats: DashboardStats;

  // UI
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const StoreContext = createContext<AppState | null>(null);

// 模拟账号
const MOCK_USERS = [
  { id: 1, username: 'guest', password: 'guest123', role: 'guest' as const },
  { id: 2, username: 'admin', password: 'admin123', role: 'admin' as const },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  // Auth
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('tracevision_user');
    return saved ? JSON.parse(saved) : null;
  });
  const isLoggedIn = !!user;

  const login = useCallback((username: string, password: string) => {
    const found = MOCK_USERS.find((u) => u.username === username && u.password === password);
    if (!found) return { success: false, role: 'guest' as const };
    const newUser: User = {
      id: found.id,
      username: found.username,
      role: found.role,
      avatar: found.role === 'admin'
        ? '/img/logo-new.png'
        : '/img/logo-huawei.png',
    };
    setUser(newUser);
    localStorage.setItem('tracevision_user', JSON.stringify(newUser));
    return { success: true, role: found.role };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('tracevision_user');
  }, []);

  // Copyrights - 从后端 API 加载
  const [copyrights, setCopyrights] = useState<Copyright[]>([]);
  const [copyrightsLoaded, setCopyrightsLoaded] = useState(false);
  const [selectedCopyrightId, setSelectedCopyrightId] = useState<number | null>(null);

  useEffect(() => {
    listLogos()
      .then((items) => {
        const remote: Copyright[] = items.map((item) => ({
          id: item.id,
          company: item.company,
          logoUrl: item.logo_url || '/img/logo-new.png',
          createdAt: item.created_at || '',
        }));
        // merge: remote items take priority on same id, local-only items preserved
        setCopyrights(prev => {
          const remoteIds = new Set(remote.map(r => r.id));
          const localOnly = prev.filter(c => !remoteIds.has(c.id));
          return [...remote, ...localOnly];
        });
        if (remote.length > 0) {
          setSelectedCopyrightId(prev => prev ?? remote[0].id);
        }
      })
      .catch((err) => console.warn('版权列表加载失败:', err))
      .finally(() => setCopyrightsLoaded(true));
  }, []);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [watermarkedImage, setWatermarkedImage] = useState<string | null>(null);
  const [attackHistory, setAttackHistory] = useState<AttackRecord[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reports, setReports] = useState<ReportItem[]>([
    { id: 'RPT-001', title: '水印质量报告_20260315', type: 'watermark', createdAt: '2026-03-15 17:06:37', pageCount: 4, downloadUrl: '#', content: `# 水印嵌入质量报告

**报告编号**: WMQR-20260331-001  
**统计时段**: 2026-03-01 至 2026-03-31  
**报告生成时间**: 2026-03-31 23:59  

---

## 1. 报告摘要

本报告基于2026年3月1日至2026年3月31日期间，对系统内版权作品的水印嵌入质量及检测情况进行全面分析。统计期内，系统累计完成版权登记128件，执行水印检测1024次，共触发告警36次。系统整体运行稳定，累计运行时长720小时，日均检测量约为33次。本周（2026-03-25至2026-03-31）告警数达23次，占全月告警总量的63.89%，显示近期篡改行为呈集中爆发态势，需重点关注。

通过AI智能分析，发现水印嵌入质量整体良好，但存在局部区域水印强度不足、抗攻击能力较弱等问题。典型篡改现场主要集中在高价值版权内容区域，建议加强重点作品的保护力度。

---

## 2. 核心指标概览

| 指标名称 | 数值 | 单位 | 备注 |
| :--- | :---: | :---: | :--- |
| 版权登记总数 | 128 | 件 | 统计期内新增 |
| 累计检测次数 | 1024 | 次 | 全月执行 |
| 告警总数 | 36 | 次 | 全月累计 |
| 今日检测量 | 47 | 次 | 2026-03-31 |
| 本周告警数 | 23 | 次 | 2026-03-25至03-31 |
| 系统运行时长 | 720 | 小时 | 连续运行 |

**关键比率分析**：
- **告警率**：36 / 1024 ≈ 3.52%
- **周告警占比**：23 / 36 ≈ 63.89%
- **日均检测量**：1024 / 31 ≈ 33.03 次/天

---

## 3. 趋势分析

### 3.1 检测量趋势
本月检测量呈现“前低后高”态势。月初日均检测量约25次，进入下旬后，随着版权登记数量增加及系统推广使用，检测频次显著提升。今日（2026-03-31）检测量达47次，为全月单日最高值，表明系统使用活跃度持续上升。

### 3.2 告警趋势
告警事件在时间分布上高度集中。全月36次告警中，有23次发生于本周（第5周），占比高达63.89%。前四周告警累计仅13次，周均约3.25次。本周告警数激增，提示可能存在针对性攻击或批量篡改行为。

| 时间段 | 告警次数 | 占比 |
| :--- | :---: | :---: |
| 第1周（03-01至03-07） | 4 | 11.11% |
| 第2周（03-08至03-14） | 3 | 8.33% |
| 第3周（03-15至03-21） | 3 | 8.33% |
| 第4周（03-22至03-24） | 3 | 8.33% |
| **第5周（03-25至03-31）** | **23** | **63.89%** |
| **合计** | **36** | **100%** |

---

## 4. 风险预警

### 4.1 本周告警集中爆发风险
本周（2026-03-25至03-31）告警数占全月63.89%，远超正常波动范围。建议立即启动应急响应机制，对本周内所有触发告警的版权作品进行逐件复核，确认水印完整性及篡改程度。

### 4.2 高价值作品保护不足
AI智能分析指出，部分高价值版权作品（如热门影视、音乐、软件等）的水印嵌入强度不足，抗攻击能力较弱。此类作品易成为篡改目标，建议优先提升其水印嵌入等级，采用多重水印或自适应水印策略。

### 4.3 系统负载与性能风险
本月累计检测1024次，系统运行720小时，平均每天检测约33次。但今日检测量达47次，超出日均值42.4%。若检测量持续增长，需关注系统响应时间及水印嵌入质量是否受影响，建议提前规划资源扩容。

---

## 5. 管理建议

### 5.1 加强重点作品保护
- 建立“高价值作品清单”，对清单内作品实施**增强型水印嵌入**（如频域+空域双重水印）。
- 对本周告警涉及的23件作品进行**溯源分析**，查明篡改手法及攻击源。

### 5.2 优化检测策略
- 将检测频率从“每日一次”调整为**实时检测**，尤其对本周告警高发时段（如每日晚间18:00-22:00）进行重点监控。
- 引入**AI智能分析模块**，自动识别篡改行为模式，提前预警。

### 5.3 完善应急响应流程
- 制定《水印篡改事件应急响应标准操作程序》，明确告警分级、响应时限、处置流程。
- 成立专项小组，对本周告警事件进行**复盘分析**，形成整改报告。

### 5.4 提升系统性能
- 评估系统当前处理能力，若检测量持续超过50次/天，建议**升级服务器配置**或采用分布式检测架构。
- 定期（每月）对水印嵌入质量进行**抽样评估**，确保系统稳定可靠。

---

## 6. 典型篡改现场描述

### 案例一：视频帧水印剪切攻击
- **作品类型**：高清影视作品（版权登记编号：CR20260315-008）
- **篡改手法**：攻击者对视频文件第15至第20帧进行局部剪切，移除嵌入在画面角落的透明水印（像素级攻击）。
- **检测结果**：水印完整性评分从初始的98.7%降至62.3%，触发告警。
- **影响评估**：水印信息丢失约36%，但通过剩余水印仍可追溯至原始版权方。

### 案例二：图像水印叠加覆盖
- **作品类型**：数字绘画作品（版权登记编号：CR20260328-012）
- **篡改手法**：攻击者在原图上叠加一层半透明纹理，覆盖原有水印区域，试图掩盖水印特征。
- **检测结果**：水印相关性系数从0.95降至0.41，低于告警阈值（0.50），触发告警。
- **影响评估**：水印被严重覆盖，但通过频域分析仍可提取弱水印信号，确认版权归属。

---

**报告编制人**: 数字取证分析系统  
**审核人**: 版权保护技术团队  
**报告结束**` },
    { id: 'RPT-002', title: '取证分析报告_20260314', type: 'forensics', createdAt: '2026-03-14 14:22:10', pageCount: 6, downloadUrl: '#', content: `好的，遵照您的指示，我将根据提供的统计数据，生成一份专业详实的数字取证分析报告。

---

# 版权保护与篡改检测分析报告

**报告编号:** FR-2026-03-001
**统计时段:** 2026-03-01 至 2026-03-31
**生成日期:** 2026-03-31

---

## 1. 报告摘要

本报告针对 **2026年3月** 期间的数字版权登记与篡改检测系统运行状况进行综合分析。报告期内，系统累计完成 **1024** 次检测，成功登记版权 **128** 件。检测过程中，系统共触发 **36** 次告警，其中 **23** 次发生于本周（统计周期最后一周），显示近期篡改风险有显著上升趋势。系统整体运行稳定，累计运行时长 **720** 小时。本报告旨在通过核心指标、趋势分析及风险预警，为管理层提供针对性的版权保护与系统优化建议。

## 2. 核心指标概览

下表汇总了本统计时段内的关键运行数据：

| 指标名称 | 数值 | 备注 |
| :--- | :--- | :--- |
| **版权登记总数** | 128 | 本月新增受保护数字资产 |
| **累计检测次数** | 1024 | 系统执行的完整性校验总次数 |
| **告警总数** | 36 | 发现的疑似篡改事件总数 |
| **今日检测量** | 47 | 报告生成当日完成的检测任务数 |
| **本周告警数** | 23 | 本周（3月25日-31日）新增告警事件 |
| **系统运行时长** | 720h | 系统持续稳定运行的总时长 |

**AI 智能分析文字总结:**
*   **检测覆盖率：** 系统本月平均每日执行约 **33** 次检测（1024次/31天），今日检测量 **47** 次，表明检测强度处于较高水平，系统资源利用充分。
*   **告警比率：** 整体告警比率约为 **3.5%** (36/1024)。然而，本周告警数占全月告警总数的 **63.9%** (23/36)，表明风险事件在时间上高度集中，存在潜在的、持续性的攻击或内部操作异常。
*   **系统稳定性：** 系统连续运行 **720小时**（即30天），无中断记录，基础设施稳定性良好。

## 3. 趋势分析

### 3.1 检测量与告警量趋势

*   **检测量趋势：** 全月累计检测 **1024** 次，日均检测量约 **33** 次。今日检测量 **47** 次，显著高于月均水平，表明近期可能加强了扫描频率或新增了受保护资产。
*   **告警量趋势：** 全月告警 **36** 次，其中 **23** 次（63.9%）集中发生于最后一周。该数据揭示了以下关键趋势：
    *   **风险加剧：** 篡改行为在统计周期的后半段显著活跃，可能存在新发现的漏洞、针对性的攻击或内部权限滥用。
    *   **时效性风险：** 高比例的本周告警数表明，当前的威胁态势正在快速变化，需要立即采取响应措施。

### 3.2 告警类型分布（推断）

基于通用篡改检测模型，推测告警可能涉及以下类型：
*   **哈希值校验失败：** 数字资产内容与原始记录不符。
*   **元数据篡改：** 文件的创建时间、作者、版权标记等信息被修改。
*   **文件结构异常：** 文件大小、格式或内部逻辑结构发生非预期变更。
*   **访问权限异常：** 未经授权的写入或修改操作记录。

*(注：由于未提供具体告警类型数据，此处为基于行业经验的合理推断。建议在后续报告中补充此维度。)*

## 4. 风险预警

基于当前数据，我们识别出以下关键风险，需立即关注：

| 风险等级 | 风险描述 | 潜在影响 | 建议响应时间 |
| :--- | :--- | :--- | :--- |
| **高** | **本周告警数激增**：23起告警事件集中爆发，表明存在持续性或大规模的篡改行为。 | 核心版权资产完整性受损，可能导致法律纠纷、商业机密泄露及品牌声誉损失。 | **立即** |
| **中** | **告警响应时效性不足**：若告警未得到及时分析，可能导致攻击者获得更长的潜伏期，造成更大范围破坏。 | 错过最佳取证和阻断时机，增加数据恢复和溯源难度。 | **24小时内** |
| **低** | **检测频率与风险不匹配**：本月告警率上升，但检测频率（特别是针对高风险资产的检测）可能需要动态调整。 | 对新型、隐蔽的篡改手段发现滞后。 | **本周内** |

## 5. 管理建议

基于上述分析，我们提出以下针对性管理建议：

### 5.1 立即行动项
1.  **启动应急响应流程：** 立即成立专项小组，对本周触发的 **23** 起告警事件进行逐一分析、定级和溯源。重点排查是否存在统一的攻击入口或内部账号异常。
2.  **审查高风险资产：** 对本月所有 **128** 件已登记版权资产，特别是近期被篡改或访问异常的目标，进行全量完整性校验，确保其原始状态未被破坏。

### 5.2 短期优化项
1.  **优化告警规则与策略：**
    *   针对本周高发的告警类型，调整检测阈值和规则，降低误报，提升告警精准度。
    *   对重点资产（如核心源代码、设计文档）设置更高的检测频率（例如，从每日一次提升至每4小时一次）。
2.  **加强访问控制审计：** 审查本月所有涉及版权文件目录的读写操作日志，特别关注非工作时间、异地IP或高权限账号的异常操作。

### 5.3 长期改进项
1.  **建立动态风险评估模型：** 基于历史告警数据和当前威胁情报，建立模型，自动调整检测频率和资源分配，实现风险驱动的主动防御。
2.  **完善取证与恢复流程：** 基于本次事件，完善篡改事件的取证、分析和数据恢复标准操作流程（SOP），并进行定期演练。
3.  **定期生成趋势报告：** 建议将“告警类型分布”、“受影响资产分类”等维度纳入常规统计，以便更精准地识别篡改热点和薄弱环节。

---

**报告结束**

*本报告由数字取证分析系统自动生成，建议结合原始日志进行人工复核。*` },
    { id: 'RPT-003', title: '系统概览报告_20260310', type: 'system', createdAt: '2026-03-10 09:00:00', pageCount: 8, downloadUrl: '#', content: `好的，遵照您的指示，我根据您提供的统计数据，为您生成一份结构清晰、专业详实的系统运行综合报告。

***

# 系统运行综合报告 (2026年3月)

**报告编号:** SYS-2026-03-RPT-001
**统计周期:** 2026年3月1日 00:00:00 至 2026年3月31日 23:59:59
**报告生成日期:** 2026年4月1日

---

## 1. 报告摘要

本报告旨在对系统在2026年3月份的运行状况、安全态势及关键性能指标进行全面分析与总结。统计期内，系统保持稳定运行，累计运行时长达到720小时。核心业务方面，本月完成版权登记128件，累计执行版权检测1024次。安全态势方面，系统共触发告警36次，其中本周（统计周期最后一周）告警数达23次，占全月告警总数的63.9%，显示近期安全风险活动显著加剧。综合评估认为，系统核心功能运行正常，但近期面临较高的安全威胁，需立即采取针对性措施以降低风险。

---

## 2. 核心指标概览

| 指标类别 | 指标名称 | 数值 | 说明 |
| :--- | :--- | :--- | :--- |
| **运行稳定性** | 系统运行时长 | 720 h | 本月系统保持7x24小时不间断运行 |
| **业务处理量** | 版权登记总数 | 128 件 | 本月新增版权登记业务量 |
| **检测能力** | 累计检测次数 | 1024 次 | 系统自上线以来执行的总检测次数 |
| **安全态势** | 告警总数 | 36 次 | 本月系统触发的所有安全告警事件总数 |
| **近期活跃度** | 今日检测量 | 47 次 | 报告生成当日执行的检测次数 |
| **近期安全态势** | 本周告警数 | 23 次 | 统计周期最后一周（3月25日-31日）触发的告警事件数 |

---

## 3. 趋势分析

### 3.1 检测业务量与告警关联性分析

本月累计检测次数为1024次，平均日检测量约为33次。报告当日检测量为47次，显著高于月平均水平，表明近期检测业务需求有所增长。

与此同时，告警总数达到36次，且**本周告警数高达23次**，占全月告警总量的63.9%。结合检测量上升的趋势，可以推断近期系统面临的攻击尝试或异常行为在频率和强度上均有所增加。

### 3.2 告警时间分布

告警事件在本月呈现明显的**后半月集中爆发**趋势。前两周（3月1日-14日）告警活动相对平缓，累计告警数约为13次。但从第三周开始，特别是进入最后一周（3月25日-31日），告警频率急剧攀升，单周告警数达到23次。这表明攻击行为可能具有时间上的规律性，或与特定外部事件（如版本更新、新漏洞披露）相关。

---

## 4. 风险预警

### 4.1 近期风险等级评估：**高**

基于本周告警数占全月告警总数的比例超过60%，且告警频率呈加速增长态势，当前系统的安全风险等级被评定为 **“高”** 。系统正面临持续且活跃的安全威胁。

### 4.2 篡改热点分析

结合告警类型与统计数据，初步判断本月的攻击热点集中在以下方面：

| 风险热点 | 描述 | 建议关注点 |
| :--- | :--- | :--- |
| **版权登记信息篡改** | 针对版权登记接口或数据库的注入/篡改尝试。 | 重点审查与版权登记相关的API接口日志，关注异常的数据写入行为。 |
| **检测结果劫持** | 试图拦截或篡改检测结果，以规避版权保护。 | 强化检测结果传输与存储的完整性校验机制。 |
| **账号权限滥用** | 利用合法账号进行未授权的操作，如批量导出数据或修改配置。 | 监控高权限账号的异常登录与操作行为，实施最小权限原则。 |

### 4.3 典型篡改现场描述

在3月28日的日志审查中，发现一起典型的**检测结果劫持**攻击尝试。攻击者通过构造恶意HTTP请求，试图在检测结果返回给客户端前，注入一个虚假的“未侵权”状态码。该请求的源IP来自境外，User-Agent被伪装成正常浏览器。所幸系统部署的WAF规则成功识别并拦截了该请求，未造成实际影响。此事件表明，攻击者已开始针对系统的核心检测逻辑进行精准攻击。

---

## 5. 管理建议

针对当前系统运行状况及风险分析，提出以下管理建议：

1.  **立即启动应急响应流程：**
    *   鉴于本周告警数量激增，建议立即组织安全运维团队，对本月所有告警事件进行回溯分析，确认是否存在漏报或误报。
    *   对告警事件中涉及的所有IP地址、用户账号及操作对象进行彻查，评估潜在影响范围。

2.  **强化安全防护策略：**
    *   **WAF规则优化：** 针对近期发现的篡改手法（如检测结果劫持），立即更新或新增Web应用防火墙规则，实施更严格的输入校验和响应过滤。
    *   **访问控制加固：** 对敏感接口（如版权登记、检测结果查询）实施更严格的访问控制策略，包括但不限于二次认证、IP白名单、请求频率限制等。
    *   **日志审计升级：** 增加对数据完整性校验失败的日志记录粒度，并设置实时告警，确保任何篡改尝试都能被第一时间发现。

3.  **加强人员与流程管理：**
    *   对所有具有系统管理权限的用户进行安全意识再培训，强调密码安全与操作规范。
    *   对近期（尤其是3月15日后）所有进行过系统配置变更或发布的操作进行复核，排查是否因人为疏忽引入了安全漏洞。

4.  **建立长效监控机制：**
    *   将“本周告警数/全月告警总数”作为一项关键安全指标进行日常监控。
    *   建立告警趋势基线，当告警频率在短时间内（如24小时内）增长超过阈值时，自动触发高级别预警。

---
**报告结束**` }
  ]);

  const addCopyright = useCallback((c: Copyright) => setCopyrights(p => [...p, c]), []);
  const removeCopyright = useCallback((id: number) => {
    setCopyrights(p => p.filter(c => c.id !== id));
    setSelectedCopyrightId(p => p === id ? null : p);
  }, []);
  const updateCopyright = useCallback((id: number, data: Partial<Copyright>) => {
    setCopyrights(p => p.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);
  const addAttackRecord = useCallback((r: AttackRecord) => {
    setAttackHistory(p => [r, ...p].slice(0, 10));
    incrementDetectionCount();
  }, []);
  const [detectionCount, setDetectionCount] = useState(() => {
    const saved = localStorage.getItem('tracevision_detection_count');
    return saved ? parseInt(saved) : 0;
  });
  const incrementDetectionCount = useCallback(() => setDetectionCount(c => {
    const next = c + 1;
    localStorage.setItem('tracevision_detection_count', String(next));
    return next;
  }), []);
  const addReport = useCallback((r: ReportItem) => setReports(p => [r, ...p]), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed(v => !v), []);

  const [alerts, setAlerts] = useState<AlertItem[]>([
    { id: 'ALT-001', title: '检测到 3 处篡改区域', level: 'critical', timestamp: '2026-03-15 14:23:18', source: '上传检测', status: 'pending', thumbnail: '/img/mock-tampered-1.jpg', regionCount: 3, confidence: 98.4 },
    { id: 'ALT-002', title: '水印提取失败', level: 'warning', timestamp: '2026-03-15 12:10:05', source: '批量检测', status: 'resolved', thumbnail: '/img/mock-tampered-2.jpg', regionCount: 0, confidence: 23.5 },
    { id: 'ALT-003', title: '检测到 1 处篡改区域', level: 'info', timestamp: '2026-03-14 09:45:33', source: '上传检测', status: 'false_positive', thumbnail: '/img/mock-original-1.jpg', regionCount: 1, confidence: 87.2 },
  ]);

  const resolveAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' as const } : a));
  }, []);

  const deleteAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const archiveAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'archived' as const } : a));
  }, []);

  const dashboardStats: DashboardStats = useMemo(() => ({
    copyrightCount: copyrights.length,
    detectionCount,
    alertCount: alerts.length,
    uptime: '--',
    todayDetections: detectionCount,
    weekAlerts: alerts.filter(a => a.status === 'pending').length,
  }), [copyrights.length, alerts.length, detectionCount]);

  const value: AppState = {
    user, isLoggedIn, login, logout,
    copyrights, selectedCopyrightId, setSelectedCopyrightId,
    addCopyright, removeCopyright, updateCopyright,
    uploadedImage, setUploadedImage,
    watermarkedImage, setWatermarkedImage,
    attackHistory, addAttackRecord,
    detectionCount, incrementDetectionCount,
    alerts, resolveAlert, deleteAlert, archiveAlert, reports, addReport, dashboardStats,
    sidebarCollapsed, toggleSidebar,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
