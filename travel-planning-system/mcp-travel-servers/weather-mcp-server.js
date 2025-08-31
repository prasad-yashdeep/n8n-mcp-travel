// ========================================
// WEATHER MCP SERVER using @modelcontextprotocol/sdk v1.17.4
// Supports both stdio and Streamable HTTP transports
// Run: node weather-mcp-server.js [--http] [--port 3000]
// ========================================

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { InMemoryEventStore } = require('@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js');
const { isInitializeRequest } = require('@modelcontextprotocol/sdk/types.js');
const { randomUUID } = require('node:crypto');
const express = require('express');
const cors = require('cors');
const { z } = require('zod');

// Parse command line arguments
const useHttp = process.argv.includes('--http');
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const HTTP_PORT = portArg ? parseInt(portArg.split('=')[1]) : 3000;

// Create MCP server factory function
const createServer = () => {
  const server = new McpServer({
    name: 'weather-mcp-server',
    version: '1.0.0',
  });

  // Register get_weather tool
  server.registerTool('get_weather', {
    description: 'Get current weather for a location',
    inputSchema: {
      location: z.string().describe('City name or coordinates'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format (optional)'),
    },
  }, async ({ location, date }) => {
    const weatherData = {
      location: location,
      date: date || new Date().toISOString().split('T')[0],
      temperature: Math.floor(Math.random() * 20) + 15,
      conditions: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
      humidity: Math.floor(Math.random() * 40) + 40,
      windSpeed: Math.floor(Math.random() * 20) + 5,
      unit: 'celsius',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(weatherData, null, 2),
        },
      ],
    };
  });

  // Register get_forecast tool
  server.registerTool('get_forecast', {
    description: 'Get weather forecast for next 7 days',
    inputSchema: {
      location: z.string().describe('City name or coordinates'),
      days: z.number().optional().default(7).describe('Number of days for forecast (default: 7)'),
    },
  }, async ({ location, days = 7 }) => {
    const forecast = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      forecast.push({
        date: date.toISOString().split('T')[0],
        high: Math.floor(Math.random() * 10) + 20,
        low: Math.floor(Math.random() * 10) + 10,
        conditions: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
        precipitationChance: Math.floor(Math.random() * 100),
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              location: location,
              forecast: forecast,
              unit: 'celsius',
            },
            null,
            2
          ),
        },
      ],
    };
  });

  return server;
};

// Stdio transport function
async function startStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Weather MCP Server started (stdio transport)');
  console.log('Test with MCP Inspector: npx @modelcontextprotocol/inspector node weather-mcp-server.js');
}

// HTTP transport function
async function startHttpServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Map to store transports by session ID
  const transports = {};

  // MCP POST endpoint
  const mcpPostHandler = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    
    try {
      let transport;
      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        const eventStore = new InMemoryEventStore();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          eventStore,
          onsessioninitialized: (sessionId) => {
            console.log(`Session initialized with ID: ${sessionId}`);
            transports[sessionId] = transport;
          }
        });

        // Set up onclose handler
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.log(`Transport closed for session ${sid}`);
            delete transports[sid];
          }
        };

        // Connect the transport to the MCP server
        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  };

  // MCP GET endpoint for SSE streams
  const mcpGetHandler = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  // MCP DELETE endpoint for session termination
  const mcpDeleteHandler = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    try {
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('Error handling session termination:', error);
      if (!res.headersSent) {
        res.status(500).send('Error processing session termination');
      }
    }
  };

  // Set up routes
  app.post('/mcp', mcpPostHandler);
  app.get('/mcp', mcpGetHandler);
  app.delete('/mcp', mcpDeleteHandler);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'weather-mcp-server', transport: 'http' });
  });

  app.listen(HTTP_PORT, (error) => {
    if (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    console.log(`Weather MCP Server listening on port ${HTTP_PORT} (HTTP transport)`);
    console.log(`Health check: http://localhost:${HTTP_PORT}/health`);
    console.log(`MCP endpoint: http://localhost:${HTTP_PORT}/mcp`);
  });

  // Handle server shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    for (const sessionId in transports) {
      try {
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }
    process.exit(0);
  });
}

// Main function
async function main() {
  if (useHttp) {
    await startHttpServer();
  } else {
    await startStdioServer();
  }
}

main().catch(console.error);
