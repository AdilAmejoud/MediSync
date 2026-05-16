FROM node:20-slim
WORKDIR /app
COPY backend/src/services/notification-service/package*.json ./
RUN npm install
COPY backend/src/services/notification-service/ .
CMD ["npm", "start"]
