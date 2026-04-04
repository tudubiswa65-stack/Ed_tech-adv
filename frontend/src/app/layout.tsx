import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/context/ThemeContext';
import { QueryProvider } from '@/components/providers/QueryProvider';
import Toast from '@/components/ui/Toast';
import { instituteConfig } from '@/config/institute.config';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins' });

export const metadata: Metadata = {
  title: `${instituteConfig.name} - ${instituteConfig.tagline}`,
  description: instituteConfig.tagline,
  openGraph: {
    title: instituteConfig.name,
    description: instituteConfig.tagline,
    type: 'website',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} dark`}>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --color-primary: ${instituteConfig.primaryColor};
                --color-secondary: ${instituteConfig.secondaryColor};
              }
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider>
            <QueryProvider>
              <AuthProvider>
                {children}
                <Toast />
              </AuthProvider>
            </QueryProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}