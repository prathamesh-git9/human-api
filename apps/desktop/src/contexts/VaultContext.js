import { createContext, useContext } from 'react';
const VaultContext = createContext(undefined);
export function VaultProvider({ children, vaultStatus }) {
    const refreshVaultStatus = async () => {
        // This would typically refetch the vault status
        // For now, we'll just pass through the provided status
    };
    return (<VaultContext.Provider value={{ vaultStatus, refreshVaultStatus }}>
      {children}
    </VaultContext.Provider>);
}
export function useVault() {
    const context = useContext(VaultContext);
    if (context === undefined) {
        throw new Error('useVault must be used within a VaultProvider');
    }
    return context;
}
