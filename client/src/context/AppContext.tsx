// ============================================================================
// OpenBJJ - AppContext (Estado Global de la Aplicación)
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SesionEntrenamientoController } from '../controllers/SesionEntrenamientoController';
import { RetrievalAugmentedController } from '../controllers/RetrievalAugmentedController';
import {
  Usuario,
  AnalisisBiomecanico,
  AppView,
  Cinturon,
  FuenteConocimiento
} from '../models/types';

interface AppContextType {
  // Estado
  usuario: Usuario | null;
  vistaActual: AppView;
  analisisActual: AnalisisBiomecanico | null;
  historial: AnalisisBiomecanico[];
  procesando: boolean;
  progresoProcesamiento: number;
  estadoProcesamiento: string;
  error: string | null;
  modoInstructor: boolean;
  usuarios: Usuario[];
  activeUserId: string;

  // Acciones
  setVistaActual: (vista: AppView) => void;
  analyzeVideo: (videoBlob: Blob) => Promise<void>;
  loadHistory: () => Promise<void>;
  deleteAnalysis: (id: number) => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  clearError: () => void;
  clearAnalisisActual: () => void;
  toggleModoInstructor: (pin: string) => boolean;
  setAnalisisActual: (analisis: AnalisisBiomecanico | null) => void;
  switchUser: (id: string) => Promise<void>;
  createUser: (nombre: string) => Promise<void>;

  // RAG
  ragController: RetrievalAugmentedController;
  sessionController: SesionEntrenamientoController;
}

const AppContext = createContext<AppContextType | null>(null);

const INSTRUCTOR_PIN = '1234'; // PIN por defecto almacenado en localStorage

export function AppProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [vistaActual, setVistaActual] = useState<AppView>('analisis');
  const [analisisActual, setAnalisisActual] = useState<AnalisisBiomecanico | null>(null);
  const [historial, setHistorial] = useState<AnalisisBiomecanico[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [progresoProcesamiento, setProgresoProcesamiento] = useState(0);
  const [estadoProcesamiento, setEstadoProcesamiento] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modoInstructor, setModoInstructor] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [activeUserId, setActiveUserId] = useState<string>(() => localStorage.getItem('openbjj_active_user_id') || 'default');

  const [sessionController] = useState(() => new SesionEntrenamientoController());
  const [ragController] = useState(() => new RetrievalAugmentedController());

  // Cargar lista de usuarios y el usuario activo
  const loadUsersList = useCallback(async () => {
    try {
      const list = await sessionController.listUsers();
      setUsuarios(list);
    } catch (err) {
      console.error('Error cargando lista de usuarios:', err);
    }
  }, [sessionController]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await sessionController.getUser(activeUserId);
        setUsuario(user);
        await loadUsersList();
      } catch (err) {
        console.error('Error cargando usuario:', err);
      }
    };
    loadUser();
  }, [sessionController, activeUserId, loadUsersList]);

  // Analizar video (CU01)
  const analyzeVideo = useCallback(async (videoBlob: Blob) => {
    try {
      setProcesando(true);
      setError(null);
      setProgresoProcesamiento(0);
      setEstadoProcesamiento('Iniciando análisis...');

      const result = await sessionController.analyzeVideo(
        videoBlob,
        activeUserId,
        (stage, progress) => {
          setEstadoProcesamiento(stage);
          setProgresoProcesamiento(progress);
        }
      );

      setAnalisisActual(result);
      setVistaActual('analisis'); // Mostrar resultado
      await loadHistory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setProcesando(false);
    }
  }, [sessionController, activeUserId]);

  // Cargar historial
  const loadHistory = useCallback(async () => {
    try {
      const history = await sessionController.getHistory(activeUserId);
      setHistorial(history);
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  }, [sessionController, activeUserId]);

  // Eliminar análisis (CP05)
  const deleteAnalysis = useCallback(async (id: number) => {
    try {
      await sessionController.deleteAnalysis(id);
      await loadHistory();
    } catch (err) {
      console.error('Error eliminando análisis:', err);
    }
  }, [sessionController, loadHistory]);

  // Actualizar perfil (CU04)
  const updateProfile = useCallback(async (data: any) => {
    try {
      const updatedUser = await sessionController.updateUserProfile(data, activeUserId);
      setUsuario(updatedUser);
      await loadUsersList();
    } catch (err) {
      console.error('Error actualizando perfil:', err);
    }
  }, [sessionController, activeUserId, loadUsersList]);

  // Cambiar practicante
  const switchUser = useCallback(async (id: string) => {
    localStorage.setItem('openbjj_active_user_id', id);
    setActiveUserId(id);
    setAnalisisActual(null);
  }, []);

  // Crear nuevo practicante
  const createUser = useCallback(async (nombre: string) => {
    const slug = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const id = slug || `user-${Date.now()}`;
    try {
      await sessionController.getUser(id);
      await sessionController.updateUserProfile({ nombre }, id);
      await loadUsersList();
      localStorage.setItem('openbjj_active_user_id', id);
      setActiveUserId(id);
      setAnalisisActual(null);
    } catch (err) {
      console.error('Error creando practicante:', err);
    }
  }, [sessionController, loadUsersList]);

  // Modo instructor (PIN local)
  const toggleModoInstructor = useCallback((pin: string): boolean => {
    const storedPin = localStorage.getItem('openbjj_instructor_pin') || INSTRUCTOR_PIN;
    if (pin === storedPin) {
      setModoInstructor(prev => !prev);
      return true;
    }
    return false;
  }, []);

  const value: AppContextType = {
    usuario,
    vistaActual,
    analisisActual,
    historial,
    procesando,
    progresoProcesamiento,
    estadoProcesamiento,
    error,
    modoInstructor,
    usuarios,
    activeUserId,
    setVistaActual,
    analyzeVideo,
    loadHistory,
    deleteAnalysis,
    updateProfile,
    clearError: () => setError(null),
    clearAnalisisActual: () => setAnalisisActual(null),
    setAnalisisActual,
    toggleModoInstructor,
    switchUser,
    createUser,
    ragController,
    sessionController
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return context;
}
