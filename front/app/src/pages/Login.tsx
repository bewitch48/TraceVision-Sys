import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '@/hooks/useStore';
import { Shield, Eye, EyeOff, User, Lock, LogIn } from 'lucide-react';
import GrainBackground from '@/components/GrainBackground';
import MarqueeText from '@/components/MarqueeText';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const result = login(username, password);
      setIsLoading(false);
      if (result.success) {
        navigate(result.role === 'admin' ? '/admin' : '/');
      } else {
        setError('用户名或密码错误');
      }
    }, 800);
  };

  const fillDemo = (role: 'guest' | 'admin') => {
    if (role === 'guest') { setUsername('guest'); setPassword('guest123'); }
    else { setUsername('admin'); setPassword('admin123'); }
    setError('');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <GrainBackground />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 mb-4 shadow-[0_0_40px_rgba(37,99,235,0.15)]">
            <img src="/img/logo-new.png" alt="TraceVision" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white font-display tracking-tight">溯影</h1>
          <p className="text-sm text-white/40 mt-1">TraceVision · 数字内容溯源与知识产权保护系统</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(37,99,235,0.3)]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn className="w-4 h-4" />登录</>
              )}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-[10px] text-white/30 mb-3 text-center">演示账号（点击快速填充）</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fillDemo('guest')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#2563EB]/30 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#2563EB]/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div>
                  <div className="text-xs text-white/70 font-medium">游客端</div>
                  <div className="text-[10px] text-white/30">guest / guest123</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#F59E0B]/30 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-[#F59E0B]" />
                </div>
                <div>
                  <div className="text-xs text-white/70 font-medium">管理员</div>
                  <div className="text-[10px] text-white/30">admin / admin123</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Marquee */}
        <div className="mt-6 text-center">
          <MarqueeText
            speed={30}
            direction="left"
            className="text-white/10 text-xs font-display"
            separator="    ·    "
            items={['数字水印', '版权保护', '篡改检测', '取证分析', '像素级定位', '知识产权', 'AIGC 溯源', '隐写分析']}
          />
        </div>
      </div>
    </div>
  );
}
