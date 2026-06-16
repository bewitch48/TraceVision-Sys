import { Routes, Route, Navigate } from 'react-router';
import { StoreProvider, useStore } from '@/hooks/useStore';
import { Toaster } from '@/components/ui/sonner';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Workbench from '@/pages/Workbench';
import AttackLab from '@/pages/AttackLab';
import Forensics from '@/pages/Forensics';
import Copyright from '@/pages/Copyright';
import VerifyReport from '@/pages/VerifyReport';
import AdminDashboard from '@/pages/AdminDashboard';
import Alerts from '@/pages/Alerts';
import Reports from '@/pages/Reports';
import Tasks from '@/pages/Tasks';
import AdminCopyrights from '@/pages/AdminCopyrights';
import Logs from '@/pages/Logs';
import Settings from '@/pages/Settings';

// 路由守卫 - 需登录
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useStore();
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

// 路由守卫 - 仅管理员
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, user } = useStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

// 已登录跳转
function RedirectIfLoggedIn({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, user } = useStore();
  if (isLoggedIn) return <Navigate to={user?.role === 'admin' ? '/admin' : '/'} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* 登录页 - 未登录可访问 */}
      <Route path="/login" element={<RedirectIfLoggedIn><Login /></RedirectIfLoggedIn>} />

      {/* 主布局 - 需登录 */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        {/* 公众端 - 游客和管理员都可访问 */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/workbench" element={<Workbench />} />
        <Route path="/attack-lab" element={<AttackLab />} />
        <Route path="/forensics" element={<Forensics />} />
        <Route path="/copyright" element={<Copyright />} />
        <Route path="/verify-report" element={<VerifyReport />} />

        {/* 管理端 - 仅管理员 */}
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/alerts" element={<RequireAdmin><Alerts /></RequireAdmin>} />
        <Route path="/admin/reports" element={<RequireAdmin><Reports /></RequireAdmin>} />
        <Route path="/admin/tasks" element={<RequireAdmin><Tasks /></RequireAdmin>} />
        <Route path="/admin/copyrights" element={<RequireAdmin><AdminCopyrights /></RequireAdmin>} />
        <Route path="/admin/logs" element={<RequireAdmin><Logs /></RequireAdmin>} />
        <Route path="/admin/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />

        {/* 未授权访问管理端时跳回首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppRoutes />
      <Toaster />
    </StoreProvider>
  );
}
