import { PrismaClient, Cinturon } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const rawInput = `
Erick, Jhon, Mauro, Mike, Orlando, +591 78494848, +591 69028375, +591 77646096, +591 70835093, +591 78598354, +591 75020361, +591 77329486, +591 63434749, +591 70873323, +591 63383314, +591 77807451, +591 77716938, +591 62006622, +591 76573391, +591 60848500, +591 78109663, +591 71368828, +591 76643498, +591 70014235, +591 70010086, +591 60995906, +591 73626968, +591 62100749, +591 69730546, +591 64448639, +591 62051512, +591 77097728, +591 75099525, +591 79908922, +591 78495849, +591 77696555, +591 62069573, +591 77603669, +1 (571) 246-0316, +591 78140406, +591 68933144, +591 69182228, +591 68861186, +44 7429 488130, +591 62059338, +591 69070351, +591 77071776, +591 68767023, +591 76610628, +591 78497263, +591 64437475, +591 68907710, +591 67712603, +591 75308332, +591 72108848, +591 74625459, +591 75075788, +591 73180222, +591 69350132, +591 77671758, +591 69209738, +591 73118127, +591 77466664, +591 69124134, +1 (571) 578-8119, +591 76651407, +591 60968442, +591 77646827, +591 69687177, +591 75681703, +591 64089175, +591 76681516
Mike Baigorria
Luissuarezz
Erick Jiujitsu
Orlando Salvatierra
Aldo V.
Boss$
Club Grizzly
`;

function extractMembers(text: string): string[] {
  const parts = text.split(/[\n,]+/);
  const rawList: string[] = [];

  for (let part of parts) {
    let clean = part.trim();
    if (!clean || clean.length < 2) continue;
    if (clean === "Tú" || clean.startsWith("~") || clean.includes("Ayer") || clean.includes("miércoles") || clean.includes("viernes")) continue;
    rawList.push(clean);
  }

  // Deduplicate and prioritize full names over single names/phones
  const nameMap = new Map<string, string>();

  // Specific mappings for known members
  const memberPriority: Record<string, string> = {
    "Mike": "Mike Baigorria",
    "Orlando": "Orlando Salvatierra",
    "Erick": "Erick Jiujitsu"
  };

  const uniqueSet = new Set<string>();

  for (let item of rawList) {
    let mapped = memberPriority[item] || item;
    // Normalize phone numbers or names
    uniqueSet.add(mapped);
  }

  // Remove partials if full exists
  if (uniqueSet.has("Mike Baigorria")) uniqueSet.delete("Mike");
  if (uniqueSet.has("Orlando Salvatierra")) uniqueSet.delete("Orlando");
  if (uniqueSet.has("Erick Jiujitsu")) uniqueSet.delete("Erick");

  return Array.from(uniqueSet);
}

async function seed() {
  console.log("=== INICIANDO REGISTRO DE MIEMBROS REALES DEL DOJO CORPO E MENTE ===");

  const members = extractMembers(rawInput);
  console.log(`Se identificaron ${members.length} practicantes reales del dojo.`);

  // 1. Limpiar todos los usuarios anteriores y sesiones
  console.log("Purgando usuarios y sesiones de prueba anteriores...");
  await prisma.errorBiomecanico.deleteMany({});
  await prisma.analisisBiomecanico.deleteMany({});
  await prisma.sesionEntrenamiento.deleteMany({});
  await prisma.historialVisualizacion.deleteMany({});
  await prisma.rutaAprendizaje.deleteMany({});
  await prisma.registroActividad.deleteMany({});
  await prisma.perfilCompetencia.deleteMany({});
  await prisma.fuenteConocimiento.deleteMany({});
  await prisma.usuario.deleteMany({});

  const salt = await bcrypt.genSalt(10);
  const defaultPinHash = await bcrypt.hash("1234", salt);

  // 2. Crear la ÚNICA cuenta de Sensei
  const SENSEI_ID = "0c11df27-87ba-40c3-a664-77dc2f18a496";
  console.log(`Creando la cuenta única de Sensei (${SENSEI_ID})...`);
  await prisma.usuario.create({
    data: {
      id: SENSEI_ID,
      nombre: "Sensei",
      email: "sensei@corpoemente.bjj",
      cinturon: Cinturon.NEGRO,
      altura: 1.78,
      peso: 82.0,
      pinHash: defaultPinHash,
      perfilCompetencia: {
        create: {
          erroresHistoricos: {}
        }
      }
    }
  });

  // 3. Crear cada uno de los practicantes reales
  console.log("Registrando practicantes del dojo...");
  let count = 0;
  for (const nombre of members) {
    const userId = crypto.randomUUID();
    // Generar email único y limpio
    const cleanHandle = nombre
      .replace(/[^\w\s+]/gi, '')
      .trim()
      .replace(/\s+/g, '.')
      .toLowerCase();
    const email = `${cleanHandle || 'practicante.' + count}@corpoemente.bjj`;

    await prisma.usuario.create({
      data: {
        id: userId,
        nombre: nombre,
        email: email,
        cinturon: Cinturon.BLANCO,
        altura: 1.75,
        peso: 75.0,
        pinHash: defaultPinHash,
        perfilCompetencia: {
          create: {
            erroresHistoricos: {}
          }
        }
      }
    });
    count++;
  }

  console.log(`\n¡Listo! Se creó la cuenta de Sensei y ${count} cuentas de practicantes reales.`);
  const total = await prisma.usuario.count();
  console.log(`Total de usuarios en base de datos: ${total} (1 Sensei + ${count} Practicantes)`);
}

seed()
  .catch((e) => {
    console.error("Error al registrar miembros:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
