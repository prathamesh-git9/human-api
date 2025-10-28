import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-animation">
          <div className="brain-icon">🧠</div>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <h2>Human API</h2>
        <p>Initializing your personal memory system...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
