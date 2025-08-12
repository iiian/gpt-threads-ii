import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'katex/dist/katex.min.css';
import './App.css';
import ChatApp from './components/ChatApp';
import ArticlePage from './components/ArticlePage';
import ArticlePageMobile from './components/ArticlePageMobile';

function AutoArticlePage() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    try {
      return window.matchMedia('(max-width: 768px)').matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    try {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch (err) {
      // Safari fallback
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, []);
  return isMobile ? <ArticlePageMobile /> : <ArticlePage />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/demo" replace />} />
        <Route path="/demo" element={<AutoArticlePage />} />
        <Route path="/demo-mobile" element={<ArticlePageMobile />} />
        <Route path="/app" element={<ChatApp />} />
      </Routes>
    </Router>
  );
}


