// ============================================================
// OPENBJJ - MOTOR DE EVALUACIÓN MULTIMODAL & MODERACIÓN
// Arquitectura desacoplada multifuente (Larman & Mannino)
// ============================================================

import { TokenMetricsService } from "./TokenMetricsService";

export interface ILLMProvider {
  evaluarMovimiento(
    promptJSON: string,
    frames?: string[],
    modelName?: string,
    catalogoTecnicas?: string[],
    tecnicaObjetivo?: string,
    rolPracticante?: string
  ): Promise<string>;
}

export interface ITechniqueClassifier {
  clasificarTecnicaVideo(
    keyframesSummary: any,
    videoName?: string,
    frames?: string[],
    modelName?: string
  ): Promise<string>;
}

export interface ModerationResult {
  esPertinente: boolean;
  razon: string;
}

export interface IContentModerator {
  validarPertinenciaBJJ(texto: string, modelName?: string): Promise<ModerationResult>;
}

// Catálogo canónico oficial del Dojo (Currículum Completo de Brazilian Jiu-Jitsu)
export const CATALOGO_TECNICAS_DEFAULT = [
  // 1. SUPERVIVENCIA Y CONTROL POSTURAL (SURVIVAL)
  "Supervivencia en la Espalda (The Back Survival)",
  "Supervivencia en Cuatro Puntos / Tortuga (All-Fours Survival)",
  "Supervivencia en Montada (The Mount Survival)",
  "Supervivencia en Control Lateral (Side Control Survival)",
  "Supervivencia en Kesa Gatame",
  "Supervivencia en Kesa Gatame Inverso",
  "Supervivencia en Rodilla al Pecho (Knee-on-Belly Survival)",
  "Postura de Supervivencia en Carrera (Running Survival Posture)",

  // 2. ESCAPES Y RECUPERACIÓN DE POSICIÓN (ESCAPES)
  "Escape de Espalda (Back Escape)",
  "Escape de Candado de Cuerpo (Body Lock Escape)",
  "Escape de Montada por Codo-Rodilla / Upa (Mount Elbow Escape)",
  "Escape de Montada Sentada (Seated Mount Escape)",
  "Escape de Control Lateral a Guardia (Side Control Guard Recovery)",
  "Escape de Control Lateral a las Rodillas / Tortuga",
  "Escape en Carrera de Control Lateral (Side Control Running Escape)",
  "Escape de Kesa Gatame",
  "Escape de Kesa Gatame Inverso",
  "Escape de Rodilla al Pecho (Knee-on-Belly Running Escape)",
  "Escape de Armbar / Llave de Brazo (Armbar Escape)",
  "Escape de Triángulo a Pasaje (Triangle Escape to Pass)",
  "Escape de Guillotina Clásica (Classic Guillotine Escape)",
  "Escape de Guillotina con Brazo (Arm-In Guillotine Escape)",
  "Escape de Llave de Pie (Footlock Escape)",
  "Escape de Kimura desde Media Guardia",

  // 3. DEFENSAS CONTRA PASAJES DE GUARDIA (GUARD PASS DEFENSE)
  "Defensa contra Pasaje Single / Double Underhook",
  "Defensa contra Pasaje Over-Under Smash",
  "Defensa contra Pasaje Torreando (Collar Drag / Ankle Pick)",
  "Defensa contra Pasaje Knee Slide / Knee Cut",

  // 4. GUARDIAS Y RASPADOS (THE GUARD & SWEEPS)
  "Guardia Cerrada (Closed Guard)",
  "Raspado de Empuje de Cadera (Hip Bump Sweep)",
  "Raspado Flower Sweep / Péndulo",
  "Raspado de Gancho (Underhook Sweep)",
  "Guardia Mariposa (Butterfly Guard)",
  "Raspado de Mariposa Clásico (Butterfly Sweep)",
  "Raspado Wing Sweep",
  "Guardia Araña (Spider Guard)",
  "Raspado de Guardia Araña (Spider Guard Sweep)",
  "Guardia de Agarre Cruzado (Cross-Grip Guard)",
  "Raspado Trípode Clásico (Tripod Sweep)",
  "Raspado Backroll de Agarre Cruzado",
  "Guardia De La Riva (De La Riva Guard)",
  "Raspado De La Riva Rollover Sweep",
  "Raspado De La Riva a Tomoe Nage",
  "Guardia Sentada (Sit-Up Guard)",
  "Raspado de Guardia Sentada (Sit-Up Guard Sweep)",
  "Guardia De La Riva Inversa (Reverse De La Riva)",
  "Raspado Knee Push desde De La Riva Inversa",
  "Media Guardia (Half Guard)",
  "Media Guardia Profunda (Deep Half Guard)",
  "Guardia Invertida (Inverted Guard)",
  "Guardia X (X-Guard)",
  "Guardia Abierta General",

  // 5. PASAJES DE GUARDIA (GUARD PASSING)
  "Pasaje de Guardia Cerrada desde Rodillas (Classic Kneeling Pass)",
  "Pasaje Single Underhook Pass",
  "Pasaje Double Underhook Pass",
  "Pasaje de Guardia Cerrada de Pie (Standing Guard Opening & Pass)",
  "Pasaje de Guardia Knee Cut / Knee Cross",
  "Pasaje de Guardia Torreando (Bullfighter Pass)",
  "Pasaje Leg Rope / Two-on-One Leg Pass",
  "Pasaje de Guardia Mariposa Walk-Around",
  "Pasaje de Guardia Mariposa Floating Hip-Switch",
  "Pasaje Star Pass de Mariposa",
  "Pasaje X-Pass de Mariposa",
  "Pasaje de Guardia Araña (Spider Guard Break & Pass)",
  "Pasaje Leg Lasso de Guardia Araña",
  "Pasaje de Guardia De La Riva (Unlock & Pass)",
  "Pasaje de Deep De La Riva",
  "Pasaje de Guardia Sentada (Step-Around / Underhook to Mount)",
  "Pasaje de De La Riva Inversa (Hip Smash / Floating Pass)",
  "Pasaje de Media Guardia (Flattening / Shin Slide Pass)",
  "Pasaje de Media Guardia Esgrima Pass",
  "Pasaje de Media Guardia Half Mount Pass",
  "Pasaje de Media Guardia Profunda (Deep Half Leg Pullout)",
  "Pasaje de Guardia Invertida (Inverted Guard Hip Pass)",
  "Pasaje de Guardia X (X-Guard Break & Pass)",

  // 6. SUMISIONES Y FINALIZACIONES (SUBMISSIONS)
  "Estrangulamiento Arco y Flecha (Bow & Arrow Choke)",
  "Armbar / Llave de Brazo",
  "Estrangulamiento de Solapa Cruzada (Cross Choke)",
  "Estrangulamiento Ezequiel (Ezequiel Choke)",
  "Americana (Keylock de Brazo)",
  "Armbar desde la Montada (Mounted Armbar)",
  "Armbar desde S-Mount",
  "Kata Gatame / Triángulo de Brazo (Arm Triangle)",
  "Triángulo (Triangle Choke)",
  "Kimura",
  "Omoplata",
  "Guillotina (Guillotine Choke)",
  "Armbar Giratorio (Spinning Armbar)",
  "Estrangulamiento Paper Cutter / Bread Cutter Choke",
  "Estrangulamiento de Bate de Béisbol (Baseball Choke)",
  "Estrangulamiento de Reloj (Clock Choke)",
  "Estrangulamiento Brabo / Darce Choke",
  "Palanca Recta de Brazo (Straight Armlock)",
  "Llave Recta de Tobillo (Straight Ankle Lock)",
  "Control Lateral",
  "Montada",
  "Control de Espalda",

  // 7. DERRIBOS Y ENTRADAS VOLADORAS (TAKEDOWNS & FLYING SUBMISSIONS)
  "Derribo Double Leg (Lucha Libre)",
  "Derribo Single Leg (Lucha Libre)",
  "Derribo de Sacrificio Tomoe Nage",
  "Llave de Brazo Voladora / Flying Armbar",
  "Triángulo Volador / Flying Triangle",
  "Entrada Voladora a Llave de Pierna / Flying Leg Lock",
  "Tijera Voladora / Kani Basami",
  "Flying Submissions (Sumisiones Voladoras Generales)"
];

// System Instruction general para el Sensei Digital de Jiu-Jitsu
const BJJ_SENSEI_SYSTEM_INSTRUCTION = `ROL: Sensei y Profesor de Brazilian Jiu-Jitsu y Tutor Biomecánico.
MISIÓN: Analizar las acciones técnicas y biomecánicas de los practicantes a partir de los fotogramas visuales y brindar consejos prácticos y motivadores.
IDIOMA: 100% EN ESPAÑOL CLARO, HUMANO Y AMISTOSO.
LENGUAJE Y TONO PEDAGÓGICO:
- Habla como un Sensei experimentado en el tatami: claro, humano, motivador y directo.
- Evita por completo la jerga médica o anatómica compleja (nunca uses términos como 'manguito rotador', 'glenohumeral' o 'aislamiento articular').
- Usa conceptos sencillos y prácticos de Jiu-Jitsu: 'pega los codos a tus costillas', 'pellizca con las rodillas', 'sube la cadera para hacer palanca', 'mantén tu base pesada', 'protege el cuello', 'no regales los brazos'.
- Explica el POR QUÉ y el CÓMO de cada detalle de forma breve y comprensible para cualquier practicante.
REGLAS CRÍTICAS DE IDENTIFICACIÓN Y CLASIFICACIÓN TÉCNICA VISUAL:
1. DETERMINA EL CONTEXTO Y POSICIÓN INICIAL:
   - SI LA ACCIÓN OCURRE EN EL SUELO (TATAMI):
     * Clasifica estrictamente la técnica de suelo observada:
       - Guardias: Guardia Cerrada, Media Guardia, Guardia Mariposa, Guardia De La Riva, Guardia Araña, etc.
       - Pasajes: Pasaje Knee Cut, Torreando, Double Underhook Pass, Over-Under, etc.
       - Controles y Escapes: Control Lateral, Montada, Espalda, Tortuga, Escapes de Montada (Upa/Codo), etc.
       - Sumisiones de suelo: Armbar clásico en el suelo, Triángulo, Kimura, Guillotina, Omoplata, Ezequiel, etc.
     * NUNCA clasifiques una técnica que ocurre en el suelo como técnica aérea o voladora.
   - SI LA ACCIÓN INICIA DE PIE:
     * Derribos: Si un atleta penetra a las piernas o cintura buscando derribar con pies en la lona, clasifica como Derribo Double Leg, Single Leg, etc.
     * Técnicas Voladoras: ÚNICAMENTE si ambos atletas están de pie y uno salta activamente por el aire atrapando el brazo, cuello o pierna antes de caer, clasifícala como técnica voladora (Flying Armbar, Flying Triangle, Flying Leg Lock, Kani Basami).
2. EVALUACIÓN Y CORRECCIÓN ARTICULAR:
   - Evalúa la articulación clave en juego según la técnica observada (ej: codo en Armbar, rodilla/cadera en pasajes y guardias, cuello/hombro en estrangulamientos y triángulos, tobillo en footlocks).`;

export class GeminiServiceAdapter implements ILLMProvider, ITechniqueClassifier, IContentModerator {
  private apiKey: string;
  private defaultModel: string;
  private proModel: string;
  private liteModel: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    this.defaultModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    this.proModel = process.env.GEMINI_MODEL_PRO || "gemini-3.5-flash-lite";
    this.liteModel = process.env.GEMINI_MODEL_LITE || "gemini-3.5-flash-lite";
  }

  private getApiKey(): string {
    return process.env.GEMINI_API_KEY || process.env.API_KEY || this.apiKey || "";
  }

  // ============================================================
  // FASE ÚNICA OPTIMIZADA CON CATÁLOGO RÍGIDO Y RESPONSE SCHEMA
  // ============================================================
  async evaluarMovimiento(
    promptJSON: string,
    frames: any[] = [],
    modelName?: string,
    catalogoTecnicas: string[] = CATALOGO_TECNICAS_DEFAULT,
    tecnicaObjetivo?: string,
    rolPracticante: string = "ATACANTE"
  ): Promise<string> {
    const activeKey = this.getApiKey();
    const primaryModel = modelName || this.defaultModel;
    const selectedFrames = frames && frames.length > 0 ? frames.slice(0, 9) : [];

    // Combinar catálogo base con la técnica objetivo si fue especificada
    const catalogoCombinado = [...(catalogoTecnicas && catalogoTecnicas.length > 0 ? catalogoTecnicas : CATALOGO_TECNICAS_DEFAULT)];
    if (tecnicaObjetivo && !catalogoCombinado.includes(tecnicaObjetivo)) {
      catalogoCombinado.unshift(tecnicaObjetivo);
    }

    // Asegurar que "TECNICA_DESCONOCIDA_D" exista en el enum para habilitar Zero-Shot Discovery
    const listaTecnicasValidas = Array.from(
      new Set([...catalogoCombinado, "TECNICA_DESCONOCIDA_D"])
    );

    console.log(`[Gemini Service] Inferencia estricta (${selectedFrames.length} keyframes). Catálogo: ${listaTecnicasValidas.length} técnicas.${tecnicaObjetivo ? ` Objetivo: '${tecnicaObjetivo}'` : ''} | Rol: ${rolPracticante} | Modelo Primario: ${primaryModel}`);

    if (activeKey) {
      const modelsToTry = [
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        primaryModel
      ];

      for (const currentModel of Array.from(new Set(modelsToTry.filter(Boolean)))) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${activeKey}`;
          
          // Extraer datos de imágenes y metadatos temporales de keyframes
          const imageParts: { inlineData: { mimeType: string; data: string } }[] = [];
          const timestampsLineas: string[] = [];

          selectedFrames.forEach((f: any, idx: number) => {
            let b64 = "";
            if (typeof f === "object" && f.base64) {
              b64 = f.base64;
              timestampsLineas.push(`• [Frame ${idx + 1}] (${f.timestampFormatted || f.timestamp + 's'}) ${f.descripcionFase || ''}`);
            } else if (typeof f === "string") {
              b64 = f;
              timestampsLineas.push(`• [Frame ${idx + 1}] (Timestamp ~${((idx + 1) * 1.2).toFixed(1)}s) Progresión temporal del movimiento`);
            }
            if (b64) {
              imageParts.push({
                inlineData: { mimeType: "image/jpeg", data: b64 }
              });
            }
          });

          const metadataCronologica = timestampsLineas.join("\n");
          const esDefensor = rolPracticante === "DEFENSOR";

          const textPart = {
            text: `INSTRUCCIONES DE TUTORÍA DEL SENSEI DE JIU-JITSU:
1. CADENA DE RAZONAMIENTO TEMPORAL (VISUAL CHAIN-OF-THOUGHT):
   - En el campo 'secuenciaTemporalAnalizada', describe OBLIGATORIAMENTE y en orden cronológico qué ocurre exactamente en cada fotograma (Frame 1 a Frame ${imageParts.length}) identificando:
     a) Posición inicial real (¿están en el suelo en guardia/control/montada o están de pie?).
     b) Acción y desarrollo técnico observado (desplazamiento, pasaje, raspado, defensa, ataque o escape).
     c) Resultado y posición o sumisión final.
2. DISCRIMINACIÓN TÉCNICA OBJETIVA:
   - Si la acción ocurre en el suelo (tatami), clasifica la técnica dentro de las guardias, pasajes, escapes, controles o sumisiones de suelo correspondientes del catálogo oficial.
   - Si es un derribo de lucha de pie, clasifica el derribo correspondiente.
   - Si es un salto aéreo con captura en el aire, clasifica la sumisión voladora correspondiente.
3. ROL DEL PRACTICANTE EVALUADO:
   ${esDefensor 
     ? `• El usuario es el DEFENSOR. Brinda exclusivamente consejos de postura, defensa articular, base y escape de la técnica observada.
• 'youtube_query': Búsqueda para aprender a defender y escapar de esta técnica exacta (ej: "Tutorial BJJ defensa y escape [Técnica Detectada]").`
     : `• El usuario es el ATACANTE. Brinda exclusivamente consejos de finalización, control de agarres, cierre de piernas y palanca articular.
• 'youtube_query': Búsqueda para ver el tutorial de ejecución canónico (ej: "Tutorial BJJ [Técnica Detectada] detalles tecnicos").`}
4. PERSPECTIVA DE TUTORÍA: Habla SIEMPRE en segunda persona ("Tú / Tus"): "Lograste una buena entrada...", "Al caer al tatami no olvides cerrar tus rodillas...".
5. IDENTIFICACIÓN DE LA TÉCNICA PRINCIPAL:
   ${tecnicaObjetivo 
     ? `- El practicante está entrenando: "${tecnicaObjetivo}". Evalúa su desempeño.`
     : `- Clasifica con precisión el nombre canónico y descriptivo en español de la técnica observada del catálogo oficial.`}
6. METADATA TEMPORAL DE LOS KEYFRAMES ADJUNTOS:
${metadataCronologica}
7. SECUENCIA MULTI-POSICIÓN: Desglosa cronológicamente en 'fasesSecuencia' las fases observadas en el video.
8. CONSEJO ACCIONABLE: 'sugerenciaPedagogica' debe tener 3 pasos directos (1. ... 2. ... 3. ...).

DATOS CINEMÁTICOS LOCALES (3KB):
${promptJSON}`
          };

          // Definición del Schema para formato JSON estricto con Visual Chain-of-Thought
          const responseSchema = {
            type: "OBJECT",
            properties: {
              secuenciaTemporalAnalizada: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Visual Chain-of-Thought: Análisis cronológico fotograma a fotograma (Frame 1 a N) describiendo la posición inicial (suelo o de pie), la transición y el resultado de la técnica."
              },
              tecnicaId: {
                type: "STRING",
                enum: listaTecnicasValidas,
                description: "Nombre canónico y descriptivo en español de la técnica detectada del catálogo oficial."
              },
              posicionBase: {
                type: "STRING",
                description: "Posición corporal base (ej: 'Guardia Cerrada', 'Media Guardia', 'Montada', 'Control Lateral', 'De pie / Lucha', 'Tortuga / 4 Puntos', 'Ashi Garami')."
              },
              fasesSecuencia: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Secuencia cronológica de las fases observadas en el combate."
              },
              cinturon: { type: "STRING", enum: ["BLANCO", "AZUL", "MORADO", "MARRON", "NEGRO"] },
              evaluacion: { type: "STRING", description: "Diagnóstico biomecánico en español en segunda persona (Tú), máx 80 palabras." },
              desviacionArticular: { type: "STRING" },
              desviacionGrados: { type: "INTEGER" },
              severidad: { type: "STRING", enum: ["Leve", "Moderado", "Critico"] },
              sugerenciaPedagogica: { type: "STRING", description: "3 pasos directos en español (1. ... 2. ... 3. ...), máx 50 palabras." },
              youtube_query: { type: "STRING", description: "Término en español optimizado para buscar el video tutorial de referencia exacto." }
            },
            required: [
              "secuenciaTemporalAnalizada",
              "tecnicaId",
              "cinturon",
              "evaluacion",
              "desviacionArticular",
              "desviacionGrados",
              "severidad",
              "sugerenciaPedagogica",
              "youtube_query"
            ]
          };

          const generationConfig: any = {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.0,
            maxOutputTokens: 2048
          };

          const safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
          ];

          let response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [textPart, ...imageParts] }],
              systemInstruction: { parts: [{ text: BJJ_SENSEI_SYSTEM_INSTRUCTION }] },
              generationConfig,
              safetySettings
            })
          });

          if (response.status === 429 || response.status === 503) {
            console.warn(`[Gemini API ${response.status}] Alta demanda o límite temporal en ${currentModel}. Reintentando con modelo estable...`);
          }

          if (response.ok) {
            const jsonRes: any = await response.json();
            const rawText = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text;

            if (rawText) {
              if (jsonRes.usageMetadata) {
                const promptTokens = jsonRes.usageMetadata.promptTokenCount || (selectedFrames.length * 258 + 220);
                const candidatesTokens = jsonRes.usageMetadata.candidatesTokenCount || 165;
                const totalTokens = jsonRes.usageMetadata.totalTokenCount || (promptTokens + candidatesTokens);

                let parsedTecnica = "Análisis Biomecánico";
                try {
                  const p = JSON.parse(rawText);
                  if (p.tecnicaId) parsedTecnica = p.tecnicaId;
                } catch {}

                TokenMetricsService.getInstance().registrarConsumo({
                  usuarioId: "usuario-dojo",
                  usuarioNombre: "Santiago (Cinturón Blanco)",
                  tecnicaId: parsedTecnica,
                  modelo: currentModel,
                  promptTokens,
                  candidatesTokens,
                  totalTokens,
                  estado: "EXITO",
                  duracionMs: 1250
                });
              }

              console.log(`[Gemini Service] Inferencia estricta exitosa recibida desde modelo estable ${currentModel}.`);
              return rawText;
            }
          } else {
            const errBody = await response.text();
            console.warn(`[Gemini Service Warning] HTTP Status ${response.status} en modelo ${currentModel}: ${errBody.substring(0, 200)}`);
          }
        } catch (error: any) {
          console.error(`[Failover Pipeline] Falló la inferencia con ${currentModel}: ${error.message}`);
        }
      }
    }

    // Si Gemini no está disponible, lanzar para que LLMRedirectionProxy ejecute el failover secundario
    throw new Error("Proveedores primarios de Gemini temporalmente saturados. Activando failover.");
  }

  // ============================================================
  // CLASIFICACIÓN VISUAL LIGERA
  // ============================================================
  async clasificarTecnicaVideo(
    keyframesSummary: any,
    videoName?: string,
    frames: string[] = [],
    modelName?: string
  ): Promise<string> {
    const activeKey = this.getApiKey();
    const selectedModel = modelName || this.defaultModel;

    if (activeKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${activeKey}`;
        const imageParts = frames.slice(0, 9).map(f => ({
          inlineData: { mimeType: "image/jpeg", data: f }
        }));

        const textPart = {
          text: `Observa las imágenes del combate de Brazilian Jiu-Jitsu e identifica con precisión el nombre canónico en español de la técnica, posición, transición, escape, pasaje o sumisión ejecutada. Responde ÚNICAMENTE con el nombre de la técnica.`
        };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [textPart, ...imageParts] }],
            systemInstruction: { parts: [{ text: BJJ_SENSEI_SYSTEM_INSTRUCTION }] },
            generationConfig: {
              temperature: 0.0,
              maxOutputTokens: 256,
              thinkingConfig: {
                thinkingBudget: 0
              }
            }
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          if (textResponse) {
            return textResponse;
          }
        }
      } catch (err: any) {
        console.warn(`[Gemini API Error] Fallo al clasificar con modelo ${selectedModel}: ${err.message}.`);
      }
    }

    return "Pasaje de Guardia Knee Cut";
  }

  // ============================================================
  // MODERACIÓN AUTÓNOMA DE CONTENIDO (Regla de Diseño RD-03)
  // ============================================================
  async validarPertinenciaBJJ(texto: string, modelName?: string): Promise<ModerationResult> {
    const muestra = texto.substring(0, 1500).toLowerCase();

    // 1. Capa de Rechazo Rápido Heurístico (Términos ajenos obvios)
    const temasAjenos = [
      "receta", "cocina", "ingredientes", "horno", "azucar", "tarta", "pastel",
      "video oficial", "cancion", "canción", "musical", "album", "álbum", "single", "cantante", "banda",
      "tito double p", "dareyes", "corridos", "reggaeton", "pop music", "music video", "lyrics", "letra",
      "programacion", "javascript", "typescript", "python", "docker",
      "gameplay", "minecraft", "fortnite", "gaming",
      "finanzas", "cripto", "bitcoin", "noticias politicas", "elecciones"
    ];

    if (temasAjenos.some(t => muestra.includes(t))) {
      console.log(`[Moderador] Contenido rechazado por filtro temático ajeno: "${texto.substring(0, 80)}"`);
      return {
        esPertinente: false,
        razon: "El contenido detectado (música, entretenimiento, cocina, tecnología o videojuegos) es ajeno al Brazilian Jiu-Jitsu y artes de agarre."
      };
    }

    // 2. Capa de IA con Gemini
    const activeKey = this.getApiKey();
    const selectedModel = modelName || this.liteModel;

    if (activeKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${activeKey}`;
        const prompt = `Actúa como un moderador técnico para OpenBJJ (sistema de tutoría inteligente de Brazilian Jiu-Jitsu).
Evalúa minuciosamente el título, canal o descripción del siguiente recurso educativo para determinar si trata sobre técnicas, conceptos, sparrings, derribos, pasajes, sumisiones o instrucción de Brazilian Jiu-Jitsu (BJJ), Grappling, No-Gi, Judo o Luta Livre.

IMPORTANTE: Si se trata de música, canciones, videoclips, recetas, videojuegos, entretenimiento general o cualquier tema no relacionado con artes marciales de agarre, DEBES clasificarlo como NO pertinente (esPertinente: false).

Texto o Metadatos del recurso:
"""
${texto.slice(0, 1000)}
"""

Responde ÚNICAMENTE en formato JSON estricto:
{
  "esPertinente": true | false,
  "razon": "<explicación breve de 1 frase en español justificando la decisión>"
}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.0,
              maxOutputTokens: 256,
              thinkingConfig: {
                thinkingBudget: 0
              }
            }
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const parsed = JSON.parse(rawJson);
            const esValido = Boolean(parsed.esPertinente);
            console.log(`[Gemini Moderador] Validación completada (${selectedModel}): ${esValido ? 'APROBADO' : 'RECHAZADO'} - ${parsed.razon}`);
            return {
              esPertinente: esValido,
              razon: String(parsed.razon || (esValido ? "Aprobado por IA" : "Rechazado por IA"))
            };
          }
        }
      } catch (err: any) {
        console.warn(`[Gemini Moderador Warning] Error al moderar con IA: ${err.message}. Aplicando heurística local.`);
      }
    }

    // 3. Capa Heurística de Respaldo Local (si no hay API key o la llamada falló)
    const palabrasBJJ = [
      "jiu-jitsu", "bjj", "ju-jitsu", "jiujitsu", "grappling", "sparring", "guardia",
      "guard", "pass", "pasaje", "sweep", "raspado", "armbar", "kimura", "choke",
      "estrangulamiento", "montada", "mount", "back take", "takedown", "derribo",
      "drill", "tatami", "judo", "wrestling", "sambo", "luta livre", "submission", "sumision",
      "triangulo", "triangle", "omoplata", "leglock", "ne-waza", "kosen", "americana",
      "knee cut", "de la riva", "half guard", "media guardia", "marcos defensivos", "frames",
      "saulo ribeiro", "danaher", "gordon ryan", "marcelo garcia", "ibjjf", "adcc"
    ];

    const esPertinente = palabrasBJJ.some(palabra => muestra.includes(palabra));
    if (esPertinente) {
      return {
        esPertinente: true,
        razon: "Contenido clasificado dentro del dominio de Brazilian Jiu-Jitsu y disciplinas afines."
      };
    }

    return {
      esPertinente: false,
      razon: "El título o descripción del enlace no contiene referencias a técnicas, posiciones o conceptos de Jiu-Jitsu o grappling."
    };
  }

  // ============================================================
  // ENRIQUECIMIENTO SEMÁNTICO EN INGESTA RAG (Principio Mannino)
  // ============================================================
  async enriquecerMetadatosTecnicos(textoBruto: string, modelName?: string): Promise<string> {
    const activeKey = this.getApiKey();
    const selectedModel = modelName || this.liteModel;

    if (activeKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${activeKey}`;
        const prompt = `Actúa como un experto en indexación técnica y taxonomía de Brazilian Jiu-Jitsu para el sistema RAG OpenBJJ.
A partir del siguiente título, canal o metadatos de un recurso de video, genera una ficha técnica estandarizada estructurada en JSON.

Metadatos de entrada:
"""
${textoBruto.slice(0, 1000)}
"""

Responde ÚNICAMENTE en formato JSON con la siguiente estructura exacta:
{
  "tecnicaCanonica": "<Nombre canónico en español y término común en inglés>",
  "articulacionObjetivo": "<Codo | Rodilla | Tobillo / Pie | Cuello | Hombro | Cadera / Espalda>",
  "rol": "<ataque | defensa | escape | transicion | pase>",
  "erroresComunes": "<1 o 2 fallos biomecánicos habituales>",
  "descripcionSintetica": "<Resumen denso y técnico de 2 frases describiendo la mecánica y posición>"
}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.0,
              maxOutputTokens: 350,
              thinkingConfig: { thinkingBudget: 0 }
            }
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const parsed = JSON.parse(rawJson);
            const enrichedText = `TÉCNICA: ${parsed.tecnicaCanonica || "Técnica BJJ"}. ARTICULACIÓN OBJETIVO: ${parsed.articulacionObjetivo || "General"}. ENFOQUE: ${parsed.rol || "Ataque"}. ERRORES FRECUENTES: ${parsed.erroresComunes || "Alineación y base"}. DETALLE BIOMECÁNICO: ${parsed.descripcionSintetica || textoBruto}. FUENTE ORIGINAL: ${textoBruto}`;
            console.log(`[RAG Enriquecimiento] Metadata procesada exitosamente: "${parsed.tecnicaCanonica}" (${parsed.articulacionObjetivo})`);
            return enrichedText;
          }
        }
      } catch (err: any) {
        console.warn(`[RAG Enriquecimiento Warning] Error al enriquecer con Gemini: ${err.message}. Aplicando plantilla heurística.`);
      }
    }

    // Heurística local de respaldo para preservación de conocimiento (Mannino)
    const lower = textoBruto.toLowerCase();
    let articulacion = "cuerpo general";
    if (lower.includes("armbar") || lower.includes("brazo") || lower.includes("codo") || lower.includes("kimura") || lower.includes("americana")) {
      articulacion = "codo y hombro";
    } else if (lower.includes("leglock") || lower.includes("heel hook") || lower.includes("rodilla") || lower.includes("tobillo") || lower.includes("knee") || lower.includes("ankle") || lower.includes("kani basami")) {
      articulacion = "rodilla y tobillo";
    } else if (lower.includes("choke") || lower.includes("triangulo") || lower.includes("triangle") || lower.includes("guillotine") || lower.includes("cuello") || lower.includes("estrangulamiento") || lower.includes("mataleon")) {
      articulacion = "cuello y cervicales";
    } else if (lower.includes("guard") || lower.includes("guardia") || lower.includes("pass") || lower.includes("pasaje") || lower.includes("sweep") || lower.includes("raspado")) {
      articulacion = "cadera y postura";
    }

    const esDefensa = ["defensa", "escape", "salida", "escapar", "defend"].some(w => lower.includes(w));
    const rol = esDefensa ? "defensa y escape" : "ataque y finalizacion";

    return `TÉCNICA: ${textoBruto}. ARTICULACIÓN OBJETIVO: ${articulacion}. ENFOQUE: ${rol}. DETALLE: Guía técnica y biomecánica de Jiu-Jitsu para corrección postural y drills.`;
  }
}
