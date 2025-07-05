import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ClarityAI from './components/ClarityAI';
import NotFound from './components/NotFound';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ClarityAI />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
