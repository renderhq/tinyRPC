'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

// Theme Constants
const THEME = {
    bg: '#fafafa',
    cardBg: '#ffffff',
    accent: '#000000',
    secondary: '#666666',
    border: '#eaeaea',
    success: '#0070f3',
    font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

// Client-only components
const StatsOverview = dynamic(() => import('./components/StatsOverview'), { ssr: false });
const ActionsManagement = dynamic(() => import('./components/ActionsManagement'), { ssr: false });

const queryClient = new QueryClient();

export default function Home(): JSX.Element {
    return (
        <QueryClientProvider client={queryClient}>
            <main
                style={{
                    minHeight: '100vh',
                    backgroundColor: THEME.bg,
                    fontFamily: THEME.font,
                    color: THEME.accent,
                    padding: '2rem',
                }}
            >
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    {/* Header */}
                    <nav
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4rem',
                            paddingBottom: '1rem',
                            borderBottom: `1px solid ${THEME.border}`,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    background: THEME.accent,
                                    borderRadius: '8px',
                                }}
                            />
                            <span style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                                tinyRPC.
                            </span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: THEME.secondary, fontWeight: 500 }}>
                            v1.0.0-alpha - OSS Performance Dashboard
                        </div>
                    </nav>

                    <section
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '2rem',
                        }}
                    >
                        <StatsOverview />
                        <ActionsManagement />
                    </section>

                    <footer
                        style={{
                            marginTop: '6rem',
                            paddingTop: '2rem',
                            borderTop: `1px solid ${THEME.border}`,
                            textAlign: 'center',
                        }}
                    >
                        <p style={{ fontSize: '0.8rem', color: THEME.secondary }}>
                            Architected for high-performance distributed systems.
                            <br />
                            Built for tinyRPC.
                        </p>
                    </footer>
                </div>
            </main>
        </QueryClientProvider>
    );
}

