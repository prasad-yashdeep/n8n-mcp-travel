// ========================================
// PLACES MCP SERVER using @modelcontextprotocol/sdk v1.17.4
// Supports both stdio and Streamable HTTP transports
// Run: node places-mcp-server-http.js [--http] [--port 3001]
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
const HTTP_PORT = portArg ? parseInt(portArg.split('=')[1]) : 3001;

// Sample places database
const placesDB = {
  'Tokyo, Japan': [
    { name: 'Senso-ji Temple', type: 'cultural', rating: 4.8, cost: 0 },
    { name: 'Tokyo Skytree', type: 'landmark', rating: 4.7, cost: 20 },
    { name: 'Tsukiji Outer Market', type: 'food', rating: 4.6, cost: 15 },
    { name: 'Meiji Shrine', type: 'cultural', rating: 4.7, cost: 0 },
    { name: 'Shibuya Crossing', type: 'landmark', rating: 4.5, cost: 0 },
  ],
  'Paris, France': [
    { name: 'Eiffel Tower', type: 'landmark', rating: 4.9, cost: 25 },
    { name: 'Louvre Museum', type: 'museum', rating: 4.8, cost: 20 },
    { name: 'Notre-Dame', type: 'cultural', rating: 4.7, cost: 10 },
    { name: 'Arc de Triomphe', type: 'landmark', rating: 4.6, cost: 12 },
    { name: 'Versailles Palace', type: 'cultural', rating: 4.8, cost: 30 },
  ],
};

// Helper functions
function generatePlaces(destination) {
  const types = ['cultural', 'landmark', 'museum', 'food'];
  const places = [];
  for (let i = 0; i < 10; i++) {
    places.push({
      name: `${destination} Attraction ${i + 1}`,
      type: types[Math.floor(Math.random() * types.length)],
      rating: (Math.random() * 2 + 3).toFixed(1),
      cost: Math.floor(Math.random() * 50),
    });
  }
  return places;
}

function generateRestaurants(destination, cuisine, priceRange) {
  const restaurants = [];
  for (let i = 0; i < 5; i++) {
    restaurants.push({
      name: `${cuisine || 'Local'} Restaurant ${i + 1}`,
      cuisine: cuisine || 'Local',
      priceRange: priceRange || 'moderate',
      rating: (Math.random() * 2 + 3).toFixed(1),
      address: `${i + 1} Main Street, ${destination}`,
    });
  }
  return restaurants;
}

// Create MCP server factory function
const createServer = () => {
  const server = new McpServer({
    name: 'places-mcp-server',
    version: '1.0.0',
  });

  // Register search_attractions tool
  server.registerTool('search_attractions', {
    description: 'Search for tourist attractions in a destination',
    inputSchema: {
      destination: z.string().describe('Destination city or location'),
      type: z.enum(['cultural', 'landmark', 'museum', 'food', 'all']).optional().describe('Type of attraction'),
      limit: z.number().optional().default(5).describe('Maximum number of results'),
    },
  }, async ({ destination, type, limit = 5 }) => {
    const places = placesDB[destination] || generatePlaces(destination);
    const filtered = type && type !== 'all' 
      ? places.filter((p) => p.type === type)
      : places;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              destination: destination,
              attractions: filtered.slice(0, limit),
              totalFound: filtered.length,
            },
            null,
            2
          ),
        },
      ],
    };
  });

  // Register get_place_details tool
  server.registerTool('get_place_details', {
    description: 'Get detailed information about a specific place',
    inputSchema: {
      placeName: z.string().describe('Name of the place to get details for'),
      destination: z.string().describe('Destination city or location'),
    },
  }, async ({ placeName, destination }) => {
    const places = placesDB[destination] || generatePlaces(destination);
    const place = places.find((p) =>
      p.name.toLowerCase().includes(placeName.toLowerCase())
    );

    if (place) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                place: place,
                destination: destination,
              },
              null,
              2
            ),
          },
        ],
      };
    } else {
      throw new Error(`Place '${placeName}' not found in ${destination}`);
    }
  });

  // Register get_restaurants tool
  server.registerTool('get_restaurants', {
    description: 'Find restaurants in a destination',
    inputSchema: {
      destination: z.string().describe('Destination city or location'),
      cuisine: z.string().optional().describe('Type of cuisine'),
      priceRange: z.enum(['budget', 'moderate', 'expensive']).optional().describe('Price range preference'),
    },
  }, async ({ destination, cuisine, priceRange }) => {
    const restaurants = generateRestaurants(destination, cuisine, priceRange);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              destination: destination,
              restaurants: restaurants,
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
  console.log('Places MCP Server started (stdio transport)');
  console.log('Test with MCP Inspector: npx @modelcontextprotocol/inspector node places-mcp-server-http.js');
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
    res.json({ status: 'ok', service: 'places-mcp-server', transport: 'http' });
  });

  app.listen(HTTP_PORT, (error) => {
    if (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    console.log(`Places MCP Server listening on port ${HTTP_PORT} (HTTP transport)`);
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
