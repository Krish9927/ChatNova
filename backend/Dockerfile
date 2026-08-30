# =====================================================
# Stage 1 — BUILDER
# Purpose: Install ALL dependencies (including devDependencies)
# This stage is discarded after building — it never reaches production
# =====================================================
FROM node:20-alpine AS builder

# Set the working directory inside the container
# All subsequent commands run from this path
WORKDIR /usr/src/app

# Copy ONLY package files first (Docker caches this layer)
# If package.json hasn't changed, Docker reuses the cached npm install
# This speeds up rebuild significantly during development
COPY package*.json ./

# npm ci = clean install (faster, stricter than npm install)
# Uses exact versions from package-lock.json — reproducible builds
RUN npm ci

# Copy the rest of the source code AFTER npm install
# This ensures code changes don't invalidate the npm cache layer
COPY . .

# =====================================================
# Stage 2 — PRODUCTION RUNNER
# Purpose: Lean, secure final image for deployment
# Only gets what it actually needs to run the app
# =====================================================
FROM node:20-alpine

# Security best practice: run as non-root user
# The 'node' user is pre-created in the node:alpine image
# If container is compromised, attacker has minimal system access
USER node

# Set working directory (owned by node user)
WORKDIR /usr/src/app

# Set production environment
# This disables dev tools, enables production optimizations
ENV NODE_ENV=production

# Copy package files with correct ownership for the node user
COPY --chown=node:node package*.json ./

# Install ONLY production dependencies (skips devDependencies like nodemon, jest)
# --omit=dev reduces image size and removes test-only packages from production
RUN npm ci --omit=dev

# Copy application source from the builder stage (NOT from the host machine)
# --chown=node:node sets correct file permissions for the non-root user
COPY --chown=node:node --from=builder /usr/src/app/src ./src
COPY --chown=node:node --from=builder /usr/src/app/public ./public

# Inform Docker that this container listens on port 3000
# This does NOT publish the port — docker-compose.yml does that
EXPOSE 3000

# The command that runs when the container starts
# Uses node directly (not nodemon) for production
CMD ["node", "src/server.js"]
