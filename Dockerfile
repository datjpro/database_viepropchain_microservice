# ============================================================================
# Optimized Dockerfile for ViePropChain Microservices
# ============================================================================
# Uses multi-stage build and shared dependencies for faster builds
# ============================================================================

FROM node:18-alpine AS base

# Install system dependencies once
RUN apk add --no-cache python3 make g++ git wget

WORKDIR /app

# ============================================================================
# Stage 1: Install root dependencies (shared)
# ============================================================================
FROM base AS dependencies

COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# ============================================================================
# Stage 2: Production image
# ============================================================================
FROM base AS production

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy shared models first (most stable, cached)
COPY shared/ ./shared/

# Copy all service code (changes frequently)
COPY services/ ./services/

# Copy package.json for reference
COPY package*.json ./

# Expose port (overridden by docker-compose)
EXPOSE 4000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-4000}/health || exit 1

# Default command (overridden by docker-compose)
CMD ["node", "services/api-gateway/index.js"]
