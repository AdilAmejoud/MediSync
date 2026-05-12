FROM node:20-slim

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root and service package manifests (for layer caching)
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/src/services/auth-service/package*.json ./backend/src/services/auth-service/

# Install root dependencies (required to compile Prisma)
RUN npm install
# Install backend shared dependencies (provides 'pg' and other shared modules)
RUN cd backend && npm install --ignore-scripts
# Install service-specific dependencies
RUN cd backend/src/services/auth-service && npm install

# Copy Prisma schema and migrations
COPY database/ ./database/

# Copy shared configs and utilities
COPY backend/src/config/ ./backend/src/config/
COPY backend/src/utils/ ./backend/src/utils/
COPY backend/src/middlewares/ ./backend/src/middlewares/

# Copy the service code itself
COPY backend/src/services/auth-service/ ./backend/src/services/auth-service/

# Generate Prisma Client
RUN npx prisma generate --schema=./database/schema.prisma

# Set working directory to the service and start
WORKDIR /app/backend/src/services/auth-service
EXPOSE 3001
CMD ["sh", "-c", "cd /app && npx prisma migrate deploy --schema=./database/schema.prisma && cd backend/src/services/auth-service && npm start"]
