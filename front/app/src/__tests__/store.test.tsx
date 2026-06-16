/**
 * 前端 Store 状态管理测试
 * 测试 useStore Hook 和 StoreProvider
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { StoreProvider, useStore } from '@/hooks/useStore';
import React from 'react';

// 包装组件
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StoreProvider>{children}</StoreProvider>
);

describe('useStore 状态管理', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  // ---- 认证 ----
  describe('认证 (login / logout)', () => {
    it('初始状态未登录', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      expect(result.current.isLoggedIn).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('admin 账号登录成功', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      let loginResult: any;
      act(() => {
        loginResult = result.current.login('admin', 'admin123');
      });
      expect(loginResult.success).toBe(true);
      expect(loginResult.role).toBe('admin');
      expect(result.current.isLoggedIn).toBe(true);
      expect(result.current.user?.role).toBe('admin');
    });

    it('guest 账号登录成功', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      act(() => {
        result.current.login('guest', 'guest123');
      });
      expect(result.current.user?.role).toBe('guest');
    });

    it('错误密码登录失败', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      let loginResult: any;
      act(() => {
        loginResult = result.current.login('admin', 'wrong');
      });
      expect(loginResult.success).toBe(false);
      expect(result.current.isLoggedIn).toBe(false);
    });

    it('登出后清除用户状态', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      act(() => {
        result.current.login('admin', 'admin123');
      });
      expect(result.current.isLoggedIn).toBe(true);
      act(() => {
        result.current.logout();
      });
      expect(result.current.isLoggedIn).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  // ---- 版权管理 ----
  describe('版权管理 (copyrights)', () => {
    it('添加版权', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      const copyright = {
        id: 1,
        company: 'Test公司',
        logoUrl: '/img/test.png',
        createdAt: '2026-03-15',
      };
      act(() => {
        result.current.addCopyright(copyright);
      });
      expect(result.current.copyrights).toHaveLength(1);
      expect(result.current.copyrights[0].company).toBe('Test公司');
    });

    it('删除版权', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      act(() => {
        result.current.addCopyright({
          id: 1, company: 'A', logoUrl: '', createdAt: '',
        });
        result.current.addCopyright({
          id: 2, company: 'B', logoUrl: '', createdAt: '',
        });
      });
      expect(result.current.copyrights).toHaveLength(2);
      act(() => {
        result.current.removeCopyright(1);
      });
      expect(result.current.copyrights).toHaveLength(1);
      expect(result.current.copyrights[0].id).toBe(2);
    });

    it('更新版权', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      act(() => {
        result.current.addCopyright({
          id: 1, company: 'OldName', logoUrl: '', createdAt: '',
        });
      });
      act(() => {
        result.current.updateCopyright(1, { company: 'NewName' });
      });
      expect(result.current.copyrights[0].company).toBe('NewName');
    });
  });

  // ---- 图片/水印 ----
  describe('图片 & 水印状态', () => {
    it('上传图片', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      act(() => {
        result.current.setUploadedImage('data:image/png;base64,test');
      });
      expect(result.current.uploadedImage).toBe('data:image/png;base64,test');
    });

    it('设置水印图', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      act(() => {
        result.current.setWatermarkedImage('data:image/png;base64,wm');
      });
      expect(result.current.watermarkedImage).toBe('data:image/png;base64,wm');
    });

  });

  // ---- 攻击记录 ----
  describe('攻击记录', () => {
    it('添加攻击记录', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      const record = {
        id: 'atk-1',
        type: 'gaussian',
        params: { sigma: 5 },
        timestamp: '2026-03-15 12:00',
        watermarkDetected: true,
        imageUrl: '/img/test.png',
      };
      act(() => {
        result.current.addAttackRecord(record);
      });
      expect(result.current.attackHistory).toHaveLength(1);
    });

    it('攻击记录最多保留 10 条', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      for (let i = 0; i < 15; i++) {
        act(() => {
          result.current.addAttackRecord({
            id: `atk-${i}`,
            type: 'gaussian',
            params: {},
            timestamp: '',
            watermarkDetected: true,
            imageUrl: '',
          });
        });
      }
      expect(result.current.attackHistory).toHaveLength(10);
    });
  });

  // ---- UI ----
  describe('UI 状态', () => {
    it('侧边栏折叠切换', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      expect(result.current.sidebarCollapsed).toBe(false);
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarCollapsed).toBe(true);
    });
  });

  // ---- 仪表盘 ----
  describe('仪表盘数据', () => {
    it('仪表盘统计数据存在', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      expect(result.current.dashboardStats.copyrightCount).toBe(0);     // 初始无版权
      expect(result.current.dashboardStats.detectionCount).toBe(0);     // 初始无检测
      expect(result.current.dashboardStats.alertCount).toBe(3);         // 3 条预置告警
    });

    it('告警数据存在', () => {
      const { result } = renderHook(() => useStore(), { wrapper });
      expect(result.current.alerts.length).toBe(3);
      expect(result.current.alerts[0].level).toBe('critical');
    });
  });
});
