import { createContext, useContext, useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
const MemoryContext = createContext(undefined);
export function MemoryProvider({ children }) {
    const [memories, setMemories] = useState([]);
    const [queryResult, setQueryResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const addMemory = async (memory) => {
        setIsLoading(true);
        setError(null);
        try {
            // Check if Tauri API is available
            if (globalThis.window?.__TAURI__) {
                const id = await invoke('add_memory', { entry: memory });
                const newMemory = {
                    ...memory,
                    id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                setMemories(prev => [newMemory, ...prev]);
            }
            else {
                // Mock response for development
                console.log('Tauri API not available, simulating memory addition');
                const mockId = `mock-${Date.now()}`;
                const newMemory = {
                    ...memory,
                    id: mockId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                setMemories(prev => [newMemory, ...prev]);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add memory');
        }
        finally {
            setIsLoading(false);
        }
    };
    const queryMemory = async (query, includeCitations = true) => {
        setIsLoading(true);
        setError(null);
        try {
            // Check if Tauri API is available
            if (globalThis.window?.__TAURI__) {
                const result = await invoke('query_memory', {
                    request: {
                        query,
                        include_citations: includeCitations,
                    },
                });
                setQueryResult(result);
            }
            else {
                // Mock response for development
                console.log('Tauri API not available, simulating memory query');
                const mockResult = {
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to query memory');
        }
        finally {
            setIsLoading(false);
        }
    };
    const searchMemories = async (query, tags) => {
        setIsLoading(true);
        setError(null);
        try {
            // Check if Tauri API is available
            if (globalThis.window?.__TAURI__) {
                const results = await invoke('search_memories', {
                    query,
                    tags,
                });
                setMemories(results);
            }
            else {
                // Mock response for development
                console.log('Tauri API not available, simulating memory search');
                const mockMemories = [
                    {
                        id: 'mock-1',
                        title: 'Sample Memory 1',
                        content: 'This is a sample memory that demonstrates how the Human API would store and retrieve information.',
                        tags: ['sample', 'demo'],
                        source: 'Mock Source',
                        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                        updated_at: new Date(Date.now() - 86400000).toISOString(),
                    },
                    {
                        id: 'mock-2',
                        title: 'Another Memory',
                        content: 'This is another sample memory to show how multiple memories would be displayed in the interface.',
                        tags: ['example', 'test'],
                        source: 'Demo Source',
                        created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                        updated_at: new Date(Date.now() - 172800000).toISOString(),
                    },
                ];
                setMemories(mockMemories);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to search memories');
        }
        finally {
            setIsLoading(false);
        }
    };
    const deleteMemory = async (id) => {
        setIsLoading(true);
        setError(null);
        try {
            // Check if Tauri API is available
            if (globalThis.window?.__TAURI__) {
                await invoke('delete_memory', { id });
            }
            else {
                // Mock response for development
                console.log('Tauri API not available, simulating memory deletion');
            }
            setMemories(prev => prev.filter(m => m.id !== id));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete memory');
        }
        finally {
            setIsLoading(false);
        }
    };
    const updateMemory = async (id, memory) => {
        setIsLoading(true);
        setError(null);
        try {
            // Check if Tauri API is available
            if (globalThis.window?.__TAURI__) {
                await invoke('update_memory', { id, entry: memory });
            }
            else {
                // Mock response for development
                console.log('Tauri API not available, simulating memory update');
            }
            setMemories(prev => prev.map(m => (m.id === id ? { ...m, ...memory, updated_at: new Date().toISOString() } : m)));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update memory');
        }
        finally {
            setIsLoading(false);
        }
    };
    const clearError = () => setError(null);
    const contextValue = useMemo(() => ({
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
    }), [memories, queryResult, isLoading, error]);
    return <MemoryContext.Provider value={contextValue}>{children}</MemoryContext.Provider>;
}
export function useMemory() {
    const context = useContext(MemoryContext);
    if (context === undefined) {
        throw new Error('useMemory must be used within a MemoryProvider');
    }
    return context;
}
