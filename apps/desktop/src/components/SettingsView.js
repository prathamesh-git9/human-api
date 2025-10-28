import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVault } from '../contexts/VaultContext';
const SettingsView = () => {
    const { vaultStatus } = useVault();
    const [settings, setSettings] = useState({
        vaultName: '',
        description: '',
        encryptionEnabled: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    useEffect(() => {
        setSettings({
            vaultName: vaultStatus.name || '',
            description: '',
            encryptionEnabled: true,
        });
    }, [vaultStatus]);
    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');
        try {
            await invoke('update_vault_settings', {
                name: settings.vaultName || undefined,
                description: settings.description || undefined,
            });
            setMessage('Settings saved successfully!');
        }
        catch (error) {
            setMessage(`Failed to save settings: ${error}`);
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleExport = async () => {
        try {
            const data = await invoke('export_data', { format: 'json' });
            // In a real app, you'd trigger a download
            console.log('Export data:', data);
            setMessage('Data exported successfully!');
        }
        catch (error) {
            setMessage(`Export failed: ${error}`);
        }
    };
    const handleImport = async () => {
        // In a real app, you'd open a file dialog
        setMessage('Import functionality coming soon!');
    };
    return (<div className="settings-view">
      <div className="settings-header">
        <h1>Vault Settings</h1>
        <p>Manage your vault configuration and data</p>
      </div>

      <div className="settings-content">
        <form onSubmit={handleSave} className="settings-form">
          <div className="form-section">
            <h3>Vault Information</h3>

            <div className="form-group">
              <label htmlFor="vaultName">Vault Name</label>
              <input id="vaultName" type="text" value={settings.vaultName} onChange={e => setSettings(prev => ({ ...prev, vaultName: e.target.value }))} placeholder="My Personal Vault"/>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea id="description" value={settings.description} onChange={e => setSettings(prev => ({ ...prev, description: e.target.value }))} placeholder="Optional description of your vault" rows={3}/>
            </div>
          </div>

          <div className="form-section">
            <h3>Security</h3>

            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={settings.encryptionEnabled} onChange={e => setSettings(prev => ({ ...prev, encryptionEnabled: e.target.checked }))} disabled/>
                Encryption Enabled
                <span className="disabled-note">(Always enabled for security)</span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        <div className="data-section">
          <h3>Data Management</h3>

          <div className="data-actions">
            <button onClick={handleExport} className="export-button">
              📤 Export Vault Data
            </button>

            <button onClick={handleImport} className="import-button">
              📥 Import Data
            </button>
          </div>

          <div className="vault-info">
            <h4>Vault Status</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className={`info-value ${vaultStatus.is_unlocked ? 'unlocked' : 'locked'}`}>
                  {vaultStatus.is_unlocked ? '🔓 Unlocked' : '🔒 Locked'}
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Memories:</span>
                <span className="info-value">{vaultStatus.memory_count}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Last Sync:</span>
                <span className="info-value">
                  {vaultStatus.last_sync
            ? new Date(vaultStatus.last_sync).toLocaleString()
            : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {message && (<div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>)}
      </div>
    </div>);
};
export default SettingsView;
