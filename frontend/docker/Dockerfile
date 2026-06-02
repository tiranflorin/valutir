# Frontend Dockerfile (valutir/frontend/docker/Dockerfile)

# === Dev stage ===
FROM node:20-alpine AS dev

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# Expose the dev server port (adjust if your framework uses another)
EXPOSE 5173

# Run dev server on all interfaces for Docker access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# === Prod stage (builder + nginx) ===
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
