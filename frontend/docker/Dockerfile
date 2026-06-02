# Dev stage
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Prod stage
FROM nginx:alpine AS prod
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

#CMD ["npm", "run", "dev"]
# Keep container running with sleep (prevents exit)
#CMD ["sh", "-c", "echo 'Container ready. Run: docker compose exec frontend npm run dev' && tail -f /dev/null"]