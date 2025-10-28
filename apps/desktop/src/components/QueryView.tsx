import React, { useState } from 'react';
import { useMemory } from '../contexts/MemoryContext';

const QueryView: React.FC = () => {
    const { queryMemory, queryResult, isLoading, error, clearError } = useMemory();
    const [query, setQuery] = useState('');
    const [includeCitations, setIncludeCitations] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        clearError();
        await queryMemory(query.trim(), includeCitations);
    };

    const handleVoiceInput = () => {
        // TODO: Implement voice input with Whisper
        console.log('Voice input not yet implemented');
    };

    return (
        <div className="query-view">
            <div className="query-header">
                <h1>Ask Your Memory</h1>
                <p>Ask questions about your stored memories and get sourced answers</p>
            </div>

            <form onSubmit={handleSubmit} className="query-form">
                <div className="query-input-container">
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="What would you like to know about your memories?"
                        className="query-input"
                        rows={3}
                        disabled={isLoading}
                    />
                    <div className="query-actions">
                        <button
                            type="button"
                            onClick={handleVoiceInput}
                            className="voice-button"
                            disabled={isLoading}
                            title="Voice input (coming soon)"
                        >
                            🎤
                        </button>
                        <button
                            type="submit"
                            className="query-button"
                            disabled={isLoading || !query.trim()}
                        >
                            {isLoading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </div>

                <div className="query-options">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={includeCitations}
                            onChange={(e) => setIncludeCitations(e.target.checked)}
                        />
                        Include citations
                    </label>
                </div>
            </form>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={clearError} className="clear-error">×</button>
                </div>
            )}

            {queryResult && (
                <div className="query-results">
                    <div className="result-header">
                        <h3>Answer</h3>
                        <div className="result-meta">
                            <span className="confidence">
                                Confidence: {Math.round(queryResult.confidence * 100)}%
                            </span>
                            <span className="processing-time">
                                {queryResult.processing_time_ms}ms
                            </span>
                        </div>
                    </div>

                    <div className="answer">
                        {queryResult.answer}
                    </div>

                    {queryResult.citations.length > 0 && (
                        <div className="citations">
                            <h4>Sources</h4>
                            <div className="citations-list">
                                {queryResult.citations.map((citation, index) => (
                                    <div key={citation.id} className="citation">
                                        <div className="citation-header">
                                            <span className="citation-number">{index + 1}</span>
                                            <span className="citation-title">
                                                {citation.title || 'Untitled Memory'}
                                            </span>
                                            <span className="citation-score">
                                                {Math.round(citation.relevance_score * 100)}% relevant
                                            </span>
                                        </div>
                                        <div className="citation-content">
                                            {citation.content}
                                        </div>
                                        {citation.source && (
                                            <div className="citation-source">
                                                Source: {citation.source}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!queryResult && !isLoading && (
                <div className="query-help">
                    <h3>💡 Tips for better results</h3>
                    <ul>
                        <li>Be specific about what you're looking for</li>
                        <li>Use keywords related to your memories</li>
                        <li>Try different phrasings if you don't get results</li>
                        <li>Enable citations to see source information</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default QueryView;
