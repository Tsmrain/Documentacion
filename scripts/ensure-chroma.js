const http = require('http');
const { execSync } = require('child_process');

function checkPort8000() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8000/api/v2/heartbeat', { timeout: 1500 }, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('[Dojo Startup] Verificando estado del Vector Store ChromaDB (Puerto 8000)...');
  
  const isChromaRunning = await checkPort8000();
  
  if (isChromaRunning) {
    console.log('[Dojo Startup] ChromaDB Vector Store activo y respondiendo en http://localhost:8000.');
    return;
  }

  console.log('[Dojo Startup] ChromaDB no detectado en puerto 8000. Verificando disponibilidad de Docker...');
  
  try {
    execSync('docker ps', { stdio: 'ignore' });
    console.log('[Dojo Startup] Docker esta disponible. Iniciando contenedor ChromaDB...');
    execSync('docker run -d -p 8000:8000 chromadb/chroma', { stdio: 'inherit' });
    console.log('[Dojo Startup] Contenedor ChromaDB iniciado en puerto 8000.');
  } catch (error) {
    console.log('[Dojo Startup] Docker no esta disponible o el demonio esta inactivo.');
    console.log('[Dojo Startup] Iniciando sistema en modo Graceful Degradation (HTTP 207 Baseline Fallback activado).');
  }
}

main().catch((err) => {
  console.error('[Dojo Startup] Error durante verificacion de ChromaDB:', err.message);
});
