import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'tinyRPC |  OSS Example',
  description: 'High-performance type-safe API communication',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#fafafa' }}>{children}</body>
    </html>
  );
}
