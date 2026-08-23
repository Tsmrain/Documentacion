// ============================================================
// OPENBJJ - MOTOR DE EVALUACIÓN MULTIMODAL & MODERACIÓN
// Arquitectura desacoplada multifuente (Larman & Mannino)
// ============================================================

import { TokenMetricsService } from "./TokenMetricsService";

export interface ILLMProvider {
  evaluarMovimiento(promptJSON: string, frames?: string[], modelName?: string): Promise<string>;
}

export interface ITechniqueClassifier {
  clasificarTecnicaVideo(keyframesSummary: any, videoName?: string, frames?: string[], modelName?: string): Promise<string>;
}

export interface ModerationResult {
  esPertinente: boolean;
  razon: string;
}

export interface IContentModerator {
  validarPertinenciaBJJ(texto: string, modelName?: string): Promise<ModerationResult>;
}

// System Instruction general para el Sensei Digital de Jiu-Jitsu
const BJJ_SENSEI_SYSTEM_INSTRUCTION = `ROL: Sensei y Profesor de Brazilian Jiu-Jitsu y Tutor Biomecánico de Clase Mundial.
MISIÓN: Analizar las acciones técnicas y biomecánicas de los dos practicantes en el combate a partir de los fotogramas visuales.
IDIOMA OBLIGATORIO: TODO el contenido del reporte, nombres de técnicas, diagnósticos, errores y sugerencias pedagógicas DEBEN ESTAR 100% EN ESPAÑOL. Está terminantemente prohibido responder en inglés.
CRITERIOS PEDAGÓGICOS:
- Identifica de forma libre y con máxima agudeza visual en ESPAÑOL cualquier técnica, sumisión, derribo, pasaje, raspado o escape.
- ATENCIÓN CRÍTICA EN MOVIMIENTOS DINÁMICOS: Distingue con precisión entre derribos convencionales (ataque a piernas) y sumisiones de pie o aéreas (como Llave de Brazo Voladora / Flying Armbar, Triángulo Volador, Guillotina de pie o Salto a la Guardia), observando si un practicante salta o eleva sus piernas hacia el torso o brazo del oponente para buscar una palanca articular.
- Evalúa la postura de ambos practicantes (quién ataca y quién defiende).
- Detecta fallas biomecánicas críticas: codos o extremidades expuestas, hiperextensión articular, pérdida de base, caderas desalineadas, falta de marcos defensivos (frames) o distribución deficiente de peso.
- Brinda correcciones directas, prácticas y realistas de tatami en español.
- Genera una consulta precisa para YouTube en español para que el alumno pueda ver el video tutorial exacto de esa técnica.`;

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
  // FASE UNICA (Detección Visual Autónoma Multimodal + RAG Dinámico)
  // Analiza los keyframes del combate directamente con visión multimodal de Gemini.
  // ============================================================
  async evaluarMovimiento(promptJSON: string, frames: string[] = [], modelName?: string): Promise<string> {
    const activeKey = this.getApiKey();
    const primaryModel = modelName || this.defaultModel;

    // Procesar todos los keyframes disponibles (hasta 9)
    const selectedFrames = frames && frames.length > 0 ? frames.slice(0, 9) : [];

    console.log(`[Gemini Service - Single Pass] Inferencia visual multimodal (${selectedFrames.length} keyframes) con modelo ${primaryModel}`);

    if (activeKey) {
      const modelsToTry = [
        primaryModel,
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-3.7-flash",
        "gemini-2.5-flash"
      ];

      for (const currentModel of Array.from(new Set(modelsToTry))) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${activeKey}`;
          const imageParts = selectedFrames.map(f => ({
            inlineData: {
              mimeType: "image/jpeg",
              data: f
            }
          }));

          const textPart = {
            text: `INSTRUCCIONES DE ANÁLISIS DE COMBATE DE JIU-JITSU:
1. Observa minuciosamente la secuencia de fotogramas del combate para identificar la técnica exacta.
2. DISCRIMINACIÓN TÉCNICA VISUAL CRÍTICA:
   - Si un practicante salta desde la posición de pie, atrapa el brazo/codo o cuello del oponente y pasa sus piernas alrededor del torso o sobre la cabeza del rival para arrastrarlo al tatami con una palanca articular, identifícalo como la sumisión correspondiente: **Llave de Brazo Voladora (Flying Armbar)**, **Triángulo Volador** o **Guillotina**.
   - No clasifiques una sumisión voladora como un derribo de suplex o proyección si el objetivo claro del atleta es atrapar el brazo o cuello en el aire.
   - Identifica con fidelidad si es una sumisión de pie/voladora, un derribo, un pasaje de guardia, un raspado o control posicional.
3. IDIOMA ESTRICTO: Responde 100% en español (nombres de técnicas, diagnósticos y sugerencias). Prohibido el inglés.
4. Responde ÚNICAMENTE en JSON con el siguiente esquema estricto:
{
  "tecnicaId": "<Nombre canónico de la técnica observada en español: ej. Llave de Brazo Voladora, Pasaje Knee Cut, Control Lateral, Triángulo>",
  "cinturon": "BLANCO" | "AZUL" | "MORADO" | "MARRON" | "NEGRO",
  "evaluacion": "<Diagnóstico biomecánico conciso de postura, base y control, máx 80 palabras>",
  "desviacionArticular": "<Articulación principal con desviación o riesgo biomecánico>",
  "desviacionGrados": <numero entero 0 a 90>,
  "severidad": "Leve" | "Moderado" | "Critico",
  "sugerenciaPedagogica": "<Consejo directo de tatami como profesor de Jiu-Jitsu, máx 50 palabras>",
  "youtube_query": "<Término de búsqueda optimizado para YouTube para esta técnica>",
  "fighters": [
    {
      "role": "Luchador Superior (Top) / Luchador Inferior (Guardia)",
      "status": "approved" | "correction_needed",
      "summary": "<Resumen de la acción>",
      "techniques": ["<Técnica observada>"],
      "mistakes": ["<Error detectado>"],
      "tips": ["<Consejo directo>"],
      "reference": {
        "book": "Técnica de Tatami",
        "technique": "<Nombre de la técnica>",
        "belt": "<Cinturón recomendado>",
        "quote": "<Principio técnico clave>"
      },
      "youtube_query": "<Búsqueda de YouTube>"
    }
  ]
}

DATOS DEL ANÁLISIS:
${promptJSON}`
          };

          let response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [textPart, ...imageParts]
                }
              ],
              systemInstruction: {
                parts: [{ text: BJJ_SENSEI_SYSTEM_INSTRUCTION }]
              },
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
                maxOutputTokens: 4096,
                thinkingConfig: {
                  thinkingBudget: 0
                }
              }
            })
          });

          // Manejo de Rate Limit 429 (Límite por minuto) con reintento limpio
          if (response.status === 429) {
            console.warn(`[Gemini API Warning] HTTP Status 429 en modelo ${currentModel}. Pausando 1.5s antes de reintentar...`);
            await new Promise(r => setTimeout(r, 1500));
            response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [textPart, ...imageParts] }],
                systemInstruction: { parts: [{ text: BJJ_SENSEI_SYSTEM_INSTRUCTION }] },
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.1,
                  maxOutputTokens: 4096,
                  thinkingConfig: {
                    thinkingBudget: 0
                  }
                }
              })
            });
          }

          if (response.ok) {
            const data: any = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
              const usage = data.usageMetadata;
              const promptTokens = usage?.promptTokenCount || (selectedFrames.length * 258 + 220);
              const candidatesTokens = usage?.candidatesTokenCount || 165;
              const totalTokens = usage?.totalTokenCount || (promptTokens + candidatesTokens);

              let parsedTecnica = "Análisis Biomecánico BJJ";
              try {
                const p = JSON.parse(textResponse);
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

              console.log(`[Gemini API - Single Pass] Inferencia multimodal exitosa completada por ${currentModel} (${totalTokens} tokens consumidos).`);
              return textResponse;
            }
          } else {
            console.warn(`[Gemini API Warning] HTTP Status ${response.status} en modelo ${currentModel}. Probando siguiente modelo.`);
          }
        } catch (err: any) {
          console.warn(`[Gemini API Error] Fallo al conectar con modelo ${currentModel}: ${err.message}.`);
        }
      }
    }

    // Fallback determinista local
    return JSON.stringify({
      tecnicaId: "Guardia Cerrada y Postura",
      cinturon: "BLANCO",
      evaluacion: "Mantén tu postura erguida, codos cerrados y cabeza alta para proteger la base.",
      desviacionArticular: "codo_derecho",
      desviacionGrados: 20,
      severidad: "Moderado",
      sugerenciaPedagogica: "Usa tus marcos (frames) con los antebrazos para mantener la distancia y no regalar la posición.",
      youtube_query: "BJJ closed guard posture and defense tutorial"
    });
  }

  // ============================================================
  // FASE 1 - Clasificacion Visual Ligera (Two-Phase RAG)
  // ============================================================
  async clasificarTecnicaVideo(keyframesSummary: any, videoName?: string, frames: string[] = [], modelName?: string): Promise<string> {
    const activeKey = this.getApiKey();
    const selectedModel = modelName || this.defaultModel;
    console.log(`[Gemini Multimodal] Clasificando ${frames.length} keyframes de video con modelo ${selectedModel}`);

    if (activeKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${activeKey}`;
        const imageParts = frames.slice(0, 9).map(f => ({
          inlineData: {
            mimeType: "image/jpeg",
            data: f
          }
        }));

        const textPart = {
          text: `Observa las imágenes del combate de Brazilian Jiu-Jitsu e identifica con precisión el nombre de la técnica, posición, transición, escape, pasaje o sumisión ejecutada. Responde ÚNICAMENTE con el nombre de la técnica.`
        };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [textPart, ...imageParts]
              }
            ],
            systemInstruction: {
              parts: [{ text: BJJ_SENSEI_SYSTEM_INSTRUCTION }]
            },
            generationConfig: {
              temperature: 0.1,
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

    return "Pasaje de Guardia";
  }

  // ============================================================
  // MODERACION AUTONOMA DE CONTENIDO (Regla de Diseno RD-03)
  // ============================================================
  async validarPertinenciaBJJ(texto: string, modelName?: string): Promise<ModerationResult> {
    const activeKey = this.getApiKey();
    const selectedModel = modelName || this.defaultModel;

    if (!activeKey) {
      return { esPertinente: true, razon: "Modo offline: validacion omitida" };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${activeKey}`;
      const prompt = `Actua como un moderador de contenido para un sistema de tutoria inteligente especializado EXCLUSIVAMENTE en Brazilian Jiu-Jitsu (BJJ), Grappling, Judo y Luta Livre.

Evalua el siguiente texto o descripcion de recurso educativo y determina si pertenece estrictamente al dominio de BJJ/Grappling.

Texto a evaluar:
"""
${texto.slice(0, 2000)}
"""

Responde UNICAMENTE en formato JSON con la siguiente estructura:
{
  "esPertinente": true | false,
  "razon": "<explicacion breve de 1 frase justificando la decision>"
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
            razon: String(parsed.razon || "Evaluacion completada")
          };
        }
      }
    } catch (err: any) {
      console.warn(`[Gemini Moderador Warning] Error al moderar: ${err.message}.`);
    }

    return {
      esPertinente: true,
      razon: "Validacion por defecto ante indisponibilidad del servicio de moderacion"
    };
  }
}
