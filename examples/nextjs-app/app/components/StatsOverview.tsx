'use client';

import { trpc } from '../../utils/trpc';

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

export default function StatsOverview() {
    const stats = trpc.getSystemStats.useQuery({
        refetchInterval: 2000, // Real-time polling
    });

    const user = trpc.getUser.useQuery('maintainer_1');

    return (
        <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Node Status</h2>

            {user.data && (
                <div
                    style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                >
                    <div style={{ fontSize: '0.8rem', color: THEME.secondary }}>Authenticated:</div>
                    <div
                        style={{
                            background: '#f0f0f0',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                        }}
                    >
                        {user.data.name} ({user.data.role})
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <StatRow
                    label="CPU Utilization"
                    value={stats.data ? `${stats.data.cpu}%` : '...'}
                    progress={stats.data?.cpu}
                />
                <StatRow
                    label="Memory Usage"
                    value={stats.data ? `${stats.data.memory}%` : '...'}
                    progress={stats.data?.memory}
                />
                <StatRow
                    label="System Uptime"
                    value={stats.data ? `${Math.floor(stats.data.uptime)}s` : '...'}
                />

                <div
                    style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${THEME.border}` }}
                >
                    <div style={{ fontSize: '0.75rem', color: THEME.secondary, marginBottom: '0.5rem' }}>
                        Network Engine
                    </div>
                    <code
                        style={{
                            fontSize: '0.8rem',
                            background: '#111',
                            color: '#fff',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            display: 'block',
                        }}
                    >
                        tinyRPC_fetch_adapter::resolved
                    </code>
                </div>
            </div>
        </div>
    );
}

function StatRow({ label, value, progress }: { label: string; value: string; progress?: number }) {
    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                }}
            >
                <span style={{ color: THEME.secondary }}>{label}</span>
                <span style={{ fontWeight: 700 }}>{value}</span>
            </div>
            {progress !== undefined && (
                <div style={{ width: '100%', height: '4px', backgroundColor: '#eee', borderRadius: '2px' }}>
                    <div
                        style={{
                            width: `${progress}%`,
                            height: '100%',
                            backgroundColor: THEME.accent,
                            borderRadius: '2px',
                            transition: 'width 0.5s ease',
                        }}
                    />
                </div>
            )}
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    backgroundColor: THEME.cardBg,
    padding: '2rem',
    borderRadius: '16px',
    border: `1px solid ${THEME.border}`,
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
};

const cardTitleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 700,
    margin: '0 0 1.5rem 0',
    letterSpacing: '-0.01em',
};
