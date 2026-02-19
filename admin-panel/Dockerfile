# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built app from builder
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Install dependencies (only serve)
RUN npm install --production

# Expose port
EXPOSE 5173

# Start the app
CMD ["npx", "serve", "-s", "dist", "-l", "5173"]
