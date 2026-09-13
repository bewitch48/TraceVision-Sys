import { useLocation, useNavigate } from 'react-router';
import { useStore } from '@/hooks/useStore';
import {
  LayoutDashboard, Shield, FlaskConical, Search, Copyright,
  FileCheck, Bell, FileText, Settings, Users, ClipboardList,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';

const publicNavItems = [
  { icon: LayoutDashboard, label: '洞察中心', labelEn: 'Dashboard', path: '/' },
  { icon: Shield, label: '水印工作台', labelEn: 'Workbench', path: '/workbench' },
  { icon: FlaskConical, label: '攻击实验室', labelEn: 'Attack Lab', path: '/attack-lab' },
  { icon: Search, label: '取证分析', labelEn: 'Forensics', path: '/forensics' },
  { icon: Copyright, label: '版权管理', labelEn: 'Copyright', path: '/copyright' },
  { icon: FileCheck, label: '报告验证', labelEn: 'Verify', path: '/verify-report' },
];

const adminNavItems = [
  { icon: LayoutDashboard, label: '洞察中心', labelEn: 'Dashboard', path: '/admin' },
  { icon: Bell, label: '告警中心', labelEn: 'Alerts', path: '/admin/alerts' },
  { icon: FileText, label: '报告中心', labelEn: 'Reports', path: '/admin/reports' },
  { icon: Settings, label: '任务管理', labelEn: 'Tasks', path: '/admin/tasks' },
  { icon: Users, label: '版权管理', labelEn: 'Copyrights', path: '/admin/copyrights' },
  { icon: ClipboardList, label: '操作日志', labelEn: 'Logs', path: '/admin/logs' },
  { icon: Settings, label: '系统配置', labelEn: 'Settings', path: '/admin/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, sidebarCollapsed, toggleSidebar, logout } = useStore();

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : publicNavItems;
  const currentPath = location.pathname;

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white/90 backdrop-blur-md border-r border-[#E2E8F0] z-40 transition-all duration-300 flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#E2E8F0] flex-shrink-0">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <img src="/img/logo-new.png" alt="" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-sm font-bold text-[#1E293B] leading-tight">溯影</div>
              <div className="text-[10px] text-[#94A3B8] leading-tight">TraceVision</div>
            </div>
          </div>
        )}
        {sidebarCollapsed && <img src="/img/logo-new.png" alt="" className="w-8 h-8 object-contain mx-auto" />}
      </div>

      {/* Toggle */}
      <button onClick={toggleSidebar} className="absolute -right-3 top-20 w-6 h-6 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-50" aria-label="折叠侧边栏" title="折叠侧边栏">
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3 text-[#475569]" /> : <ChevronLeft className="w-3 h-3 text-[#475569]" />}
      </button>

      {/* User Info */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <img src={user?.avatar || '/img/logo-new.png'} alt="" className="w-8 h-8 rounded-full object-cover border border-[#E2E8F0]" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-[#1E293B] truncate">{user?.username || '用户'}</div>
              <div className={`text-[10px] ${isAdmin ? 'text-[#F59E0B]' : 'text-[#2563EB]'}`}>
                {isAdmin ? '系统管理员' : '访客用户'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="mt-2 px-2 space-y-1 flex-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`sidebar-item w-full ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <div className="text-left">
                  <div className="text-sm leading-tight">{item.label}</div>
                  <div className="text-[10px] text-[#94A3B8] leading-tight">{item.labelEn}</div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[#E2E8F0] flex-shrink-0">
        <button onClick={logout}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <LogOut className="w-4 h-4" />
          {!sidebarCollapsed && <span>退出登录</span>}
        </button>
      </div>
    </aside>
  );
}
