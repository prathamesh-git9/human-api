import { createContext, useContext, ReactNode } from 'react';

interface VaultStatus {
  is_initialized: boolean;
  is_unlocked: boolean;
  name?: string;
  memory_count: number;
  last_sync?: string;
}

interface VaultContextType {
  vaultStatus: VaultStatus;
  refreshVaultStatus: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

interface VaultProviderProps {
  children: ReactNode;
  vaultStatus: VaultStatus;
}

export function VaultProvider({ children, vaultStatus }: VaultProviderProps) {
  const refreshVaultStatus = async () => {
    // This would typically refetch the vault status
    // For now, we'll just pass through the provided status
  };

  return (
    <VaultContext.Provider value={{ vaultStatus, refreshVaultStatus }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
