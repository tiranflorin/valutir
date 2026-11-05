# Dev stage
FROM node:24-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
# Exact locked versions; node_modules/ is excluded by .dockerignore so these aren't overwritten
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]
