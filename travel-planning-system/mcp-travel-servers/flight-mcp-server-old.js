// ========================================
// FLIGHT MCP SERVER using @modelcontextprotocol/sdk v1.17.4
// Run: node flight-mcp-server.js
// ========================================

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

// Create MCP server
const mcpServer = new McpServer({
  name: 'flight-mcp-server',
  version: '1.0.0',
});

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

// Register search_flights tool
mcpServer.registerTool('search_flights', {
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
mcpServer.registerTool('get_flight_prices', {
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.log('Flight MCP Server started (stdio transport)');
  console.log('Test with MCP Inspector: npx @modelcontextprotocol/inspector node flight-mcp-server.js');
}

main().catch(console.error);
