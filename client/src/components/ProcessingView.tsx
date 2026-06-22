import React from 'react';
import { Loader, X, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function ProcessingView() {
  const { estadoProcesamiento, progresoProcesamiento } = useApp();

  return (
    <div className="processing-view">
      <div className="glass-card processing-card">
        {/* Animated Skeleton */}
        <div className="processing-animation">
          <div className="skeleton-pulse">
            <div className="skeleton-body">
              <div className="skeleton-head" />
              <div className="skeleton-torso" />
              <div className="skeleton-arm skeleton-arm-left" />
              <div className="skeleton-arm skeleton-arm-right" />
              <div className="skeleton-leg skeleton-leg-left" />
              <div className="skeleton-leg skeleton-leg-right" />
            </div>
          </div>
          <div className="scan-line" />
        </div>

        {/* Progress Info */}
        <div className="processing-info">
          <Loader size={24} className="spin" />
          <h2 className="processing-title">{estadoProcesamiento}</h2>

          {/* Progress Bar */}
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progresoProcesamiento}%` }}
            />
          </div>
          <span className="progress-text">{progresoProcesamiento}%</span>
        </div>

        {/* Privacy Notice */}
        <div className="privacy-notice">
          <Shield size={16} />
          <span>Tu video se procesa localmente. Solo métricas numéricas viajan a la IA.</span>
        </div>
      </div>
    </div>
  );
}
