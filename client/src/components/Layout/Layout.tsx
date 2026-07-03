import React, { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { useApp } from '../../context/AppContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { usuarios, activeUserId, switchUser, createUser } = useApp();

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-logo">
            <span className="logo-icon">🥋</span>
            <h1 className="logo-text">OpenBJJ</h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Alumno:</span>
            <select 
              value={activeUserId}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  const name = prompt('Nombre del nuevo alumno / luchador:');
                  if (name && name.trim()) {
                    createUser(name.trim());
                  }
                } else {
                  switchUser(e.target.value);
                }
              }}
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {usuarios.map(u => (
                <option key={u.id} value={u.id} style={{ background: 'var(--bg-tertiary)' }}>
                  {u.nombre}
                </option>
              ))}
              <option value="__new__" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                ➕ Agregar Alumno...
              </option>
            </select>
          </div>
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
