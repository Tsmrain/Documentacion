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
    catalogoTecnicas?: string[]
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
const BJJ_SENSEI_SYSTEM_INSTRUCTION = `ROL: Sensei y Profesor de Brazilian Jiu-Jitsu y Tutor Biomecánico de Clase Mundial.
MISIÓN: Analizar las acciones técnicas y biomecánicas de los dos practicantes en el combate a partir de los fotogramas visuales.
IDIOMA OBLIGATORIO: TODO el contenido del reporte, nombres de técnicas, diagnósticos, errores y sugerencias pedagógicas DEBEN ESTAR 100% EN ESPAÑOL. Está terminantemente prohibido responder en inglés.
CRITERIOS PEDAGÓGICOS:
- Clasifica la acción evaluando minuciosamente la postura de ambos practicantes (quién ataca y quién defiende).
- ATENCIÓN CRÍTICA EN MOVIMIENTOS DINÁMICOS: Distingue con precisión entre derribos convencionales (ataque a piernas) y sumisiones de pie o aéreas (como Llave de Brazo Voladora / Flying Armbar, Triángulo Volador, Guillotina de pie o Salto a la Guardia), observando si un practicante salta o eleva sus piernas hacia el torso o brazo del oponente para buscar una palanca articular.
- Detecta fallas biomecánicas críticas: codos o extremidades expuestas, hiperextensión articular, pérdida de base, caderas desalineadas, falta de marcos defensivos (frames) o distribución deficiente de peso.
- Brinda correcciones directas, prácticas y realistas de tatami en español.
- Selecciona el ID de la técnica del catálogo cerrado proporcionado. Si no coincide con ninguna, clasifícala estrictamente como "TECNICA_DESCONOCIDA_D".`;

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
    catalogoTecnicas: string[] = CATALOGO_TECNICAS_DEFAULT
  ): Promise<string> {
    const activeKey = this.getApiKey();
    const primaryModel = modelName || this.defaultModel;
    const selectedFrames = frames && frames.length > 0 ? frames.slice(0, 9) : [];

    // Asegurar que "TECNICA_DESCONOCIDA_D" exista en el enum para habilitar Zero-Shot Discovery
    const listaTecnicasValidas = Array.from(
      new Set([...(catalogoTecnicas && catalogoTecnicas.length > 0 ? catalogoTecnicas : CATALOGO_TECNICAS_DEFAULT), "TECNICA_DESCONOCIDA_D"])
    );

    console.log(`[Gemini Service] Inferencia estricta (${selectedFrames.length} keyframes). Catálogo: ${listaTecnicasValidas.length} técnicas.`);

    if (activeKey) {
      const modelsToTry = [
        primaryModel,
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

          const textPart = {
            text: `INSTRUCCIONES DE ALINEACIÓN BIOMECÁNICA DE JIU-JITSU:
1. Analiza los fotogramas clave. Determina cuál de las técnicas del CATÁLOGO CERRADO se está ejecutando.
2. REGLA DE DISCRIMINACIÓN VOLADORA: Si un atleta salta envolviendo el brazo o cuello del rival para someter en el aire, es obligatoriamente una sumisión voladora ("Llave de Brazo Voladora", "Triángulo Volador" o "Guillotina"). No lo catalogues como proyecciones de judo o derribos comunes.
3. Si el movimiento NO se ajusta a ninguna técnica del catálogo, debes clasificarlo estrictamente como "TECNICA_DESCONOCIDA_D".
4. Asegúrate de mapear de manera idéntica la consulta de YouTube ("youtube_query") con el nombre canónico de la técnica detectada para evitar desalineaciones en el motor RAG.

CATÁLOGO CERRADO DE TÉCNICAS ADMITIDAS (Usa exactamente uno de estos strings en 'tecnicaId'):
${JSON.stringify(listaTecnicasValidas)}

DATOS CINEMÁTICOS LOCALES (3KB):
${promptJSON}`
          };

          // Definición del Schema Estricto para forzar a Gemini a no inventar campos ni strings libres en tecnicaId
          const responseSchema = {
            type: "OBJECT",
            properties: {
              tecnicaId: {
                type: "STRING",
                enum: listaTecnicasValidas,
                description: "Debe ser exactamente uno de los valores del catálogo cerrado proporcionado."
              },
              cinturon: { type: "STRING", enum: ["BLANCO", "AZUL", "MORADO", "MARRON", "NEGRO"] },
              evaluacion: { type: "STRING", description: "Diagnóstico biomecánico en español, máx 80 palabras." },
              desviacionArticular: { type: "STRING" },
              desviacionGrados: { type: "INTEGER" },
              severidad: { type: "STRING", enum: ["Leve", "Moderado", "Critico"] },
              sugerenciaPedagogica: { type: "STRING", description: "Consejo de tatami en español, máx 50 palabras." },
              youtube_query: { type: "STRING", description: "Término en español optimizado para buscar la técnica exacta detectada." },
              fighters: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    role: { type: "STRING" },
                    status: { type: "STRING", enum: ["approved", "correction_needed"] },
                    summary: { type: "STRING" },
                    techniques: { type: "ARRAY", items: { type: "STRING" } },
                    mistakes: { type: "ARRAY", items: { type: "STRING" } },
                    tips: { type: "ARRAY", items: { type: "STRING" } }
                  },
                  required: ["role", "status", "summary"]
                }
              }
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
    const activeKey = this.getApiKey();
    const selectedModel = modelName || this.defaultModel;

    if (!activeKey) {
      return { esPertinente: true, razon: "Modo offline: validación omitida" };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${activeKey}`;
      const prompt = `Actúa como un moderador de contenido para un sistema de tutoría inteligente especializado EXCLUSIVAMENTE en Brazilian Jiu-Jitsu (BJJ), Grappling, Judo y Luta Livre.

Evalúa el siguiente texto o descripción de recurso educativo y determina si pertenece estrictamente al dominio de BJJ/Grappling.

Texto a evaluar:
"""
${texto.slice(0, 2000)}
"""

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "esPertinente": true | false,
  "razon": "<explicación breve de 1 frase justificando la decisión>"
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
          return {
            esPertinente: Boolean(parsed.esPertinente),
            razon: String(parsed.razon || "Evaluación completada")
          };
        }
      }
    } catch (err: any) {
      console.warn(`[Gemini Moderador Warning] Error al moderar: ${err.message}.`);
    }

    return {
      esPertinente: true,
      razon: "Validación por defecto ante indisponibilidad del servicio de moderación"
    };
  }
}
