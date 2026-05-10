FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root and backend package manifests first (for layer caching)
COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm install
RUN cd backend && npm install --ignore-scripts && npm rebuild bcrypt

# Copy Prisma schema and migrations
COPY database/ ./database/

# Copy all backend source code (now under src/)
COPY backend/src/ ./backend/src/
COPY backend/server.js ./backend/
COPY backend/socket.js ./backend/
COPY backend/seed.js ./backend/

# Generate Prisma client
RUN npx prisma generate --schema=./database/schema.prisma

WORKDIR /app/backend
EXPOSE 3004
CMD ["node", "server.js"]
