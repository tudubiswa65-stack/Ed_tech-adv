interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'pink';
}

const colors = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   bar: '#2563EB' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  bar: '#16A34A' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', bar: '#9333EA' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', bar: '#EA580C' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', bar: '#4F46E5' },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-600',   bar: '#DB2777' },
};

const icons: Record<string, JSX.Element> = {
  branches: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  students: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  payments: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  courses: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  tests: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
};

export function StatCard({ title, value, icon, color }: StatCardProps) {
  const scheme = colors[color];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
      <div className="h-1 w-full" style={{ backgroundColor: scheme.bar }} />
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 truncate dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 dark:text-slate-100">{value}</p>
        </div>
        <div className={`p-3 rounded-xl shrink-0 ${scheme.bg} ${scheme.text}`}>
          {icons[icon] ?? icons.courses}
        </div>
      </div>
    </div>
  );
}
