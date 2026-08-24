import fs from "fs";
import path from "path";

export function initEnv() {
  const possiblePaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../.env"),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, "utf-8");
      envConfig.split("\n").forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valParts] = trimmed.split("=");
          if (key && valParts.length > 0) {
            const val = valParts.join("=").trim().replace(/^["']|["']$/g, "");
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = val;
            }
          }
        }
      });
      break;
    }
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://postgres:password@localhost:5433/openbjj?schema=public";
  }
}

initEnv();
