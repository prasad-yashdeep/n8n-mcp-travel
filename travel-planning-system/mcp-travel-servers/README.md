# MCP Travel Servers

This directory contains three Model Context Protocol (MCP) servers for travel planning:

1. **Weather Server** (`weather-mcp-server.js`) - Provides weather information and forecasts
2. **Places Server** (`places-mcp-server.js`) - Provides tourist attractions and restaurant information
3. **Flight Server** (`flight-mcp-server.js`) - Provides flight search and pricing information

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager

## Installation

```bash
npm install
```

This will install the required dependencies including the `@modelcontextprotocol/sdk`.

## Available Tools

### Weather Server Tools

- **`get_weather`** - Get current weather for a location
  - Parameters: `location` (required), `date` (optional)
- **`get_forecast`** - Get weather forecast for next 7 days
  - Parameters: `location` (required), `days` (optional, default: 7)

### Places Server Tools

- **`search_attractions`** - Search for tourist attractions in a destination
  - Parameters: `destination` (required), `type` (optional), `limit` (optional)
- **`get_place_details`** - Get detailed information about a specific place
  - Parameters: `placeName` (required), `destination` (required)
- **`get_restaurants`** - Find restaurants in a destination
  - Parameters: `destination` (required), `cuisine` (optional), `priceRange` (optional)

### Flight Server Tools

- **`search_flights`** - Search for flights between origin and destination
  - Parameters: `origin` (required), `destination` (required), `departureDate` (required), `returnDate` (optional), `passengers` (optional), `class` (optional)
- **`get_flight_prices`** - Get price estimates for flights
  - Parameters: `origin` (required), `destination` (required), `month` (optional)

## Testing with MCP Inspector

The MCP Inspector is a tool for testing and debugging MCP servers. You can use it to test each server individually:

### Test Weather Server

```bash
npx @modelcontextprotocol/inspector node weather-mcp-server.js
```

### Test Places Server

```bash
npx @modelcontextprotocol/inspector node places-mcp-server.js
```

### Test Flight Server

```bash
npx @modelcontextprotocol/inspector node flight-mcp-server.js
```

## Using with MCP Inspector

1. **Install MCP Inspector** (if not already installed):
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

2. **Launch Inspector with a server**:
   ```bash
   mcp-inspector node weather-mcp-server.js
   ```

3. **In the Inspector**:
   - The server will automatically connect
   - Go to the "Tools" tab to see available tools
   - Test tool calls with different parameters
   - View server logs in the "Notifications" pane

## Server Architecture

Each server uses the official MCP SDK and implements:

- **Stdio Transport** - Standard input/output communication
- **Tool Registration** - Proper MCP tool definitions with schemas
- **Error Handling** - Comprehensive error responses
- **JSON-RPC 2.0** - Standard MCP protocol compliance

## Development

### Adding New Tools

To add a new tool to any server:

1. Add the tool definition to the `tools/list` handler
2. Implement the tool logic in the `tools/call` handler
3. Test with the MCP Inspector

### Example Tool Addition

```javascript
// In tools/list handler
{
  name: 'new_tool',
  description: 'Description of the new tool',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string' }
    },
    required: ['param1']
  }
}

// In tools/call handler
if (name === 'new_tool') {
  // Implement tool logic here
  return {
    content: [{ type: 'text', text: 'Tool result' }]
  };
}
```

## Integration with n8n

These MCP servers can be integrated with n8n workflows using the MCP nodes. The servers provide travel-related data that can be used in automated travel planning workflows.

## Troubleshooting

### Common Issues

1. **Port conflicts**: These servers use stdio transport, so no port conflicts
2. **Permission errors**: Ensure Node.js has execute permissions
3. **SDK import errors**: Verify `@modelcontextprotocol/sdk` is installed

### Debug Mode

For debugging, you can add console.log statements in the tool handlers:

```javascript
server.setRequestHandler('tools/call', async (request) => {
  console.log('Tool call request:', request);
  // ... rest of handler
});
```

## License

ISC License
