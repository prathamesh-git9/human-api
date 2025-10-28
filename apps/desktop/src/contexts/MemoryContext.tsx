import { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface MemoryEntry {
  id?: string;
  content: string;
  title?: string;
  tags: string[];
  source?: string;
  created_at?: string;
  updated_at?: string;
}

interface QueryResult {
  answer: string;
  citations: Citation[];
  confidence: number;
  processing_time_ms: number;
}

interface Citation {
  id: string;
  title?: string;
  content: string;
  relevance_score: number;
  source?: string;
}

interface MemoryContextType {
  memories: MemoryEntry[];
  queryResult: QueryResult | null;
  isLoading: boolean;
  error: string | null;
  addMemory: (memory: Omit<MemoryEntry, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  queryMemory: (query: string, includeCitations?: boolean) => Promise<void>;
  searchMemories: (query: string, tags?: string[]) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  updateMemory: (id: string, memory: Partial<MemoryEntry>) => Promise<void>;
  clearError: () => void;
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

interface MemoryProviderProps {
  readonly children: ReactNode;
}

export function MemoryProvider({ children }: MemoryProviderProps) {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMemory = async (memory: Omit<MemoryEntry, 'id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if Tauri API is available
      if (globalThis.window?.__TAURI__) {
        const id = await invoke<string>('add_memory', { entry: memory });
        const newMemory: MemoryEntry = {
          ...memory,
          id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setMemories(prev => [newMemory, ...prev]);
      } else {
        // Mock response for development
        console.log('Tauri API not available, simulating memory addition');
        const mockId = `mock-${Date.now()}`;
        const newMemory: MemoryEntry = {
          ...memory,
          id: mockId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setMemories(prev => [newMemory, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add memory');
    } finally {
      setIsLoading(false);
    }
  };

  const queryMemory = async (query: string, includeCitations = true) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if Tauri API is available
      if (globalThis.window?.__TAURI__) {
        const result = await invoke<QueryResult>('query_memory', {
          request: {
            query,
            include_citations: includeCitations,
          },
        });
        setQueryResult(result);
      } else {
        // Mock response for development
        console.log('Tauri API not available, simulating memory query');
        const mockResult: QueryResult = {
          answer: `This is a mock response to: "${query}". In a real implementation, this would search through your memories and provide relevant information with citations.`,
          citations: [
            {
              id: 'mock-citation-1',
              title: 'Sample Memory',
              content: 'This is a sample memory that would be found in a real search.',
              relevance_score: 0.95,
              source: 'Mock Source',
            },
          ],
          confidence: 0.85,
          processing_time_ms: 150,
        };
        setQueryResult(mockResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query memory');
    } finally {
      setIsLoading(false);
    }
  };

  const searchMemories = async (query: string, tags?: string[]) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if Tauri API is available
      if (globalThis.window?.__TAURI__) {
        const results = await invoke<MemoryEntry[]>('search_memories', {
          query,
          tags,
        });
        setMemories(results);
      } else {
        // Mock response for development
        console.log('Tauri API not available, simulating memory search');
        const mockMemories: MemoryEntry[] = [
          {
            id: 'mock-1',
            title: 'Sample Memory 1',
            content:
              'This is a sample memory that demonstrates how the Human API would store and retrieve information.',
            tags: ['sample', 'demo'],
            source: 'Mock Source',
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            updated_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 'mock-2',
            title: 'Another Memory',
            content:
              'This is another sample memory to show how multiple memories would be displayed in the interface.',
            tags: ['example', 'test'],
            source: 'Demo Source',
            created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            updated_at: new Date(Date.now() - 172800000).toISOString(),
          },
        ];
        setMemories(mockMemories);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search memories');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMemory = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if Tauri API is available
      if (globalThis.window?.__TAURI__) {
        await invoke('delete_memory', { id });
      } else {
        // Mock response for development
        console.log('Tauri API not available, simulating memory deletion');
      }
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete memory');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMemory = async (id: string, memory: Partial<MemoryEntry>) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if Tauri API is available
      if (globalThis.window?.__TAURI__) {
        await invoke('update_memory', { id, entry: memory });
      } else {
        // Mock response for development
        console.log('Tauri API not available, simulating memory update');
      }
      setMemories(prev =>
        prev.map(m => (m.id === id ? { ...m, ...memory, updated_at: new Date().toISOString() } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update memory');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  const contextValue = useMemo(
    () => ({
      memories,
      queryResult,
      isLoading,
      error,
      addMemory,
      queryMemory,
      searchMemories,
      deleteMemory,
      updateMemory,
      clearError,
    }),
    [memories, queryResult, isLoading, error]
  );

  return <MemoryContext.Provider value={contextValue}>{children}</MemoryContext.Provider>;
}

export function useMemory() {
  const context = useContext(MemoryContext);
  if (context === undefined) {
    throw new Error('useMemory must be used within a MemoryProvider');
  }
  return context;
}
