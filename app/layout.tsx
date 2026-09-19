import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Branch Closure Redirect & FAQ Agent — Voice Agent Demo',
  description:
    'A multilingual voice agent that knows every Swiss Post location: status, closure date, nearest alternative, partner branch hours and digital alternatives. DE/FR/IT/EN with automatic detection.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
