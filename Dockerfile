# Multi-stage Dockerfile for ArcSilence Darkpool
FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@8.15.4

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY services/solver-relayer/package.json services/solver-relayer/
COPY programs/darkpool/package.json programs/darkpool/
COPY darkpool-matcher/package.json darkpool-matcher/

# Install dependencies
RUN pnpm install --frozen-lockfile

# =============================================================================
# Build Solana Programs Stage
# =============================================================================
FROM base AS solana-builder

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Solana CLI
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
ENV PATH="/root/.local/share/solana/install/active_release/bin:${PATH}"

# Install Anchor CLI
RUN cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
RUN avm install 0.32.1 && avm use 0.32.1

# Copy Anchor configuration
COPY Anchor.toml ./
COPY programs/darkpool/Cargo.toml programs/darkpool/
COPY programs/darkpool/src programs/darkpool/src/
COPY programs/darkpool/package.json programs/darkpool/

# Build the Solana program
RUN cd programs/darkpool && anchor build

# =============================================================================
# Build Node.js Services Stage
# =============================================================================
FROM base AS nodejs-builder

# Copy source code
COPY apps/web/ apps/web/
COPY services/solver-relayer/ services/solver-relayer/
COPY darkpool-matcher/ darkpool-matcher/

# Build web app
RUN cd apps/web && pnpm build

# Build solver-relayer
RUN cd services/solver-relayer && pnpm build

# Build darkpool-matcher (if needed)
# RUN cd darkpool-matcher && pnpm build

# =============================================================================
# Final Runtime Images
# =============================================================================

# Web App Runtime Image
FROM node:20-slim AS web-app

RUN npm install -g pnpm@8.15.4

WORKDIR /app/apps/web

# Copy built web app
COPY --from=nodejs-builder /app/apps/web/.next ./.next
COPY --from=nodejs-builder /app/apps/web/public ./public
COPY --from=nodejs-builder /app/apps/web/package.json ./
COPY --from=nodejs-builder /app/apps/web/next.config.mjs ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "start"]

# Solver-Relayer Runtime Image
FROM node:20-slim AS solver-relayer

RUN npm install -g pnpm@8.15.4

WORKDIR /app/services/solver-relayer

# Copy built solver-relayer
COPY --from=nodejs-builder /app/services/solver-relayer/dist ./dist
COPY --from=nodejs-builder /app/services/solver-relayer/package.json ./
COPY --from=nodejs-builder /app/services/solver-relayer/src/idl ./src/idl

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

EXPOSE 8080

CMD ["node", "dist/index.js"]

# Darkpool-Matcher Runtime Image
FROM node:20-slim AS darkpool-matcher

RUN npm install -g pnpm@8.15.4

WORKDIR /app/darkpool-matcher

# Copy darkpool-matcher
COPY --from=nodejs-builder /app/darkpool-matcher ./

# Install dependencies
RUN pnpm install --frozen-lockfile

EXPOSE 3001

CMD ["node", "index.js"]

# Arcium Node Runtime Image
FROM node:20-slim AS arcium-node

RUN npm install -g pnpm@8.15.4

WORKDIR /app/darkpool-matcher

# Copy darkpool-matcher with Arcium
COPY --from=nodejs-builder /app/darkpool-matcher ./

# Copy Arcium artifacts
COPY --from=solana-builder /app/programs/darkpool/target/idl/darkpool.json ./target/idl/
COPY --from=solana-builder /app/programs/darkpool/target/deploy/darkpool.so ./target/deploy/

# Install dependencies
RUN pnpm install --frozen-lockfile

EXPOSE 3002

CMD ["node", "arcium-node.js"]

# Build Artifacts Image (for deployment)
FROM alpine:latest AS artifacts

WORKDIR /artifacts

# Copy built Solana program
COPY --from=solana-builder /app/programs/darkpool/target/deploy/darkpool.so ./
COPY --from=solana-builder /app/programs/darkpool/target/idl/darkpool.json ./

# Copy Arcium artifacts
COPY --from=solana-builder /app/darkpool-matcher/artifacts ./arcium-artifacts/

CMD ["echo", "Build artifacts ready"]

