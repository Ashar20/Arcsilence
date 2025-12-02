#!/bin/bash

# ArcSilence Docker Run Script
# This script runs the complete ArcSilence darkpool application stack

set -e

echo "🚀 Starting ArcSilence Darkpool..."

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

# Parse command line arguments
PROFILES=""
SERVICES=""
DETACHED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --detached|-d)
            DETACHED=true
            shift
            ;;
        --with-db)
            PROFILES="$PROFILES --profile db"
            shift
            ;;
        --with-cache)
            PROFILES="$PROFILES --profile cache"
            shift
            ;;
        --with-proxy)
            PROFILES="$PROFILES --profile proxy"
            shift
            ;;
        --with-arcium)
            PROFILES="$PROFILES --profile arcium"
            shift
            ;;
        --full)
            PROFILES="--profile db --profile cache --profile proxy --profile arcium"
            shift
            ;;
        --production)
            # Production mode: all services (web, solver-relayer, darkpool-matcher, database, cache, proxy, Arcium)
            PROFILES=""
            print_success "Production mode: Running complete ArcSilence stack with all services"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --detached, -d          Run in detached mode (background)"
            echo "  --production            Run complete production stack (default)"
            echo "  --with-db               Include PostgreSQL database (deprecated - now default)"
            echo "  --with-cache            Include Redis cache (deprecated - now default)"
            echo "  --with-proxy            Include Nginx reverse proxy (deprecated - now default)"
            echo "  --with-arcium           Include Arcium MPC nodes (deprecated - now default)"
            echo "  --full                  Run all services (deprecated - same as --production)"
            echo "  --help, -h              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                      # Run complete production stack"
            echo "  $0 --production         # Run complete production stack (explicit)"
            echo "  $0 --detached           # Run complete stack in background"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if images exist
if ! docker images | grep -q arcsilence; then
    print_warning "Docker images not found. Building images first..."
    ./build-docker.sh
fi

# Check environment files
if [ ! -f "env.web.production" ]; then
    print_warning "env.web.production not found. Using default configuration."
fi

if [ ! -f "env.solver-relayer.production" ]; then
    print_warning "env.solver-relayer.production not found. Using default configuration."
fi

# Start the services
print_status "Starting ArcSilence services..."

if [ "$DETACHED" = true ]; then
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d $PROFILES
    else
        docker compose up -d $PROFILES
    fi
    print_success "Services started in detached mode!"
else
    if command -v docker-compose &> /dev/null; then
        docker-compose up $PROFILES
    else
        docker compose up $PROFILES
    fi
fi

# Show service status
echo ""
print_success "ArcSilence is running! Complete production stack active."
echo ""
echo "🚀 Core Services:"
echo "  🌐 Web App:        http://localhost:3000"
echo "  🔧 Solver-Relayer: http://localhost:8080"
echo "  ⚡ Darkpool Matcher: http://localhost:3001"
echo ""
echo "🔧 Infrastructure Services:"
echo "  🗄️  PostgreSQL:     localhost:5432"
echo "  🚀 Redis Cache:    localhost:6379"
echo "  🌐 Nginx Proxy:    http://localhost"
echo ""
echo "🔒 Privacy Services:"
echo "  🔒 Arcium MPC Node: http://localhost:3002"
echo ""

echo "To stop the services:"
echo "  docker-compose down"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f [service-name]"
echo "  docker-compose logs -f  # All services"
