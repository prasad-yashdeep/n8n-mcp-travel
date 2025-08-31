# MCP Travel Servers Setup Guide

## Overview

This project now includes three fully functional Model Context Protocol (MCP) servers that can be used with the MCP Inspector and other MCP clients:

1. **Weather MCP Server** (`weather-mcp-server.js`)
2. **Places MCP Server** (`places-mcp-server.js`) 
3. **Flight MCP Server** (`flight-mcp-server.js`)

## ✅ Fixed Issues

The servers have been updated to use the correct MCP SDK v1.17.4 API:

- ✅ Updated to MCP SDK v1.17.4 (correct version)
- ✅ Migrated to new `McpServer` class and `registerTool` API
- ✅ Implemented Zod schema validation for inputs
- ✅ Fixed connection issues with MCP Inspector
- ✅ Added Streamable HTTP transport support
- ✅ All servers now support both stdio and HTTP transports
- ✅ All servers now start without errors

## 🚀 Quick Start

### Test Individual Servers with MCP Inspector

#### Stdio Transport (Default)
```bash
# Test Weather Server
npx @modelcontextprotocol/inspector node weather-mcp-server.js

# Test Places Server  
npx @modelcontextprotocol/inspector node places-mcp-server.js

# Test Flight Server
npx @modelcontextprotocol/inspector node flight-mcp-server.js
```

#### HTTP Transport
```bash
# Start servers with HTTP transport
npm run start:weather:http    # Port 3000
npm run start:places:http     # Port 3001  
npm run start:flight:http     # Port 3002

# Or start all at once
npm run start:all:http

# Health checks
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Available Tools

#### Weather Server
- `get_weather` - Get current weather for a location
- `get_forecast` - Get weather forecast for next 7 days

#### Places Server  
- `search_attractions` - Search for tourist attractions
- `get_place_details` - Get detailed place information
- `get_restaurants` - Find restaurants in a destination

#### Flight Server
- `search_flights` - Search for flights between destinations
- `get_flight_prices` - Get flight price estimates

## 🚀 Transport Options

### Stdio Transport (Default)
- **Best for**: MCP Inspector, Claude Desktop, command-line tools
- **Communication**: Standard input/output streams
- **Usage**: `node weather-mcp-server.js`

### Streamable HTTP Transport
- **Best for**: Web applications, REST clients, browser-based tools
- **Communication**: HTTP with Server-Sent Events (SSE) for streaming
- **Usage**: `node weather-mcp-server.js --http --port=3000`
- **Endpoints**:
  - `POST /mcp` - MCP protocol messages
  - `GET /mcp` - SSE stream (requires session ID)
  - `DELETE /mcp` - Session termination
  - `GET /health` - Health check

## 🔧 Using the MCP Inspector

### With Stdio Transport
1. **Launch Inspector**: `npx @modelcontextprotocol/inspector node weather-mcp-server.js`
2. **Inspector Interface**: A web interface will open automatically
3. **Test Tools**: 
   - Go to the "Tools" tab to see available tools
   - Click on any tool to test it with parameters
   - View results and server logs

### With HTTP Transport
1. **Start Server**: `npm run start:weather:http`
2. **Connect via HTTP**: Use any HTTP client or web application
3. **MCP Endpoint**: `http://localhost:3000/mcp`

### Example Tool Calls

**Weather Server:**
```json
{
  "location": "Tokyo, Japan",
  "date": "2024-01-15"
}
```

**Places Server:**
```json
{
  "destination": "Paris, France",
  "type": "landmark",
  "limit": 3
}
```

**Flight Server:**
```json
{
  "origin": "NYC",
  "destination": "LAX", 
  "departureDate": "2024-02-01",
  "passengers": 2
}
```

## 🏗️ Architecture

Each server implements:
- **MCP Protocol Compliance** - Full JSON-RPC 2.0 support
- **Stdio Transport** - Standard input/output communication
- **Tool Schema Validation** - Proper input/output schemas
- **Error Handling** - Comprehensive error responses

## 🔗 Integration Options

### With n8n Workflows
These servers can be integrated into n8n workflows using MCP nodes for automated travel planning.

### With Claude Desktop
Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["path/to/weather-mcp-server.js"]
    },
    "places": {
      "command": "node", 
      "args": ["path/to/places-mcp-server.js"]
    },
    "flights": {
      "command": "node",
      "args": ["path/to/flight-mcp-server.js"] 
    }
  }
}
```

### With Other MCP Clients
Any MCP-compatible client can connect to these servers using the stdio transport.

## 📝 Next Steps

1. **Test with Inspector** - Verify all tools work as expected
2. **Customize Data** - Replace mock data with real API integrations
3. **Add Authentication** - Implement API keys for real services
4. **Deploy** - Set up production deployment if needed

## 🐛 Troubleshooting

- **Import Errors**: Ensure `@modelcontextprotocol/sdk` v0.5.0 is installed
- **Schema Errors**: Verify you're using `ListToolsRequestSchema` and `CallToolRequestSchema`
- **Transport Issues**: MCP servers use stdio transport, not HTTP ports

## 📚 Resources

- [MCP Inspector Documentation](https://modelcontextprotocol.io/legacy/tools/inspector)
- [MCP SDK Documentation](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

---

**Status**: ✅ All servers operational and ready for testing with MCP Inspector
