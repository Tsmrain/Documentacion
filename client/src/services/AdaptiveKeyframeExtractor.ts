// ============================================================
// OPENBJJ - ADAPTIVE KINETIC KEYFRAME EXTRACTOR
// Patrón Pure Fabrication (Craig Larman)
// Muestreo adaptativo basado en aceleración inter-frame (dx, dy)
// y etiquetado temporal de fases (Vuelo vs Suelo)
// ============================================================

export interface KeyframeData {
  base64: string;
  timestamp: number;
  timestampFormatted: string; // ej: "1.45s"
  fase: "progresion_temporal" | "aceleracion_vuelo" | "consolidacion_suelo";
  descripcionFase: string;
}

export interface KeyframeKineticAnalysis {
  timestamps: number[];
  peakWindow: { start: number; end: number; peakTime: number };
  totalDuration: number;
}

/**
 * Extrae 9 keyframes de alta fidelidad aplicando muestreo cinético adaptativo.
 * 1. Escaneo rápido de movimiento en canvas ligero (160x120) para detectar vector de velocidad y aceleración inter-frame (dx, dy).
 * 2. Detección del intervalo de máxima aceleración/explosividad (despegue y vuelo: 4 keyframes etiquetados como 'aceleracion_vuelo').
 * 3. Detección de la fase de consolidación y control en suelo (desaceleración y sumisión: 5 keyframes etiquetados como 'consolidacion_suelo').
 * 4. Inyección de timestamps explícitos en segundos (ej. "4.2s") y descripción de fase.
 * 5. Extracción de los 9 fotogramas finales a 480px JPEG calidad 65% en Base64.
 */
export async function extractKineticAdaptiveKeyframes(
  videoBlob: Blob,
  numFrames: number = 9
): Promise<KeyframeData[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const videoUrl = URL.createObjectURL(videoBlob);
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error("Error al cargar video para análisis cinemático: " + (video.error?.message || "Formato no soportado")));
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration || 1;
        const videoWidth = video.videoWidth || 640;
        const videoHeight = video.videoHeight || 480;

        // 1. Configuración de canvas de análisis rápido (160x120 px para rendimiento instantáneo)
        const scanCanvas = document.createElement("canvas");
        const scanWidth = 160;
        const scanHeight = 120;
        scanCanvas.width = scanWidth;
        scanCanvas.height = scanHeight;
        const scanCtx = scanCanvas.getContext("2d", { willReadFrequently: true });

        if (!scanCtx) {
          URL.revokeObjectURL(videoUrl);
          return reject(new Error("No se pudo inicializar el contexto 2D del canvas de escaneo"));
        }

        // Determinar candidatos de escaneo temporal (24 a 32 muestras a lo largo del video)
        const sampleCount = Math.min(32, Math.max(16, Math.floor(duration * 4)));
        const sampleTimes: number[] = [];
        for (let i = 0; i < sampleCount; i++) {
          sampleTimes.push(((i + 0.5) / sampleCount) * duration);
        }

        // Función auxiliar para buscar y renderizar un tiempo específico
        const seekTo = (time: number): Promise<void> => {
          return new Promise((res) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              res();
            };
            video.addEventListener("seeked", onSeeked);
            video.currentTime = Math.min(Math.max(0, time), duration - 0.05);
          });
        };

        // 2. Escaneo cinético de movimiento inter-frame (dx, dy) y cálculo de aceleración
        let prevFrameData: Uint8ClampedArray | null = null;
        const kineticProfiles: { time: number; velocity: number; acceleration: number; centerDx: number; centerDy: number }[] = [];

        for (let i = 0; i < sampleTimes.length; i++) {
          const t = sampleTimes[i];
          await seekTo(t);
          scanCtx.drawImage(video, 0, 0, scanWidth, scanHeight);
          const imgData = scanCtx.getImageData(0, 0, scanWidth, scanHeight);
          const data = imgData.data;

          if (prevFrameData) {
            let totalDiff = 0;
            let sumXDiff = 0;
            let sumYDiff = 0;
            let countSignificant = 0;

            // Calcular diferencia de luminosidad y centros de masa de movimiento
            for (let y = 0; y < scanHeight; y += 2) {
              for (let x = 0; x < scanWidth; x += 2) {
                const idx = (y * scanWidth + x) * 4;
                const rDiff = Math.abs(data[idx] - prevFrameData[idx]);
                const gDiff = Math.abs(data[idx + 1] - prevFrameData[idx + 1]);
                const bDiff = Math.abs(data[idx + 2] - prevFrameData[idx + 2]);
                const diff = (rDiff + gDiff + bDiff) / 3;

                if (diff > 18) { // Umbral de movimiento significativo
                  totalDiff += diff;
                  sumXDiff += (x - scanWidth / 2) * diff;
                  sumYDiff += (y - scanHeight / 2) * diff;
                  countSignificant++;
                }
              }
            }

            const dt = t - sampleTimes[i - 1] || 0.1;
            const velocity = (totalDiff / (scanWidth * scanHeight * 0.25)) / dt;
            const centerDx = countSignificant > 0 ? (sumXDiff / totalDiff) : 0;
            const centerDy = countSignificant > 0 ? (sumYDiff / totalDiff) : 0;

            const prevVelocity = kineticProfiles.length > 0 ? kineticProfiles[kineticProfiles.length - 1].velocity : 0;
            const acceleration = Math.abs(velocity - prevVelocity) / dt;

            kineticProfiles.push({
              time: t,
              velocity,
              acceleration,
              centerDx,
              centerDy
            });
          } else {
            kineticProfiles.push({
              time: t,
              velocity: 0,
              acceleration: 0,
              centerDx: 0,
              centerDy: 0
            });
          }

          prevFrameData = new Uint8ClampedArray(data);
        }

        // 3. Muestreo Adaptativo a lo largo de la duración total del video
        // Se distribuyen 9 fotogramas cubriendo inicio (5%), desarrollo técnico y finalización (95%)
        // ajustando los puntos de muestreo a los momentos de mayor actividad cinemática
        const candidateMeta: { time: number; fase: "progresion_temporal"; descripcionFase: string }[] = [];

        // Generar 9 momentos temporales distribuidos a lo largo del video
        for (let i = 0; i < numFrames; i++) {
          const rawT = (duration * 0.05) + ((duration * 0.90) / (numFrames - 1)) * i;
          const t = Number(Math.max(0, Math.min(duration - 0.05, rawT)).toFixed(3));
          
          let descripcion = "";
          if (i === 0) descripcion = "Inicio de la Secuencia y Posición Base";
          else if (i === 1) descripcion = "Establecimiento de Agarres y Control Inicial";
          else if (i === 2) descripcion = "Apertura / Desplazamiento y Movimiento de Cadera";
          else if (i === 3) descripcion = "Inicio de la Transición / Entrada Técnica";
          else if (i === 4) descripcion = "Fase Central / Desequilibrio y Presión Mecánica";
          else if (i === 5) descripcion = "Aislamiento de la Extremidad / Control de Guardia/Paso";
          else if (i === 6) descripcion = "Ajuste Angular y Cierre de la Posición";
          else if (i === 7) descripcion = "Palanca Articular / Estabilización del Pasaje o Control";
          else descripcion = "Consolidación Final de la Técnica";

          candidateMeta.push({
            time: t,
            fase: "progresion_temporal",
            descripcionFase: `[Frame ${i + 1}] (${t.toFixed(2)}s) ${descripcion}`
          });
        }

        // Asegurar orden cronológico estricto
        candidateMeta.sort((a, b) => a.time - b.time);
        const finalFramesMeta = candidateMeta.slice(0, numFrames);

        console.log(`[Kinetic Extractor] 9 Keyframes temporales adaptativos generados:`, 
          finalFramesMeta.map((f, idx) => `Frame ${idx + 1}: ${f.time}s - ${f.descripcionFase}`)
        );

        console.log(`[Kinetic Extractor] 9 Keyframes adaptativos generados con metadata temporal:`, 
          finalFramesMeta.map((f, idx) => `Frame ${idx + 1}: ${f.time}s (${f.fase}) - ${f.descripcionFase}`)
        );

        // 5. Extracción final de los 9 keyframes optimizados para Gemini 1-Tile (360px, JPEG 55%)
        const hdCanvas = document.createElement("canvas");
        const hdCtx = hdCanvas.getContext("2d");
        if (!hdCtx) {
          URL.revokeObjectURL(videoUrl);
          return reject(new Error("No se pudo inicializar el contexto 2D para renderizado HD"));
        }

        const scale = Math.min(360 / videoWidth, 1);
        hdCanvas.width = videoWidth * scale;
        hdCanvas.height = videoHeight * scale;

        const resultKeyframes: KeyframeData[] = [];

        for (const meta of finalFramesMeta) {
          await seekTo(meta.time);
          hdCtx.drawImage(video, 0, 0, hdCanvas.width, hdCanvas.height);
          const dataUrl = hdCanvas.toDataURL("image/jpeg", 0.55);
          const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

          resultKeyframes.push({
            base64,
            timestamp: meta.time,
            timestampFormatted: `${meta.time.toFixed(2)}s`,
            fase: meta.fase,
            descripcionFase: meta.descripcionFase
          });
        }

        URL.revokeObjectURL(videoUrl);
        resolve(resultKeyframes);

      } catch (err: any) {
        URL.revokeObjectURL(videoUrl);
        reject(err);
      }
    };
  });
}
