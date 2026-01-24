'use client';

import { useState } from 'react';
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

export default function ActionsManagement() {
    const [lastAction, setLastAction] = useState<string | null>(null);
    const mutation = trpc.triggerAction.useMutation();

    const handleScale = async () => {
        const res = await mutation.mutateAsync({ node: 'us-east-1' });
        setLastAction(`Node Rescaled @ ${new Date(res.timestamp).toLocaleTimeString()}`);
    };

    return (
        <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Control Plane</h2>
            <p style={{ fontSize: '0.9rem', color: THEME.secondary, marginBottom: '2rem' }}>
                Interface for side-effect operations via tinyRPC mutations.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                    onClick={handleScale}
                    disabled={mutation.isPending}
                    style={{
                        backgroundColor: THEME.accent,
                        color: '#fff',
                        border: 'none',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        opacity: mutation.isPending ? 0.7 : 1,
                    }}
                >
                    {mutation.isPending ? 'Scaling Node...' : 'Scale us-east-1 Node'}
                </button>

                {lastAction && (
                    <div
                        style={{
                            padding: '1rem',
                            backgroundColor: '#f6fdf9',
                            border: '1px solid #c9f0d8',
                            borderRadius: '8px',
                            color: '#1e4620',
                            fontSize: '0.85rem',
                        }}
                    >
                        <strong>Success:</strong> {lastAction}
                    </div>
                )}

                <div style={{ marginTop: '2rem' }}>
                    <div
                        style={{
                            fontSize: '0.75rem',
                            color: THEME.secondary,
                            marginBottom: '1rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        Execution Logs
                    </div>
                    <div
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            color: THEME.secondary,
                            maxHeight: '100px',
                            overflowY: 'auto',
                        }}
                    >
                        {mutation.isSuccess && `> [tinyRPC] mutation::triggerAction success\n`}
                        {`> [tinyRPC] connected to edge_runtime\n`}
                        {`> [tinyRPC] initializing streaming_stats...`}
                    </div>
                </div>
            </div>
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
