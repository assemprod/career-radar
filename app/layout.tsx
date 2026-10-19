import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Career Radar — вакансии под твой профиль',
  description: 'Персональный поисковик карьерных возможностей в Казахстане',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
