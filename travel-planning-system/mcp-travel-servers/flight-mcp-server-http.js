// ========================================
// FLIGHT MCP SERVER using @modelcontextprotocol/sdk v1.17.4
// Supports both stdio and Streamable HTTP transports
// Run: node flight-mcp-server-http.js [--http] [--port 3002]
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
const HTTP_PORT = portArg ? parseInt(portArg.split('=')[1]) : 3002;

// Helper function to generate flights
function generateFlights(args) {
  const airlines = ['United', 'Delta', 'American', 'JetBlue', 'Southwest'];
  const flights = [];

  for (let i = 0; i < 5; i++) {
    const basePrice = args.class === 'business' ? 1500 : args.class === 'first' ? 3500 : 400;
    flights.push({
      flightNumber: `${airlines[i].substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
      airline: airlines[i],
      departure: {
        airport: args.origin,
        time: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      },
      arrival: {
        airport: args.destination,
        time: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      },
      duration: `${Math.floor(Math.random() * 10) + 2}h ${Math.floor(Math.random() * 60)}m`,
      price: basePrice + Math.floor(Math.random() * 500),
      stops: Math.random() > 0.7 ? 1 : 0,
      class: args.class || 'economy',
    });
  }

  return flights.sort((a, b) => a.price - b.price);
}

// Create MCP server factory function
const createServer = () => {
  const server = new McpServer({
    name: 'flight-mcp-server',
    version: '1.0.0',
  });

  // Register search_flights tool
  server.registerTool('search_flights', {
    description: 'Search for flights between origin and destination',
    inputSchema: {
      origin: z.string().describe('Origin airport or city code'),
      destination: z.string().describe('Destination airport or city code'),
      departureDate: z.string().describe('Departure date in YYYY-MM-DD format'),
      returnDate: z.string().optional().describe('Return date in YYYY-MM-DD format'),
      passengers: z.number().optional().default(1).describe('Number of passengers'),
      class: z.enum(['economy', 'business', 'first']).optional().default('economy').describe('Flight class'),
    },
  }, async ({ origin, destination, departureDate, returnDate, passengers = 1, class: flightClass = 'economy' }) => {
    const flights = generateFlights({ origin, destination, departureDate, returnDate, passengers, class: flightClass });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              search: {
                origin: origin,
                destination: destination,
                departureDate: departureDate,
                returnDate: returnDate,
                passengers: passengers,
                class: flightClass,
              },
              flights: flights,
              cheapestPrice: Math.min(...flights.map((f) => f.price)),
              averagePrice: Math.floor(flights.reduce((a, f) => a + f.price, 0) / flights.length),
            },
            null,
            2
          ),
        },
      ],
    };
  });

  // Register get_flight_prices tool
  server.registerTool('get_flight_prices', {
    description: 'Get price estimates for flights',
    inputSchema: {
      origin: z.string().describe('Origin airport or city code'),
      destination: z.string().describe('Destination airport or city code'),
      month: z.string().optional().describe('Month in YYYY-MM format'),
    },
  }, async ({ origin, destination, month }) => {
    const priceEstimate = {
      origin: origin,
      destination: destination,
      month: month || new Date().toISOString().slice(0, 7),
      priceRange: {
        economy: { min: 300, max: 800, average: 550 },
        business: { min: 1200, max: 2500, average: 1850 },
        first: { min: 3000, max: 6000, average: 4500 },
      },
      recommendation: 'Book 3-4 weeks in advance for best prices',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(priceEstimate, null, 2),
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
  console.log('Flight MCP Server started (stdio transport)');
  console.log('Test with MCP Inspector: npx @modelcontextprotocol/inspector node flight-mcp-server-http.js');
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
    res.json({ status: 'ok', service: 'flight-mcp-server', transport: 'http' });
  });

  app.listen(HTTP_PORT, (error) => {
    if (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    console.log(`Flight MCP Server listening on port ${HTTP_PORT} (HTTP transport)`);
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
