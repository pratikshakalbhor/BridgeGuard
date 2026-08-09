# Use official Node 22 Alpine image
FROM node:22-alpine

# Install git and other system dependencies if needed
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy root dependency manifests
COPY package*.json ./

# Copy frontend dependency manifests
COPY frontend/package*.json ./frontend/

# Install root development/production dependencies
RUN npm ci

# Install frontend dependencies
RUN cd frontend && npm ci

# Copy all source code (respects .dockerignore)
COPY . .

# Build the frontend production bundle (outputs to frontend/dist)
RUN npm run frontend:build

# Set production environment variables
ENV NODE_ENV=production
EXPOSE 3000

# Start Express server via tsx
CMD ["npx", "tsx", "src/server.ts"]
