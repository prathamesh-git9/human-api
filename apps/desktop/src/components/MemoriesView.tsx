import React, { useState, useEffect } from 'react';
import { useMemory } from '../contexts/MemoryContext';

const MemoriesView: React.FC = () => {
  const { memories, searchMemories, deleteMemory, isLoading, error } = useMemory();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemory, setNewMemory] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    source: '',
  });

  useEffect(() => {
    // Load initial memories
    searchMemories('');
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await searchMemories(searchQuery, selectedTags.length > 0 ? selectedTags : undefined);
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.content.trim()) return;

    await searchMemories(''); // Refresh the list
    setNewMemory({ title: '', content: '', tags: [], source: '' });
    setShowAddForm(false);
  };

  const handleDeleteMemory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this memory?')) {
      await deleteMemory(id);
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !newMemory.tags.includes(tag.trim())) {
      setNewMemory(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()],
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewMemory(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  return (
    <div className="memories-view">
      <div className="memories-header">
        <h1>Your Memories</h1>
        <button onClick={() => setShowAddForm(!showAddForm)} className="add-memory-button">
          + Add Memory
        </button>
      </div>

      {showAddForm && (
        <div className="add-memory-form">
          <h3>Add New Memory</h3>
          <form onSubmit={handleAddMemory}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Title (optional)"
                value={newMemory.title}
                onChange={e => setNewMemory(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <textarea
                placeholder="Memory content..."
                value={newMemory.content}
                onChange={e => setNewMemory(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="text"
                placeholder="Source (optional)"
                value={newMemory.source}
                onChange={e => setNewMemory(prev => ({ ...prev, source: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <div className="tags-input">
                <input
                  type="text"
                  placeholder="Add tags (press Enter)"
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <div className="tags-list">
                  {newMemory.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="remove-tag">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Memory'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="cancel-button">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="memories-list">
        {memories.length === 0 ? (
          <div className="empty-state">
            <h3>No memories found</h3>
            <p>Add your first memory or try a different search term</p>
          </div>
        ) : (
          memories.map(memory => (
            <div key={memory.id} className="memory-card">
              <div className="memory-header">
                <h3>{memory.title || 'Untitled Memory'}</h3>
                <div className="memory-actions">
                  <button
                    onClick={() => handleDeleteMemory(memory.id!)}
                    className="delete-button"
                    title="Delete memory"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="memory-content">{memory.content}</div>

              {memory.tags.length > 0 && (
                <div className="memory-tags">
                  {memory.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="memory-meta">
                {memory.source && <span className="memory-source">Source: {memory.source}</span>}
                <span className="memory-date">
                  {memory.created_at && new Date(memory.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MemoriesView;
