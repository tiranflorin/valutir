# === Dev stage ===
FROM node:20-alpine AS dev

WORKDIR /app

# Copy only package files for reference (not for installing)
COPY package*.json ./

# Don't run npm ci — we'll mount node_modules from host
COPY . .

EXPOSE 5173

#CMD ["npm", "run", "dev"]
# Keep container running with sleep (prevents exit)
CMD ["sh", "-c", "echo 'Container ready. Run: docker compose exec frontend npm run dev' && tail -f /dev/null"]

# === Prod stage (unchanged) ===
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