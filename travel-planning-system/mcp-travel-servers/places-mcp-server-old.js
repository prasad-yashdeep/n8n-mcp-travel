// ========================================
// PLACES MCP SERVER using @modelcontextprotocol/sdk v1.17.4
// Run: node places-mcp-server.js
// ========================================

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

// Create MCP server
const mcpServer = new McpServer({
  name: 'places-mcp-server',
  version: '1.0.0',
});

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

// Register search_attractions tool
mcpServer.registerTool('search_attractions', {
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
mcpServer.registerTool('get_place_details', {
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
mcpServer.registerTool('get_restaurants', {
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.log('Places MCP Server started (stdio transport)');
  console.log('Test with MCP Inspector: npx @modelcontextprotocol/inspector node places-mcp-server.js');
}

main().catch(console.error);
