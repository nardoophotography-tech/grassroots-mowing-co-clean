FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx tsc

FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 8080
ENV PORT=8080
CMD ["node", "dist/cherry-server.js"]
