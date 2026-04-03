'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, Spinner, Badge } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  testsThisWeek: number;
  avgScore: number;
  recentActivity: any[];
}

interface StatCardItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor: string;
  bgColor: string;
  textColor: string;
}

const quickActions = [
  {
    label: 'Add Student',
    href: '/admin/students',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    color: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
  },
  {
    label: 'New Test',
    href: '/admin/tests',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    color: 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100',
  },
  {
    label: 'View Results',
    href: '/admin/results',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'text-purple-600 bg-purple-50 hover:bg-purple-100',
  },
  {
    label: 'Attendance',
    href: '/admin/attendance',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    color: 'text-green-600 bg-green-50 hover:bg-green-100',
  },
  {
    label: 'Payments',
    href: '/admin/payments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100',
  },
  {
    label: 'Notifications',
    href: '/admin/notifications',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    color: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get('/admin/dashboard');
        const responseData = response.data?.success ? response.data.data : response.data;
        setStats(responseData);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const statCards: StatCardItem[] = [
    {
      label: 'Total Students',
      value: stats?.totalStudents ?? 0,
      accentColor: '#2563EB',
      bgColor: '#EFF6FF',
      textColor: '#1D4ED8',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: 'Active Today',
      value: stats?.activeStudents ?? 0,
      accentColor: '#16A34A',
      bgColor: '#F0FDF4',
      textColor: '#15803D',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Tests This Week',
      value: stats?.testsThisWeek ?? 0,
      accentColor: '#D97706',
      bgColor: '#FFFBEB',
      textColor: '#B45309',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      label: 'Avg Score',
      value: `${stats?.avgScore ?? 0}%`,
      accentColor: '#7C3AED',
      bgColor: '#F5F3FF',
      textColor: '#6D28D9',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  const firstName = user?.name?.split(' ')[0] ?? 'Admin';

  return (
    <PageWrapper title="Dashboard Overview">
      {/* Welcome banner */}
      <div
        className="rounded-xl p-5 mb-6 text-white"
        style={{ background: 'linear-gradient(135deg, var(--color-sidebar-bg) 0%, var(--color-primary) 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70 font-medium">{getGreeting()},</p>
            <h2 className="text-xl font-bold mt-0.5">{firstName} 👋</h2>
            <p className="text-sm text-white/60 mt-1">
              Here&apos;s what&apos;s happening at your institution today.
            </p>
          </div>
          <div className="hidden sm:block opacity-20">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
          >
            <div className="h-1 w-full" style={{ backgroundColor: card.accentColor }} />
            <div className="p-5 flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: card.bgColor, color: card.textColor }}
              >
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 truncate">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-none">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card title="Quick Actions" subtitle="Shortcuts to common tasks" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors text-center ${action.color}`}
              >
                {action.icon}
                <span className="text-xs font-semibold leading-tight">{action.label}</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" subtitle="Latest events in your institution" className="lg:col-span-2">
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-1">
              {stats.recentActivity.slice(0, 10).map((activity: any, index: number) => (
                <div key={index} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: activity.user_type === 'admin' ? 'var(--color-primary)' : '#16A34A' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{activity.action}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={activity.user_type === 'admin' ? 'info' : 'success'} className="shrink-0">
                    {activity.user_type}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-400">No recent activity to show</p>
              <p className="text-xs text-gray-300 mt-1">Activity will appear here as you use the platform</p>
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}