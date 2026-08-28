import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClearPacket | Document verification with evidence',
  description: 'Compare invoices, purchase orders, and delivery receipts before money moves.',
  openGraph: {
    title: 'ClearPacket | Every mismatch before you pay',
    description: 'Three-way document verification with a human decision where it matters.',
  },
  twitter: {
    card: 'summary',
    title: 'ClearPacket | Every mismatch before you pay',
    description: 'Three-way document verification with a human decision where it matters.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
