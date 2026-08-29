import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://clearpacket.hdjskndf.chatgpt.site'),
  title: 'ClearPacket | Accounts payable packet review',
  description: 'Review the exact difference between a purchase order, supplier invoice, and delivery receipt.',
  openGraph: {
    title: 'ClearPacket | Accounts payable packet review',
    description: 'A working three-way document check built with Nutrient DWS.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClearPacket | Accounts payable packet review',
    description: 'A working three-way document check built with Nutrient DWS.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
