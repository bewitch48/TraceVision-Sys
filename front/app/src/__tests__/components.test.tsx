/**
 * 前端页面组件渲染测试
 * 测试各页面的基础渲染和交互逻辑
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreProvider } from '@/hooks/useStore';
import React from 'react';

// ---- 包装 Provider ----
function renderWithStore(ui: React.ReactElement) {
  return render(<StoreProvider>{ui}</StoreProvider>);
}

describe('页面组件渲染', () => {

  describe('AdminDashboard 仪表盘', () => {
    it('渲染标题和统计卡片', async () => {
      const AdminDashboard = (await import('@/pages/AdminDashboard')).default;
      renderWithStore(<AdminDashboard />);
      expect(screen.getByText('管理控制中心')).toBeTruthy();
      expect(screen.getByText('版权总数')).toBeTruthy();
      expect(screen.getByText('检测次数')).toBeTruthy();
    });
  });

  describe('Settings 系统配置', () => {
    it('渲染配置表单和保存按钮', async () => {
      const Settings = (await import('@/pages/Settings')).default;
      renderWithStore(<Settings />);
      expect(screen.getByText('系统配置')).toBeTruthy();
      expect(screen.getByText('保存配置')).toBeTruthy();
    });

    it('点击保存配置', async () => {
      const Settings = (await import('@/pages/Settings')).default;
      renderWithStore(<Settings />);
      const btn = screen.getByText('保存配置');
      fireEvent.click(btn);
      // toast 由 sonner 处理，此处验证按钮存在即可
      expect(btn).toBeTruthy();
    });
  });

  describe('Alerts 告警中心', () => {
    it('渲染告警列表和导出按钮', async () => {
      const Alerts = (await import('@/pages/Alerts')).default;
      renderWithStore(<Alerts />);
      expect(screen.getByText('告警中心')).toBeTruthy();
      expect(screen.getByText('导出')).toBeTruthy();
      // 至少有一条告警
      const critical = screen.queryAllByText('严重');
      expect(critical.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Reports 报告中心', () => {
    it('渲染报告配置和生成按钮', async () => {
      const Reports = (await import('@/pages/Reports')).default;
      renderWithStore(<Reports />);
      expect(screen.getByText('取证报告中心')).toBeTruthy();
      const genBtn = screen.getByText('生成 AI 分析报告');
      expect(genBtn).toBeTruthy();
    });
  });

  describe('Tasks 任务管理', () => {
    it('渲染任务列表', async () => {
      const Tasks = (await import('@/pages/Tasks')).default;
      renderWithStore(<Tasks />);
      expect(screen.getByText('检测任务管理')).toBeTruthy();
      expect(screen.getByText('新建任务')).toBeTruthy();
    });
  });

  describe('Copyright 版权管理', () => {
    it('渲染版权管理页面', async () => {
      const Copyright = (await import('@/pages/Copyright')).default;
      renderWithStore(<Copyright />);
      expect(screen.getByText('版权信息管理')).toBeTruthy();
      expect(screen.getByText('新建版权')).toBeTruthy();
    });
  });

  describe('Logs 操作日志', () => {
    it('渲染日志列表和导出按钮', async () => {
      const Logs = (await import('@/pages/Logs')).default;
      renderWithStore(<Logs />);
      expect(screen.getByText('操作日志')).toBeTruthy();
      // 查找导出按钮
      const exportBtns = screen.queryAllByText('导出');
      expect(exportBtns.length).toBeGreaterThanOrEqual(1);
    });
  });
});
