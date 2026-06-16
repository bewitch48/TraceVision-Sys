import { Outlet } from 'react-router';
import { useStore } from '@/hooks/useStore';
import Sidebar from './Sidebar';
import Header from './Header';
import LightBackground from './LightBackground';

export default function Layout() {
  const { sidebarCollapsed } = useStore();

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative">
      <LightBackground />
      <Sidebar />
      <Header />
      <main className={`pt-16 min-h-screen transition-all duration-300 relative z-10 ${sidebarCollapsed ? 'pl-16' : 'pl-60'}`}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
