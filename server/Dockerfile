# Etapa 1: Construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Copia los manifiestos de dependencias
COPY package*.json ./
COPY server/package*.json ./server/

# Instala todas las dependencias
RUN npm install && npm install --prefix server

# Copia el código fuente
COPY prisma ./prisma
COPY server ./server

# Genera el cliente de Prisma
RUN npx prisma generate

# Compila el TypeScript del servidor
WORKDIR /app/server
RUN npx tsc

# Etapa 2: Imagen ligera de producción
FROM node:20-alpine

WORKDIR /app

# Copia los modulos y dependencias desde el builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/prisma ./prisma

# Copia los archivos compilados del servidor
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package*.json ./server/

# Expone el puerto del servidor
EXPOSE 3001

# Establece el directorio y arranca
WORKDIR /app/server
CMD ["node", "dist/index.js"]
