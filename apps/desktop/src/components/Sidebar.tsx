import React from 'react';
import { useVault } from '../contexts/VaultContext';

interface SidebarProps {
    currentView: 'query' | 'memories' | 'insights' | 'settings';
    onViewChange: (view: 'query' | 'memories' | 'insights' | 'settings') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
    const { vaultStatus } = useVault();

    const menuItems = [
        { id: 'query', label: 'Query', icon: '🔍', description: 'Ask your memory' },
        { id: 'memories', label: 'Memories', icon: '📚', description: 'Browse memories' },
        { id: 'insights', label: 'Insights', icon: '📊', description: 'Analytics & trends' },
        { id: 'settings', label: 'Settings', icon: '⚙️', description: 'Vault settings' },
    ] as const;

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="vault-info">
                    <h2>🧠 Human API</h2>
                    <p className="vault-name">{vaultStatus.name || 'Personal Vault'}</p>
                    <p className="memory-count">{vaultStatus.memory_count} memories</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                        onClick={() => onViewChange(item.id)}
                        title={item.description}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="vault-status">
                    <div className="status-indicator">
                        <div className={`status-dot ${vaultStatus.is_unlocked ? 'unlocked' : 'locked'}`} />
                        <span>{vaultStatus.is_unlocked ? 'Unlocked' : 'Locked'}</span>
                    </div>
                    {vaultStatus.last_sync && (
                        <p className="last-sync">
                            Last sync: {new Date(vaultStatus.last_sync).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
