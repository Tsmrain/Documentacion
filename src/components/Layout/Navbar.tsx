import React from 'react';
import { Video, History, TrendingUp, User, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppView } from '../../models/types';

const navItems: { id: AppView; label: string; icon: React.ReactNode }[] = [
  { id: 'analisis', label: 'Análisis', icon: <Video size={20} /> },
  { id: 'historial', label: 'Historial', icon: <History size={20} /> },
  { id: 'progreso', label: 'Progreso', icon: <TrendingUp size={20} /> },
  { id: 'perfil', label: 'Perfil', icon: <User size={20} /> },
  { id: 'conocimiento', label: 'RAG', icon: <BookOpen size={20} /> },
];

export function Navbar() {
  const { vistaActual, setVistaActual } = useApp();

  return (
    <nav className="navbar">
      {navItems.map(item => (
        <button
          key={item.id}
          id={`nav-${item.id}`}
          className={`navbar-item ${vistaActual === item.id ? 'active' : ''}`}
          onClick={() => setVistaActual(item.id)}
        >
          <span className="navbar-icon">{item.icon}</span>
          <span className="navbar-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
