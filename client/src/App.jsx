import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SocietyDetailPage from './pages/SocietyDetailPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/societies/:id" element={<SocietyDetailPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

