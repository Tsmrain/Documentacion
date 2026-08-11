import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function main() {
  const activeKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`;

  const promptJSON = `{"tecnicaId": "montada", "metricas": [{"articulacion": "codo_derecho", "desviacionGrados": 20}]}`;
  const textPart = {
    text: `ROL: Motor de tutoria biomecanica de OpenBJJ.\nFUENTE RAG FOCALIZADA:\nEl que domina la montada controla el combate.\n\nEvalua el siguiente prompt cinematico y las imagenes adjuntas del combate. Usa lenguaje directo de tatami de BJJ (e.g. 'buena base', 'postura', 'ceder peso', 'regalar posicion', 'frame') en lugar de terminos muy academicos o mecanicos. Responde UNICAMENTE con un JSON segun el esquema AnalysisResult: tecnicaId (string), evaluacion (string, max 120 palabras), desviacionArticular (string), desviacionGrados (number 0-90), severidad ("Leve"|"Moderado"|"Critico"), sugerenciaPedagogica (string, max 60 palabras).\n\nPROMPT Y METRICAS:\n${promptJSON}`
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [textPart] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 2048
      }
    })
  });

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("TEXT RESPONSE:");
  console.log(textResponse);
  
  try {
    const parsed = JSON.parse(textResponse);
    console.log("PARSE OK!");
  } catch(e) {
    console.log("PARSE FAILED:", e);
    const match = textResponse.match(/\{[\s\S]*\}/);
    if(match) {
      try { JSON.parse(match[0]); console.log("MATCH PARSE OK"); } catch(e) { console.log("MATCH PARSE FAILED", e); }
    }
  }
}

main().catch(console.error);
