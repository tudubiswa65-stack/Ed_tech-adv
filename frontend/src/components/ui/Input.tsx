'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-sm ${
            error
              ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-500 focus:ring-red-500 text-red-900 dark:text-red-300'
              : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 hover:border-gray-300 dark:hover:border-slate-500 focus:ring-[var(--color-primary)]'
          } ${className}`}
          style={{
            '--tw-ring-color': 'var(--color-primary)',
          } as React.CSSProperties}
          {...props}
        />
        {hint && !error && <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;