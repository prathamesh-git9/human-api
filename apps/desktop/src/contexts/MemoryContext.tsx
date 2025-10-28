import { createContext, useContext, ReactNode, useState } from 'react';
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
    children: ReactNode;
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
            const id = await invoke<string>('add_memory', { entry: memory });
            const newMemory: MemoryEntry = {
                ...memory,
                id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setMemories(prev => [newMemory, ...prev]);
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
            const result = await invoke<QueryResult>('query_memory', {
                request: {
                    query,
                    include_citations: includeCitations,
                },
            });
            setQueryResult(result);
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
            const results = await invoke<MemoryEntry[]>('search_memories', {
                query,
                tags,
            });
            setMemories(results);
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
            await invoke('delete_memory', { id });
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
            await invoke('update_memory', { id, entry: memory });
            setMemories(prev => prev.map(m =>
                m.id === id ? { ...m, ...memory, updated_at: new Date().toISOString() } : m
            ));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update memory');
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);

    return (
        <MemoryContext.Provider value={{
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
        }}>
            {children}
        </MemoryContext.Provider>
    );
}

export function useMemory() {
    const context = useContext(MemoryContext);
    if (context === undefined) {
        throw new Error('useMemory must be used within a MemoryProvider');
    }
    return context;
}
