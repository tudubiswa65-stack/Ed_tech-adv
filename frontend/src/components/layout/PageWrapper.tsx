'use client';

import { ReactNode } from 'react';

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export default function PageWrapper({ title, subtitle, children, actions }: PageWrapperProps) {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
}