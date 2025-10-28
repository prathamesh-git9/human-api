import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface VaultSetupProps {
    onVaultCreated: (status: any) => void;
}

const VaultSetup: React.FC<VaultSetupProps> = ({ onVaultCreated }) => {
    const [step, setStep] = useState(1);
    const [vaultConfig, setVaultConfig] = useState({
        name: '',
        description: '',
        encryptionEnabled: true,
    });
    const [masterPassword, setMasterPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    const handleNext = () => {
        if (step === 1 && vaultConfig.name.trim()) {
            setStep(2);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleCreateVault = async (e: React.FormEvent) => {
        e.preventDefault();

        if (masterPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (masterPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setIsCreating(true);
        setError('');

        try {
            // Check if Tauri API is available
            if (typeof globalThis.window !== 'undefined' && globalThis.window.__TAURI__) {
                const status = await invoke('create_vault', {
                    config: vaultConfig,
                    master_password: masterPassword,
                });
                onVaultCreated(status);
            } else {
                // Mock response for development
                console.log('Tauri API not available, simulating vault creation');
                const mockStatus = {
                    is_initialized: true,
                    is_unlocked: true,
                    name: vaultConfig.name,
                    memory_count: 0,
                    last_sync: new Date().toISOString()
                };
                onVaultCreated(mockStatus);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create vault');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="vault-setup">
            <div className="vault-setup-content">
                <div className="setup-header">
                    <h1>🧠 Welcome to Human API</h1>
                    <p>Set up your personal memory vault to get started</p>
                </div>

                <div className="setup-progress">
                    <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                        <span className="step-number">1</span>
                        <span className="step-label">Vault Info</span>
                    </div>
                    <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                        <span className="step-number">2</span>
                        <span className="step-label">Security</span>
                    </div>
                </div>

                {step === 1 && (
                    <div className="setup-step">
                        <h2>Create Your Vault</h2>
                        <p>Give your memory vault a name and description</p>

                        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                            <div className="form-group">
                                <label htmlFor="vaultName">Vault Name *</label>
                                <input
                                    id="vaultName"
                                    type="text"
                                    value={vaultConfig.name}
                                    onChange={(e) => setVaultConfig(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="My Personal Vault"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Description (Optional)</label>
                                <textarea
                                    id="description"
                                    value={vaultConfig.description}
                                    onChange={(e) => setVaultConfig(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="A brief description of what this vault contains"
                                    rows={3}
                                />
                            </div>

                            <div className="form-actions">
                                <button type="submit" disabled={!vaultConfig.name.trim()}>
                                    Next: Security Setup
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {step === 2 && (
                    <div className="setup-step">
                        <h2>Set Master Password</h2>
                        <p>Choose a strong password to protect your memories</p>

                        <form onSubmit={handleCreateVault}>
                            <div className="form-group">
                                <label htmlFor="masterPassword">Master Password *</label>
                                <input
                                    id="masterPassword"
                                    type="password"
                                    value={masterPassword}
                                    onChange={(e) => setMasterPassword(e.target.value)}
                                    placeholder="Enter a strong password"
                                    required
                                    minLength={8}
                                />
                                <small>Must be at least 8 characters long</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password *</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    required
                                />
                            </div>

                            <div className="security-info">
                                <h4>🔒 Security Features</h4>
                                <ul>
                                    <li>All data encrypted with AES-256-GCM</li>
                                    <li>Password hashed with Argon2id</li>
                                    <li>Local-first: your data stays on your device</li>
                                    <li>No network access required</li>
                                </ul>
                            </div>

                            {error && (
                                <div className="error-message">
                                    {error}
                                </div>
                            )}

                            <div className="form-actions">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="back-button"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating || !masterPassword || !confirmPassword}
                                >
                                    {isCreating ? 'Creating Vault...' : 'Create Vault'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VaultSetup;
