FROM node:20-slim
WORKDIR /app
COPY backend/src/services/gateway/package*.json ./
RUN npm install
COPY backend/src/services/gateway/ .
EXPOSE 3000
CMD ["npm", "start"]
