import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { VaultProvider } from './contexts/VaultContext';
import { MemoryProvider } from './contexts/MemoryContext';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import VaultSetup from './components/VaultSetup';
import LoadingScreen from './components/LoadingScreen';
import './App.css';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
        },
    },
});
function App() {
    const [vaultStatus, setVaultStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState('query');
    useEffect(() => {
        initializeApp();
    }, []);
    const initializeApp = async () => {
        try {
            // Check if Tauri API is available
            if (typeof globalThis.window !== 'undefined' && globalThis.window.__TAURI__) {
                const status = await invoke('get_vault_status');
                setVaultStatus(status);
            }
            else {
                // Fallback for development - simulate vault status
                console.log('Tauri API not available, using mock data');
                setVaultStatus({
                    is_initialized: false,
                    is_unlocked: false,
                    memory_count: 0,
                });
            }
        }
        catch (error) {
            console.error('Failed to get vault status:', error);
            // Fallback on error
            setVaultStatus({
                is_initialized: false,
                is_unlocked: false,
                memory_count: 0,
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleVaultCreated = (status) => {
        setVaultStatus(status);
    };
    if (isLoading) {
        return <LoadingScreen />;
    }
    if (!vaultStatus?.is_initialized) {
        return (<QueryClientProvider client={queryClient}>
        <VaultSetup onVaultCreated={handleVaultCreated}/>
      </QueryClientProvider>);
    }
    if (!vaultStatus.is_unlocked) {
        return (<QueryClientProvider client={queryClient}>
        <VaultUnlock onVaultUnlocked={handleVaultCreated}/>
      </QueryClientProvider>);
    }
    return (<QueryClientProvider client={queryClient}>
      <VaultProvider vaultStatus={vaultStatus}>
        <MemoryProvider>
          <div className="app">
            <Sidebar currentView={currentView} onViewChange={setCurrentView}/>
            <MainContent currentView={currentView}/>
          </div>
        </MemoryProvider>
      </VaultProvider>
    </QueryClientProvider>);
}
// Vault unlock component
function VaultUnlock({ onVaultUnlocked, }) {
    const [password, setPassword] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [error, setError] = useState('');
    const handleUnlock = async (e) => {
        e.preventDefault();
        setIsUnlocking(true);
        setError('');
        try {
            // Check if Tauri API is available
            if (typeof globalThis.window !== 'undefined' && globalThis.window.__TAURI__) {
                const status = await invoke('unlock_vault', { master_password: password });
                onVaultUnlocked(status);
            }
            else {
                // Mock response for development
                console.log('Tauri API not available, simulating vault unlock');
                const mockStatus = {
                    is_initialized: true,
                    is_unlocked: true,
                    name: 'My Personal Vault',
                    memory_count: 0,
                    last_sync: new Date().toISOString(),
                };
                onVaultUnlocked(mockStatus);
            }
        }
        catch (err) {
            setError('Failed to unlock vault. Please check your password.');
            console.error('Vault unlock error:', err);
        }
        finally {
            setIsUnlocking(false);
        }
    };
    return (<div className="vault-unlock">
      <div className="vault-unlock-content">
        <h1>🔐 Unlock Vault</h1>
        <p>Enter your master password to access your memories</p>

        <form onSubmit={handleUnlock} className="vault-form">
          <div className="form-group">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Master password" required disabled={isUnlocking}/>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={isUnlocking || !password}>
            {isUnlocking ? 'Unlocking...' : 'Unlock Vault'}
          </button>
        </form>
      </div>
    </div>);
}
export default App;
