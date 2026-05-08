FROM node:22-slim

WORKDIR /app

# Install dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npx tsc

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/meridian.db

EXPOSE 3000

CMD ["node", "dist/server.js"]
