import { useStore } from '@/hooks/useStore';
import { Bell, Search, LogOut } from 'lucide-react';

export default function Header() {
  const { user, sidebarCollapsed, logout } = useStore();
  const isAdmin = user?.role === 'admin';

  return (
    <header className={`fixed top-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] z-30 transition-all duration-300 ${sidebarCollapsed ? 'left-16' : 'left-60'}`}>
      <div className="h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <span>溯影 TraceVision</span>
            <span>/</span>
            <span className={isAdmin ? 'text-[#F59E0B] font-medium' : 'text-[#2563EB]'}>
              {isAdmin ? '管理控制中心' : '公众验证端'}
            </span>
          </div>
          {isAdmin && (
            <span className="px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-[10px] font-medium border border-[#F59E0B]/20">
              管理员模式
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input type="text" placeholder="搜索..." className="pl-9 pr-4 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-md w-48 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>
          <button className="relative p-2 text-[#475569] hover:bg-[#F1F5F9] rounded-md transition-colors" aria-label="打开通知" title="通知">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#EF4444] rounded-full" />
          </button>
          <div className="flex items-center gap-2 pl-3 border-l border-[#E2E8F0]">
            <img src={user?.avatar || '/img/logo-new.png'} alt="" className="w-8 h-8 rounded-full object-cover border border-[#E2E8F0]" />
            <div className="hidden md:block">
              <div className="text-sm font-medium text-[#1E293B]">{user?.username || '用户'}</div>
              <div className="text-[10px] text-[#94A3B8]">{isAdmin ? '系统管理员' : '访客用户'}</div>
            </div>
            <button onClick={logout} className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded-md transition-colors ml-1" title="退出登录">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
