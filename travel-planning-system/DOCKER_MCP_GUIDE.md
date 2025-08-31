# Docker MCP Travel Servers Guide

## 🐳 Overview

The MCP Travel Servers are now fully integrated into the Docker Compose setup as three separate services:

1. **mcp-weather-server** - Port 3000
2. **mcp-places-server** - Port 3001  
3. **mcp-flight-server** - Port 3002

## 🚀 Quick Start

### Start All MCP Services
```bash
# Using the management script (recommended)
./docker-mcp.sh start

# Or using docker-compose directly
docker-compose up -d mcp-weather-server mcp-places-server mcp-flight-server
```

### Check Service Status
```bash
./docker-mcp.sh status
```

### Check Health
```bash
./docker-mcp.sh health
```

### View Logs
```bash
# All services
./docker-mcp.sh logs

# Specific service
./docker-mcp.sh logs mcp-weather-server
```

### Stop Services
```bash
./docker-mcp.sh stop
```

## 🔧 Docker Services Configuration

### Weather Server (Port 3000)
```yaml
mcp-weather-server:
  image: node:20-alpine
  hostname: mcp-weather
  container_name: mcp-weather-server
  networks: ['demo']
  restart: unless-stopped
  ports:
    - 3000:3000
  volumes:
    - ./mcp-travel-servers:/app
    - mcp_storage:/data
  working_dir: /app
  environment:
    - NODE_ENV=production
    - PORT=3000
  command: |
    sh -c "
      npm install
      node weather-mcp-server.js --http --port=3000
    "
  healthcheck:
    test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:3000/health']
    interval: 30s
    timeout: 10s
    retries: 3
```

### Places Server (Port 3001)
```yaml
mcp-places-server:
  image: node:20-alpine
  hostname: mcp-places
  container_name: mcp-places-server
  networks: ['demo']
  restart: unless-stopped
  ports:
    - 3001:3001
  # ... similar configuration
```

### Flight Server (Port 3002)
```yaml
mcp-flight-server:
  image: node:20-alpine
  hostname: mcp-flight
  container_name: mcp-flight-server
  networks: ['demo']
  restart: unless-stopped
  ports:
    - 3002:3002
  # ... similar configuration
```

## 📡 Service Endpoints

### Health Checks
```bash
curl http://localhost:3000/health  # Weather Server
curl http://localhost:3001/health  # Places Server
curl http://localhost:3002/health  # Flight Server
```

### MCP Protocol Endpoints
```bash
# MCP Protocol (POST)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05"}}'

# SSE Stream (GET - requires session ID)
curl -H "mcp-session-id: <session-id>" http://localhost:3000/mcp

# Session Termination (DELETE)
curl -X DELETE -H "mcp-session-id: <session-id>" http://localhost:3000/mcp
```

## 🛠️ Management Script Commands

The `docker-mcp.sh` script provides easy management:

```bash
# Start all MCP services
./docker-mcp.sh start

# Stop all MCP services
./docker-mcp.sh stop

# Restart all MCP services
./docker-mcp.sh restart

# Show service status
./docker-mcp.sh status

# Show logs for all services
./docker-mcp.sh logs

# Show logs for specific service
./docker-mcp.sh logs mcp-weather-server
./docker-mcp.sh logs mcp-places-server
./docker-mcp.sh logs mcp-flight-server

# Check health of all services
./docker-mcp.sh health

# Show help
./docker-mcp.sh help
```

## 🔍 Troubleshooting

### Check Container Status
```bash
docker ps | grep mcp-
```

### View Container Logs
```bash
docker logs mcp-weather-server
docker logs mcp-places-server
docker logs mcp-flight-server
```

### Restart Individual Service
```bash
docker-compose restart mcp-weather-server
```

### Rebuild Service (if code changes)
```bash
docker-compose up -d --build mcp-weather-server
```

### Access Container Shell
```bash
docker exec -it mcp-weather-server sh
```

## 🌐 Network Configuration

All MCP services are part of the `demo` network and can communicate with:
- **n8n** - For workflow integration
- **postgres** - For data persistence (if needed)
- **redis** - For caching (if needed)
- **ollama** - For AI model integration

### Internal Hostnames
- `mcp-weather:3000`
- `mcp-places:3001`
- `mcp-flight:3002`

## 📊 Monitoring

### Health Check Status
Each service includes automatic health checks:
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3
- **Endpoint**: `/health`

### Service Dependencies
The MCP services are independent and don't depend on each other, making them:
- ✅ Highly available
- ✅ Scalable
- ✅ Fault-tolerant

## 🔄 Integration with n8n

The MCP servers can be accessed from n8n workflows using:

### HTTP Request Node
```json
{
  "method": "POST",
  "url": "http://mcp-weather:3000/mcp",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "jsonrpc": "2.0",
    "method": "tools/list"
  }
}
```

### Environment Variables in n8n
The n8n service can access MCP servers via:
- `http://mcp-weather:3000`
- `http://mcp-places:3001`
- `http://mcp-flight:3002`

## 📈 Scaling

### Horizontal Scaling
To run multiple instances of a service:

```yaml
mcp-weather-server-1:
  # ... same config but different port
  ports:
    - 3010:3000

mcp-weather-server-2:
  # ... same config but different port  
  ports:
    - 3011:3000
```

### Load Balancing
Add a reverse proxy (nginx) to distribute requests:

```yaml
nginx-mcp-lb:
  image: nginx:alpine
  ports:
    - 3000:80
  # Configure upstream servers
```

## 🔐 Security Considerations

### Network Isolation
- Services run in isolated `demo` network
- Only necessary ports are exposed
- Internal communication uses hostnames

### Environment Variables
- Production settings via `NODE_ENV=production`
- Sensitive data should use Docker secrets

### Health Monitoring
- Automatic health checks prevent unhealthy containers
- Restart policies ensure service availability

---

## 📋 Service Summary

| Service | Container | Port | Health | Status |
|---------|-----------|------|--------|--------|
| Weather | mcp-weather-server | 3000 | ✅ | Ready |
| Places | mcp-places-server | 3001 | ✅ | Ready |
| Flight | mcp-flight-server | 3002 | ✅ | Ready |

**All MCP services are now Docker-ready and production-ready! 🎉**
