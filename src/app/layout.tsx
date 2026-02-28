import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'FitFrame — Virtual Try-On',
  description: 'See how clothes look on your exact body shape before you buy. Enter your measurements and try on outfits in 3D.',
  keywords: 'virtual try-on, 3D fashion, clothing simulator, body avatar',
  openGraph: {
    title: 'FitFrame — Virtual Try-On',
    description: 'Try on clothes in 3D using your real measurements',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
