# ArcSilence Darkpool - Docker Setup

This guide explains how to run the complete ArcSilence darkpool application using Docker. The Docker setup packages all services, dependencies, and configurations for easy deployment.

## 🏗️ Architecture Overview

The ArcSilence application consists of several services:

- **Web App** (`web`): Next.js frontend for user interaction
- **Solver-Relayer** (`solver-relayer`): Backend service handling orders and Arcium integration
- **Darkpool Matcher** (`darkpool-matcher`): Matching engine for private order execution
- **Arcium Node** (`arcium-node`): MPC computation nodes for privacy-preserving matching
- **PostgreSQL** (`postgres`): Database for persistent storage (optional)
- **Redis** (`redis`): Cache and session storage (optional)
- **Nginx** (`nginx`): Reverse proxy for production deployment (optional)

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+ or Docker Compose v1.29+
- At least 4GB RAM available
- At least 10GB free disk space

### System Requirements

```bash
# Check Docker installation
docker --version
docker-compose --version  # or docker compose version

# Ensure Docker daemon is running
docker info
```

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd arcsilence

# Make scripts executable
chmod +x build-docker.sh run-docker.sh
```

### 2. Configure Environment

Edit the production environment files with your actual values:

```bash
# Web app configuration
cp env.web.production env.web.production.local
nano env.web.production.local  # Edit with your settings

# Solver-relayer configuration
cp env.solver-relayer.production env.solver-relayer.production.local
nano env.solver-relayer.production.local  # Edit with your settings
```

**Important Environment Variables:**

For `env.web.production`:
```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_DARKPOOL_PROGRAM_ID=CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg
NEXT_PUBLIC_SOLVER_URL=http://solver-relayer:8080
```

For `env.solver-relayer.production`:
```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
DARKPOOL_PROGRAM_ID=CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg
ARCIUM_API_KEY=your_actual_arcium_api_key
# DARKPOOL_ADMIN_KEYPAIR=/app/wallet/admin-keypair.json
```

### 3. Setup Wallet (Optional but Recommended)

```bash
# Create wallet directory
mkdir -p wallet

# Copy your Solana keypair (if you have one)
# cp ~/.config/solana/id.json wallet/admin-keypair.json

# Or generate a new one (for testing only)
# docker run --rm -v $(pwd)/wallet:/wallet solana-cli:latest solana-keygen new --no-passphrase --outfile /wallet/admin-keypair.json
```

### 4. Build and Run

```bash
# Build all Docker images
./build-docker.sh

# Run complete production stack (recommended)
./run-docker.sh

# Or explicitly specify production mode
./run-docker.sh --production

# Run in detached mode (background)
./run-docker.sh --detached
```

## 🔧 Detailed Configuration

### Environment Files

#### Web App Environment (`env.web.production`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_SOLANA_NETWORK` | Solana network (mainnet-beta/devnet/testnet) | mainnet-beta |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana RPC endpoint | https://api.mainnet-beta.solana.com |
| `NEXT_PUBLIC_DARKPOOL_PROGRAM_ID` | Deployed program ID | CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg |
| `NEXT_PUBLIC_SOLVER_URL` | Solver-relayer service URL | http://solver-relayer:8080 |

#### Solver-Relayer Environment (`env.solver-relayer.production`)

| Variable | Description | Default |
|----------|-------------|---------|
| `SOLANA_RPC_URL` | Solana RPC endpoint | https://api.mainnet-beta.solana.com |
| `DARKPOOL_PROGRAM_ID` | Program ID | CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg |
| `ARCIUM_USE_REAL` | Use real Arcium MPC | true |
| `ARCIUM_NETWORK` | Arcium network | mainnet |
| `ARCIUM_API_KEY` | Arcium API key | *required* |
| `PORT` | Service port | 8080 |
| `LOG_LEVEL` | Logging level | info |

### Service Profiles

The Docker Compose setup uses profiles to enable optional services:

- **`db`**: PostgreSQL database
- **`cache`**: Redis cache
- **`proxy`**: Nginx reverse proxy
- **`arcium`**: Arcium MPC nodes

```bash
# Run with database
./run-docker.sh --with-db --detached

# Run with all optional services
./run-docker.sh --full --detached
```

## 🌐 Service Configuration

### Complete Production Stack (Default)

**All services run by default** in production mode:

#### 🚀 Core Trading Services:
- **Web App** (`web`): Next.js frontend for trading
- **Solver-Relayer** (`solver-relayer`): Backend API and order processing
- **Darkpool Matcher** (`darkpool-matcher`): Order matching engine

#### 🔧 Infrastructure Services:
- **PostgreSQL** (`postgres`): Database for persistent storage
- **Redis** (`redis`): Cache and session management
- **Nginx** (`nginx`): Reverse proxy and load balancer

#### 🔒 Privacy Services:
- **Arcium MPC Node** (`arcium-node`): Privacy-preserving computation

### Quick Reference

```bash
# Production (complete stack - recommended)
./run-docker.sh --production

# Or simply (same as above)
./run-docker.sh

# Detached mode (background)
./run-docker.sh --detached
```

## 🌐 Accessing the Application

Once running, access all services at:

- **Web App**: http://localhost:3000 (or http://localhost via Nginx proxy)
- **Solver-Relayer API**: http://localhost:8080
- **Darkpool Matcher**: http://localhost:3001
- **Arcium MPC Node**: http://localhost:3002
- **PostgreSQL**: localhost:5432 (internal only)
- **Redis**: localhost:6379 (internal only)
- **Nginx Proxy**: http://localhost (main entry point)

### Health Checks

```bash
# Check service health
curl http://localhost:8080/health
curl http://localhost:3000/api/health

# View service logs
docker-compose logs -f web
docker-compose logs -f solver-relayer

# View all logs
docker-compose logs -f
```

## 🔨 Development Workflow

### Rebuilding Images

```bash
# Rebuild all images
./build-docker.sh

# Rebuild specific service
docker-compose build web
docker-compose build solver-relayer

# Rebuild and restart
docker-compose up --build -d web
```

### Development with Hot Reload

For development with hot reload, use the local setup instead of Docker:

```bash
# Install dependencies
pnpm install

# Start services locally
pnpm --filter @arc-silence/web dev
pnpm --filter @arc-silence/solver-relayer dev
```

### Debugging

```bash
# Enter a running container
docker-compose exec web sh
docker-compose exec solver-relayer sh

# View container resource usage
docker stats

# Clean up
docker system prune -a
docker volume prune
```

## 🚀 Production Deployment

### Using Nginx Reverse Proxy

```bash
# Run with nginx proxy
./run-docker.sh --with-proxy --detached

# Configure SSL (optional)
# Place certificates in ssl/ directory
# Update nginx.conf with SSL configuration
```

### Scaling Services

```bash
# Scale solver-relayer instances
docker-compose up -d --scale solver-relayer=3

# Scale Arcium nodes
docker-compose up -d --scale arcium-node=2
```

### Load Balancing

For production load balancing, consider:

1. **External Load Balancer**: AWS ALB, NGINX Ingress, etc.
2. **Service Mesh**: Istio, Linkerd for advanced routing
3. **Database Clustering**: PostgreSQL with replication

## 🔒 Security Considerations

### Production Checklist

- [ ] Change default PostgreSQL password
- [ ] Use strong ARCIUM_API_KEY
- [ ] Configure SSL certificates
- [ ] Set up proper firewall rules
- [ ] Enable Docker security features
- [ ] Monitor resource usage
- [ ] Set up log aggregation
- [ ] Configure backup strategies

### Wallet Security

```bash
# Store wallet keypairs securely
# Use Docker secrets or external key management
# Never commit private keys to version control

# Example with Docker secrets
echo "your-keypair-json" | docker secret create admin_keypair -
```

## 📊 Monitoring and Maintenance

### Logs and Monitoring

```bash
# View all service logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f solver-relayer

# Export logs
docker-compose logs > arcsilence-logs.txt
```

### Database Maintenance

```bash
# Backup database (if using postgres profile)
docker-compose exec postgres pg_dump -U arcsilence arcsilence > backup.sql

# Access database
docker-compose exec postgres psql -U arcsilence -d arcsilence
```

### Updates and Upgrades

```bash
# Pull latest images
docker-compose pull

# Update and restart
docker-compose up -d --build

# Rolling update (zero downtime)
docker-compose up -d --scale web=2 --no-recreate
docker-compose up -d --scale web=1 --no-recreate
```

## 🐛 Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check build logs
docker-compose build --progress=plain
```

#### Service Startup Issues

```bash
# Check service status
docker-compose ps

# Restart specific service
docker-compose restart solver-relayer

# View service configuration
docker-compose config
```

#### Network Issues

```bash
# Check network connectivity
docker-compose exec web ping solver-relayer

# Recreate network
docker-compose down
docker-compose up -d
```

#### Resource Issues

```bash
# Check resource usage
docker stats

# Increase Docker memory limit
# Docker Desktop: Preferences > Resources > Memory
```

### Getting Help

1. Check the [Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md)
2. View service logs: `docker-compose logs -f`
3. Check Docker status: `docker info`
4. Verify environment files are correct
5. Ensure all required ports are available

## 📚 Additional Resources

- [ArcSilence Documentation](README.md)
- [Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)

## 🤝 Contributing

When making changes to the Docker setup:

1. Update this README if adding new services
2. Test the build process: `./build-docker.sh`
3. Test the run process: `./run-docker.sh --detached`
4. Update environment templates if adding new variables
5. Document any new profiles or optional services

---

**Happy trading with ArcSilence! 🔒⚡**
