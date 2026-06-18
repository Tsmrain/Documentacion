import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout/Layout';
import { VideoUploader } from './components/VideoUploader';
import { TacticalReport } from './components/TacticalReport';
import { HistoryView } from './components/HistoryView';
import { ProgressDashboard } from './components/ProgressDashboard';
import { BiomechanicalProfile } from './components/BiomechanicalProfile';
import { KnowledgeManager } from './components/KnowledgeManager';

function AppContent() {
  const { vistaActual, analisisActual } = useApp();

  const renderView = () => {
    switch (vistaActual) {
      case 'analisis':
        if (analisisActual) return <TacticalReport />;
        return <VideoUploader />;
      case 'historial':
        return <HistoryView />;
      case 'progreso':
        return <ProgressDashboard />;
      case 'perfil':
        return <BiomechanicalProfile />;
      case 'conocimiento':
        return <KnowledgeManager />;
      default:
        return <VideoUploader />;
    }
  };

  return (
    <Layout>
      {renderView()}
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
