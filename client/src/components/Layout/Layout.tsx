import React, { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-logo">
            <span className="logo-icon">🥋</span>
            <h1 className="logo-text">OpenBJJ</h1>
          </div>
          <p className="header-subtitle">Tutor Biomecánico Adaptativo</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {children}
      </main>

      {/* Bottom Navbar */}
      <Navbar />
    </div>
  );
}
