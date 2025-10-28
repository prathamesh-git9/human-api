import React from 'react';
import QueryView from './QueryView';
import MemoriesView from './MemoriesView';
import InsightsView from './InsightsView';
import SettingsView from './SettingsView';

interface MainContentProps {
  currentView: 'query' | 'memories' | 'insights' | 'settings';
}

const MainContent: React.FC<MainContentProps> = ({ currentView }) => {
  const renderView = () => {
    switch (currentView) {
      case 'query':
        return <QueryView />;
      case 'memories':
        return <MemoriesView />;
      case 'insights':
        return <InsightsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <QueryView />;
    }
  };

  return (
    <div className="main-content">
      {renderView()}
    </div>
  );
};

export default MainContent;
