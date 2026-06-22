import React, { useState, useEffect } from 'react';
import { User, Save, Ruler, Weight, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Cinturon } from '../models/types';

export function BiomechanicalProfile() {
  const { usuario, updateProfile } = useApp();
  const [nombre, setNombre] = useState('');
  const [cinturon, setCinturon] = useState<Cinturon>(Cinturon.Blanco);
  const [altura, setAltura] = useState(1.75);
  const [peso, setPeso] = useState(75);
  const [longitudBrazos, setLongitudBrazos] = useState(75);
  const [longitudPiernas, setLongitudPiernas] = useState(85);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre);
      setCinturon(usuario.cinturon);
      if (usuario.perfilBiomecanico) {
        setAltura(usuario.perfilBiomecanico.altura);
        setPeso(usuario.perfilBiomecanico.peso);
        setLongitudBrazos(usuario.perfilBiomecanico.longitudBrazos);
        setLongitudPiernas(usuario.perfilBiomecanico.longitudPiernas);
      }
    }
  }, [usuario]);

  const handleSave = async () => {
    await updateProfile({
      nombre,
      cinturon,
      altura,
      peso,
      longitudBrazos,
      longitudPiernas
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getBeltColor = (c: Cinturon) => {
    switch (c) {
      case Cinturon.Blanco: return '#ffffff';
      case Cinturon.Azul: return '#2563eb';
      case Cinturon.Morado: return '#7c3aed';
      case Cinturon.Marron: return '#92400e';
      case Cinturon.Negro: return '#1a1a2e';
    }
  };

  return (
    <div className="biomechanical-profile">
      <h2 className="section-title">
        <User size={22} />
        Perfil Biomecánico
      </h2>

      {/* Identidad */}
      <div className="glass-card profile-identity-card">
        <div className="belt-display" style={{ borderColor: getBeltColor(cinturon) }}>
          <div
            className="belt-bar"
            style={{ backgroundColor: getBeltColor(cinturon) }}
          />
          <span className="belt-name">{cinturon}</span>
        </div>

        <div className="form-group">
          <label className="form-label">Nombre</label>
          <input
            type="text"
            className="form-input"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Cinturón</label>
          <select
            className="form-select"
            value={cinturon}
            onChange={e => setCinturon(e.target.value as Cinturon)}
          >
            {Object.values(Cinturon).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Datos Antropométricos */}
      <div className="glass-card anthropo-card">
        <h3 className="card-title">
          <Ruler size={18} />
          Datos Antropométricos
        </h3>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Altura (m)</label>
            <input
              type="number"
              className="form-input"
              value={altura}
              onChange={e => setAltura(parseFloat(e.target.value) || 0)}
              min="0.5"
              max="2.5"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Peso (kg)</label>
            <input
              type="number"
              className="form-input"
              value={peso}
              onChange={e => setPeso(parseFloat(e.target.value) || 0)}
              min="20"
              max="200"
              step="0.5"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Envergadura (cm)</label>
            <input
              type="number"
              className="form-input"
              value={longitudBrazos}
              onChange={e => setLongitudBrazos(parseFloat(e.target.value) || 0)}
              min="30"
              max="120"
              step="0.5"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Long. Piernas (cm)</label>
            <input
              type="number"
              className="form-input"
              value={longitudPiernas}
              onChange={e => setLongitudPiernas(parseFloat(e.target.value) || 0)}
              min="30"
              max="130"
              step="0.5"
            />
          </div>
        </div>
      </div>

      {/* Movilidad Info */}
      <div className="glass-card mobility-card">
        <h3 className="card-title">
          <Activity size={18} />
          Movilidad Articular
        </h3>
        <p className="mobility-description">
          Los rangos de movilidad se calibran automáticamente durante el test interactivo con cámara
          o se asignan valores por defecto basados en promedios anatómicos estándar.
        </p>
        {usuario?.perfilBiomecanico?.rangoMovilidadArticular && (
          <div className="mobility-grid">
            {Object.entries(usuario.perfilBiomecanico.rangoMovilidadArticular).map(([art, range]) => (
              <div key={art} className="mobility-item">
                <span className="mobility-name">{art}</span>
                <div className="mobility-range">
                  <span>{range.min}°</span>
                  <div className="mobility-bar">
                    <div
                      className="mobility-fill"
                      style={{ width: `${(range.max / 180) * 100}%` }}
                    />
                  </div>
                  <span>{range.max}°</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        className={`btn btn-primary btn-lg btn-save ${saved ? 'saved' : ''}`}
        onClick={handleSave}
      >
        <Save size={20} />
        {saved ? '¡Guardado!' : 'Guardar Perfil'}
      </button>
    </div>
  );
}
