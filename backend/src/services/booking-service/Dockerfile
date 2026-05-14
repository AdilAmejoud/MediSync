FROM node:20-slim

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root and service package manifests (for layer caching)
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/src/services/booking-service/package*.json ./backend/src/services/booking-service/

# Install root dependencies (required to compile Prisma)
RUN npm install
# Install backend shared dependencies (provides 'pg' and other shared modules)
RUN cd backend && npm install --ignore-scripts
# Install service-specific dependencies
RUN cd backend/src/services/booking-service && npm install

# Copy Prisma schema and migrations
COPY database/ ./database/

# Copy shared configs and utilities
COPY backend/src/config/ ./backend/src/config/
COPY backend/src/utils/ ./backend/src/utils/
COPY backend/src/middlewares/ ./backend/src/middlewares/

# Copy the service code itself
COPY backend/src/services/booking-service/ ./backend/src/services/booking-service/

# Generate Prisma Client
RUN npx prisma generate --schema=./database/schema.prisma

# Set working directory to the service and start
WORKDIR /app/backend/src/services/booking-service
EXPOSE 3003
CMD ["npm", "start"]
