import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function extractMeta(url: string): Promise<string> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const json: any = await res.json();
      if (json && json.title) {
        return [json.title, json.author_name ? `Canal: ${json.author_name}` : "", "Plataforma: YouTube"].filter(Boolean).join(". ");
      }
    }
  } catch (e) {}

  try {
    const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
    const res2 = await fetch(noembedUrl, { signal: AbortSignal.timeout(4000) });
    if (res2.ok) {
      const json2: any = await res2.json();
      if (json2 && json2.title) {
        return [json2.title, json2.author_name ? `Canal: ${json2.author_name}` : ""].filter(Boolean).join(". ");
      }
    }
  } catch (e2) {}

  return url;
}

async function enrich() {
  console.log("=== ENRIQUECIENDO TÍTULOS DE FUENTES DE CONOCIMIENTO ===");
  const fuentes = await prisma.fuenteConocimiento.findMany({
    where: { url: { not: null } }
  });

  console.log(`Total fuentes a verificar: ${fuentes.length}`);

  const CONCURRENCY = 15;
  let updatedCount = 0;

  for (let i = 0; i < fuentes.length; i += CONCURRENCY) {
    const batch = fuentes.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (f) => {
      if (f.url && (f.titulo.startsWith("http") || f.titulo === f.url)) {
        const meta = await extractMeta(f.url);
        if (meta && meta !== f.url) {
          await prisma.fuenteConocimiento.update({
            where: { id: f.id },
            data: { titulo: meta }
          });
          updatedCount++;
        }
      }
    }));

    if (i % 60 === 0 || i + CONCURRENCY >= fuentes.length) {
      console.log(`[Progreso] ${Math.min(i + CONCURRENCY, fuentes.length)}/${fuentes.length} | Títulos actualizados: ${updatedCount}`);
    }
  }

  console.log(`\n¡Finalizado! Se actualizaron ${updatedCount} títulos reales de lecciones de BJJ.`);
}

enrich()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
