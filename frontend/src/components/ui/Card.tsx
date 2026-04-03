'use client';

import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  actions?: ReactNode;
  accent?: string;
  noPadding?: boolean;
}

export default function Card({
  title,
  subtitle,
  children,
  className = '',
  onClick,
  actions,
  accent,
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''
      } ${className}`}
      onClick={onClick}
    >
      {accent && <div className="h-1 w-full" style={{ backgroundColor: accent }} />}
      {(title || actions) && (
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-800 leading-snug">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
}