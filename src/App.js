import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'katex/dist/katex.min.css';
import './App.css';
import ChatApp from './components/ChatApp';
import ArticlePage from './components/ArticlePage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/demo" replace />} />
        <Route path="/demo" element={<ArticlePage />} />
        <Route path="/app" element={<ChatApp />} />
      </Routes>
    </Router>
  );
}


