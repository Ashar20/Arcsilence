#!/bin/bash

# ArcSilence Docker Build Script
# This script builds all Docker images for the ArcSilence darkpool application

set -e

echo "🏗️  Building ArcSilence Docker Images..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p wallet
mkdir -p arcium-data
mkdir -p ssl

# Check if environment files exist
if [ ! -f "env.web.production" ]; then
    print_warning "env.web.production not found. Creating from template..."
    cp env.web.production env.web.production.backup 2>/dev/null || true
fi

if [ ! -f "env.solver-relayer.production" ]; then
    print_warning "env.solver-relayer.production not found. Creating from template..."
    cp env.solver-relayer.production env.solver-relayer.production.backup 2>/dev/null || true
fi

# Build the Docker images
print_status "Building Docker images..."
if command -v docker-compose &> /dev/null; then
    docker-compose build --parallel
else
    docker compose build --parallel
fi

print_success "All Docker images built successfully!"

# Show built images
print_status "Built images:"
docker images | grep arcsilence || docker images | grep -E "(web|solver-relayer|darkpool-matcher|arcium-node)"

echo ""
print_success "Build complete! You can now run the complete ArcSilence stack:"
echo "  ./run-docker.sh                 # Run everything"
echo "  ./run-docker.sh --detached      # Run in background"
echo "  ./run-docker.sh --production    # Explicit production mode"
echo ""
echo "All services included:"
echo "  🌐 Web App, 🔧 Solver-Relayer, ⚡ Darkpool Matcher"
echo "  🔒 Arcium MPC, 🗄️ PostgreSQL, 🚀 Redis, 🌐 Nginx"
