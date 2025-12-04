import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight, Shield, Zap, ExternalLink, Terminal, Activity } from 'lucide-react';
import { NavItem } from '../types';

const NAV_ITEMS: NavItem[] = [
  { label: 'Architecture', path: '/architecture' },
  { label: 'Use Cases', path: '/use-cases' },
  { label: 'Manual', path: '/how-it-works' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative bg-background text-textMain selection:bg-primary selection:text-black overflow-x-hidden">
      {/* Background Layers */}
      <div className="fixed inset-0 z-0 bg-radial-spotlight opacity-80 pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-[size:40px_40px] bg-grid-pattern opacity-20 pointer-events-none" />

      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b ${
          isScrolled ? 'bg-black/90 backdrop-blur-sm border-white/20' : 'bg-transparent border-transparent'
        }`}
      >
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-primary flex items-center justify-center border-2 border-primary group-hover:bg-black group-hover:text-primary transition-colors">
               <Terminal className="w-5 h-5 text-black group-hover:text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl leading-none text-white tracking-wider">ARC<span className="text-textMuted">_SILENCE</span></span>
              <span className="text-[10px] text-primary uppercase tracking-[0.2em] leading-none">Protocol v1.0</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 text-sm font-mono uppercase tracking-widest transition-all duration-200 border border-transparent hover:border-white/20 ${
                  location.pathname === item.path ? 'text-primary border-primary/30 bg-primary/5' : 'text-textMuted hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] text-textMuted uppercase font-mono border-r border-white/10 pr-6">
              <div className="w-2 h-2 bg-primary animate-pulse" />
              <span>System Optimal</span>
            </div>
            <button 
              onClick={() => navigate('/trade')}
              className="bg-white text-black hover:bg-primary hover:text-black border-2 border-white hover:border-primary px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center gap-2"
            >
              [ Launch_Terminal ]
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white border border-white/20 p-2 hover:bg-white/10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black pt-24 px-6 md:hidden border-l border-white/10">
          <div className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className="text-xl font-display uppercase tracking-wider text-left text-white border-b border-white/10 py-4 hover:text-primary hover:pl-2 transition-all"
              >
                {item.label}
              </button>
            ))}
             <button 
              onClick={() => {
                navigate('/trade');
                setMobileMenuOpen(false);
              }}
              className="mt-8 bg-primary text-black border-2 border-primary px-6 py-4 text-lg font-bold uppercase flex justify-center items-center gap-2"
            >
              Launch Terminal
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-grow pt-24 z-10 relative px-6 w-full max-w-[1920px] mx-auto">
        {children}
      </main>

      {/* Footer */}
      {location.pathname !== '/trade' && (
        <footer className="border-t border-white/10 bg-black/50 relative z-10 mt-20">
          <div className="w-full max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Terminal className="w-6 h-6 text-primary" />
                  <span className="font-display text-xl text-white">ARC_SILENCE</span>
                </div>
                <p className="text-textMuted font-mono text-sm max-w-sm leading-relaxed border-l-2 border-primary/20 pl-4">
                  Privacy-preserving dark pool for DAO treasuries. 
                  Encrypted order flow execution via Arcium MPC.
                </p>
              </div>
              
              <div>
                <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6 border-b border-white/10 pb-2 inline-block">System</h4>
                <ul className="space-y-3 font-mono text-sm">
                  <li><button onClick={() => navigate('/architecture')} className="text-textMuted hover:text-primary uppercase">Architecture</button></li>
                  <li><button onClick={() => navigate('/use-cases')} className="text-textMuted hover:text-primary uppercase">Use Cases</button></li>
                  <li><button onClick={() => navigate('/trade')} className="text-textMuted hover:text-primary uppercase">Terminal</button></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6 border-b border-white/10 pb-2 inline-block">Protocol</h4>
                <ul className="space-y-3 font-mono text-sm">
                  <li><a href="#" className="text-textMuted hover:text-primary uppercase">Docs</a></li>
                  <li><a href="#" className="text-textMuted hover:text-primary uppercase">Github</a></li>
                  <li><a href="#" className="text-textMuted hover:text-primary uppercase">Audits</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase font-mono text-textMuted">
              <p>COPYRIGHT © 2024 ARCSILENCE. SYSTEM STATUS: NOMINAL.</p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <span className="flex items-center gap-2"><Shield className="w-3 h-3" /> SECURED_BY_MPC</span>
                <span className="flex items-center gap-2"><Zap className="w-3 h-3" /> SOLANA_NETWORK</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};