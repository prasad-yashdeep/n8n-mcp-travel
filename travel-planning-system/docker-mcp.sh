#!/bin/bash

# Docker MCP Services Management Script
# Usage: ./docker-mcp.sh [start|stop|restart|status|logs|health]

set -e

COMPOSE_FILE="docker-compose.yml"
MCP_SERVICES=("mcp-weather-server" "mcp-places-server" "mcp-flight-server")

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

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Function to start MCP services
start_services() {
    print_status "Starting MCP Travel Servers..."
    
    for service in "${MCP_SERVICES[@]}"; do
        print_status "Starting $service..."
        docker-compose -f $COMPOSE_FILE up -d $service
    done
    
    print_success "All MCP services started!"
    print_status "Services available at:"
    echo "  - Weather Server: http://localhost:3000"
    echo "  - Places Server:  http://localhost:3001"
    echo "  - Flight Server:  http://localhost:3002"
}

# Function to stop MCP services
stop_services() {
    print_status "Stopping MCP Travel Servers..."
    
    for service in "${MCP_SERVICES[@]}"; do
        print_status "Stopping $service..."
        docker-compose -f $COMPOSE_FILE stop $service
    done
    
    print_success "All MCP services stopped!"
}

# Function to restart MCP services
restart_services() {
    print_status "Restarting MCP Travel Servers..."
    stop_services
    sleep 2
    start_services
}

# Function to show service status
show_status() {
    print_status "MCP Travel Servers Status:"
    echo ""
    
    for service in "${MCP_SERVICES[@]}"; do
        status=$(docker-compose -f $COMPOSE_FILE ps -q $service 2>/dev/null)
        if [ -n "$status" ]; then
            container_status=$(docker inspect --format='{{.State.Status}}' $status 2>/dev/null || echo "not found")
            if [ "$container_status" = "running" ]; then
                print_success "$service: Running"
            else
                print_warning "$service: $container_status"
            fi
        else
            print_error "$service: Not found"
        fi
    done
}

# Function to show logs
show_logs() {
    service=${2:-""}
    
    if [ -n "$service" ]; then
        if [[ " ${MCP_SERVICES[@]} " =~ " ${service} " ]]; then
            print_status "Showing logs for $service..."
            docker-compose -f $COMPOSE_FILE logs -f $service
        else
            print_error "Invalid service name. Available services: ${MCP_SERVICES[*]}"
            exit 1
        fi
    else
        print_status "Showing logs for all MCP services..."
        docker-compose -f $COMPOSE_FILE logs -f "${MCP_SERVICES[@]}"
    fi
}

# Function to check health
check_health() {
    print_status "Checking MCP Services Health..."
    echo ""
    
    services=(
        "Weather:3000"
        "Places:3001"
        "Flight:3002"
    )
    
    for service_port in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service_port"
        
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/health" | grep -q "200"; then
            print_success "$name Server (port $port): Healthy"
        else
            print_error "$name Server (port $port): Unhealthy or not responding"
        fi
    done
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start     Start all MCP services"
    echo "  stop      Stop all MCP services"
    echo "  restart   Restart all MCP services"
    echo "  status    Show service status"
    echo "  logs      Show logs for all services"
    echo "  logs <service>  Show logs for specific service"
    echo "  health    Check health of all services"
    echo "  help      Show this help message"
    echo ""
    echo "Available services: ${MCP_SERVICES[*]}"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs mcp-weather-server"
    echo "  $0 health"
}

# Main script logic
main() {
    check_docker
    
    case "${1:-help}" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$@"
            ;;
        health)
            check_health
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
