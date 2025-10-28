import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

const InsightsView: React.FC = () => {
  const [, setInsights] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');

  useEffect(() => {
    loadInsights();
    loadStats();
  }, [selectedPeriod]);

  const loadInsights = async () => {
    try {
      const data = await invoke('get_insights', { period: selectedPeriod });
      setInsights(data);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await invoke('get_memory_stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="insights-view">
      <div className="insights-header">
        <h1>Memory Insights</h1>
        <div className="period-selector">
          <label>Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading insights...</div>
      ) : (
        <div className="insights-content">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Memories</h3>
              <div className="stat-value">{stats?.total_memories || 0}</div>
            </div>
            
            <div className="stat-card">
              <h3>Total Chunks</h3>
              <div className="stat-value">{stats?.total_chunks || 0}</div>
            </div>
            
            <div className="stat-card">
              <h3>Storage Used</h3>
              <div className="stat-value">
                {stats?.storage_size_bytes ? 
                  `${(stats.storage_size_bytes / 1024 / 1024).toFixed(2)} MB` : 
                  '0 MB'
                }
              </div>
            </div>
            
            <div className="stat-card">
              <h3>Embeddings</h3>
              <div className="stat-value">{stats?.total_embeddings || 0}</div>
            </div>
          </div>

          <div className="insights-sections">
            <div className="insight-section">
              <h3>Memory Trends</h3>
              <div className="trend-chart">
                <p>Memory creation trends over time</p>
                <div className="placeholder-chart">
                  📈 Chart visualization coming soon
                </div>
              </div>
            </div>

            <div className="insight-section">
              <h3>Top Tags</h3>
              <div className="tags-analysis">
                <p>Most frequently used tags</p>
                <div className="placeholder-tags">
                  🏷️ Tag analysis coming soon
                </div>
              </div>
            </div>

            <div className="insight-section">
              <h3>Query Patterns</h3>
              <div className="query-analysis">
                <p>Common query patterns and topics</p>
                <div className="placeholder-queries">
                  🔍 Query analysis coming soon
                </div>
              </div>
            </div>
          </div>

          <div className="insights-actions">
            <button
              onClick={loadInsights}
              className="refresh-button"
              disabled={isLoading}
            >
              🔄 Refresh Insights
            </button>
            
            <button
              onClick={() => invoke('export_data', { format: 'json' })}
              className="export-button"
            >
              📤 Export Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsView;
