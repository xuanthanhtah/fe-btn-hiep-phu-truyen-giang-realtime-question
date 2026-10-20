import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataErrorBoundary } from './components/DataErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import { HostPage } from './pages/HostPage';
import { PresenterPage } from './pages/PresenterPage';
import { ParticipantPage } from './pages/ParticipantPage';

export const App: React.FC = () => {
  return (
    <DataErrorBoundary fallbackTitle="Application Error">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/host/:roomId" element={<HostPage />} />
          <Route path="/present/:roomId" element={<PresenterPage />} />
          <Route path="/join/:roomId" element={<ParticipantPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </DataErrorBoundary>
  );
};

export default App;
