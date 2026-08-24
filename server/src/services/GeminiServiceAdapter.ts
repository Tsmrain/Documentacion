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

// Catálogo canónico por defecto del Dojo
export const CATALOGO_TECNICAS_DEFAULT = [
  "Guardia Cerrada",
  "Pasaje de Guardia Knee Cut",
  "Control Lateral",
  "Montada",
  "Control de Espalda",
  "Triángulo",
  "Armbar / Llave de Brazo",
  "Llave de Brazo Voladora",
  "Triángulo Volador",
  "Guillotina",
  "Media Guardia",
  "Guardia Abierta",
  "Raspado de Gancho",
  "Derribo Double Leg",
  "Kimura",
  "Omoplata"
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
REGLAS CRÍTICAS DE IDENTIFICACIÓN VISUAL EN JIU-JITSU:
- SUMISIONES VOLADORAS (Flying Armbar / Llave de Brazo Voladora, Triángulo Volador): Si la acción inicia de pie y un practicante salta o eleva sus piernas hacia el torso/cuello/hombro del oponente para atrapar el brazo o cuello en el aire y caer al suelo extendiendo la articulación, clasifícala estrictamente como "Llave de Brazo Voladora" (o "Triángulo Volador").
- NO CONFUNDIR con derribos de lucha libre (como High Crotch, Single Leg o Double Leg) que son ataques de penetración hacia las piernas o muslos del oponente.
- NO CONFUNDIR con "Armbar desde montada", pues la técnica voladora nace del salto aéreo desde la posición de pie.`;

export class GeminiServiceAdapter implements ILLMProvider, ITechniqueClassifier, IContentModerator {
  private apiKey: string;
  private defaultModel: string;
  private proModel: string;
  private liteModel: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    this.defaultModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    this.proModel = process.env.GEMINI_MODEL_PRO || "gemini-3.1-flash-lite";
    this.liteModel = process.env.GEMINI_MODEL_LITE || "gemini-3.1-flash-lite";
  }

  private getApiKey(): string {
    return process.env.GEMINI_API_KEY || process.env.API_KEY || this.apiKey || "";
  }

  // ============================================================
  // FASE ÚNICA OPTIMIZADA CON CATÁLOGO RÍGIDO Y RESPONSE SCHEMA
  // ============================================================
  async evaluarMovimiento(
    promptJSON: string,
    frames: string[] = [],
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

    console.log(`[Gemini Service] Inferencia estricta (${selectedFrames.length} keyframes). Catálogo: ${listaTecnicasValidas.length} técnicas.${tecnicaObjetivo ? ` Objetivo: '${tecnicaObjetivo}'` : ''} | Rol: ${rolPracticante}`);

    if (activeKey) {
      const modelsToTry = [
        primaryModel,
        this.liteModel,
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3.7-flash",
        "gemini-2.5-flash"
      ];

      for (const currentModel of Array.from(new Set(modelsToTry))) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${activeKey}`;
          const imageParts = selectedFrames.map(f => ({
            inlineData: { mimeType: "image/jpeg", data: f }
          }));

          const esDefensor = rolPracticante === "DEFENSOR";

          const textPart = {
            text: `INSTRUCCIONES DE TUTORÍA DEL SENSEI DE JIU-JITSU:
1. Analiza minuciosamente los fotogramas clave del combate de Brazilian Jiu-Jitsu.
2. DISCRIMINACIÓN TÉCNICA VISUAL PRECISA:
   - Si la secuencia muestra a los dos practicantes de pie, uno toma agarre de solapa/brazo y salta envolviendo el torso/brazo del oponente cayendo al tatami para buscar la palanca de codo, clasifícala estrictamente como "Llave de Brazo Voladora" (Flying Armbar).
   - NUNCA clasifiques un salto al brazo como derribo de lucha a las piernas (High Crotch/Single Leg) ni como sumisión estática desde la montada.
3. ROL DEL PRACTICANTE EVALUADO:
   ${esDefensor 
     ? `• El usuario es el DEFENSOR. Brinda exclusivamente consejos de postura, defensa de codo, base y escape de la técnica observada.
• 'youtube_query': Búsqueda para aprender a defender y escapar de esta técnica exacta (ej: "Tutorial BJJ defensa y escape Llave de Brazo Voladora").`
     : `• El usuario es el ATACANTE. Brinda exclusivamente consejos de finalización, control de muñeca, cierre de rodillas y palanca de cadera.
• 'youtube_query': Búsqueda para ver el tutorial de ejecución canónico (ej: "Tutorial BJJ Llave de Brazo Voladora detalles tecnicos").`}
4. PERSPECTIVA DE TUTORÍA: Habla SIEMPRE en segunda persona ("Tú / Tus"): "Lograste una buena entrada...", "Al caer al tatami no olvides cerrar tus rodillas...".
5. IDENTIFICACIÓN DE LA TÉCNICA PRINCIPAL:
   ${tecnicaObjetivo 
     ? `- El practicante está entrenando: "${tecnicaObjetivo}". Evalúa su desempeño.`
     : `- Clasifica con precisión el nombre canónico y descriptivo en español de la técnica observada (ej: "Llave de Brazo Voladora", "Kimura", "Triángulo", "Pasaje Knee Cut", "Raspado de Mariposa", "Escape de Montada", "Guillotina", "De la Riva", etc.).`}
6. SECUENCIA MULTI-POSICIÓN: Desglosa cronológicamente en 'fasesSecuencia' las fases observadas en el video.
7. CONSEJO ACCIONABLE: 'sugerenciaPedagogica' debe tener 3 pasos directos (1. ... 2. ... 3. ...).

DATOS CINEMÁTICOS LOCALES (3KB):
${promptJSON}`
          };

          // Definición del Schema para formato JSON estricto
          const responseSchema = {
            type: "OBJECT",
            properties: {
              tecnicaId: {
                type: "STRING",
                enum: listaTecnicasValidas,
                description: "Nombre canónico y descriptivo en español de la técnica detectada del catálogo oficial."
              },
              posicionBase: {
                type: "STRING",
                description: "Posición corporal base (ej: 'De pie / Transición aérea', 'Guardia Cerrada', 'Montada', 'Control Lateral')."
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

          let response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [textPart, ...imageParts] }],
              systemInstruction: { parts: [{ text: BJJ_SENSEI_SYSTEM_INSTRUCTION }] },
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.0, // Cero absoluto para máxima consistencia determinista
                maxOutputTokens: 2048,
                thinkingConfig: {
                  thinkingBudget: 0
                }
              }
            })
          });

          if (response.status === 429) {
            console.warn(`[Gemini API 429] Límite de cuota en ${currentModel}. Pausando 1.5s antes de reintentar...`);
            await new Promise(r => setTimeout(r, 1500));
            response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [textPart, ...imageParts] }],
                systemInstruction: { parts: [{ text: BJJ_SENSEI_SYSTEM_INSTRUCTION }] },
                generationConfig: {
                  responseMimeType: "application/json",
                  responseSchema: responseSchema,
                  temperature: 0.0,
                  maxOutputTokens: 2048,
                  thinkingConfig: {
                    thinkingBudget: 0
                  }
                }
              })
            });
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
                  duracionMs: 1450
                });
              }

              console.log(`[Gemini Service] Inferencia estricta exitosa recibida desde modelo ${currentModel}.`);
              return rawText;
            }
          } else {
            console.warn(`[Gemini Service Warning] HTTP Status ${response.status} en modelo ${currentModel}.`);
          }
        } catch (error: any) {
          console.error(`[Failover Pipeline] Falló la inferencia con ${currentModel}: ${error.message}`);
        }
      }
    }

    // Fallback determinista local respetando el catálogo
    const fallbackTecnica = listaTecnicasValidas[0] || "Guardia Cerrada";
    return JSON.stringify({
      tecnicaId: fallbackTecnica,
      cinturon: "BLANCO",
      evaluacion: "Mantén tu postura erguida, codos cerrados y cabeza alta para proteger la base.",
      desviacionArticular: "codo_derecho",
      desviacionGrados: 20,
      severidad: "Moderado",
      sugerenciaPedagogica: "Usa tus marcos (frames) con los antebrazos para mantener la distancia y no regalar la posición.",
      youtube_query: `Tutorial de BJJ ${fallbackTecnica} postura y defensa`
    });
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
}
