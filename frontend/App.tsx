import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { UseCasesPage } from './pages/UseCasesPage';
import { TradePage } from './pages/TradePage';
import { HowItWorksPage } from './pages/HowItWorksPage';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  return (
    <Router>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/use-cases" element={<UseCasesPage />} />
          <Route path="/trade" element={<TradePage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
