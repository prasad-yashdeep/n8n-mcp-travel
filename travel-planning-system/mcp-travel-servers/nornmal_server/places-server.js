
// ========================================
// 2. PLACES SERVICE (places-server.js)
// Run: node places-server.js
// Port: 3001
// ========================================

const express = require('express');
const cors = require('cors');

class PlacesMCPServer {
    constructor(port = 3001) {
      this.app = express();
      this.port = port;
      this.setupMiddleware();
      this.setupRoutes();
      
      // Sample places database
      this.placesDB = {
        "Tokyo, Japan": [
          { name: "Senso-ji Temple", type: "cultural", rating: 4.8, cost: 0 },
          { name: "Tokyo Skytree", type: "landmark", rating: 4.7, cost: 20 },
          { name: "Tsukiji Outer Market", type: "food", rating: 4.6, cost: 15 },
          { name: "Meiji Shrine", type: "cultural", rating: 4.7, cost: 0 },
          { name: "Shibuya Crossing", type: "landmark", rating: 4.5, cost: 0 }
        ],
        "Paris, France": [
          { name: "Eiffel Tower", type: "landmark", rating: 4.9, cost: 25 },
          { name: "Louvre Museum", type: "museum", rating: 4.8, cost: 20 },
          { name: "Notre-Dame", type: "cultural", rating: 4.7, cost: 10 },
          { name: "Arc de Triomphe", type: "landmark", rating: 4.6, cost: 12 },
          { name: "Versailles Palace", type: "cultural", rating: 4.8, cost: 30 }
        ]
      };
    }
  
    setupMiddleware() {
      this.app.use(cors());
      this.app.use(express.json());
      this.app.use(express.text({ type: 'application/x-ndjson' }));
    }
  
    setupRoutes() {
      this.app.post('/', async (req, res) => {
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');
  
        const request = typeof req.body === 'string' 
          ? JSON.parse(req.body.split('\n')[0]) 
          : req.body;
  
        try {
          if (request.method === 'initialize') {
            this.sendResponse(res, {
              protocolVersion: "0.1.0",
              serverInfo: {
                name: "places-mcp-server",
                version: "1.0.0"
              },
              capabilities: {
                tools: {
                  list: true,
                  call: true
                }
              }
            });
          } else if (request.method === 'tools/list') {
            this.sendResponse(res, {
              tools: [
                {
                  name: "search_attractions",
                  description: "Search for tourist attractions in a destination",
                  inputSchema: {
                    type: "object",
                    properties: {
                      destination: { type: "string" },
                      type: { 
                        type: "string", 
                        enum: ["cultural", "landmark", "museum", "food", "all"] 
                      },
                      limit: { type: "number", default: 5 }
                    },
                    required: ["destination"]
                  }
                },
                {
                  name: "get_place_details",
                  description: "Get detailed information about a specific place",
                  inputSchema: {
                    type: "object",
                    properties: {
                      placeName: { type: "string" },
                      destination: { type: "string" }
                    },
                    required: ["placeName", "destination"]
                  }
                },
                {
                  name: "get_restaurants",
                  description: "Find restaurants in a destination",
                  inputSchema: {
                    type: "object",
                    properties: {
                      destination: { type: "string" },
                      cuisine: { type: "string" },
                      priceRange: { 
                        type: "string", 
                        enum: ["budget", "moderate", "expensive"] 
                      }
                    },
                    required: ["destination"]
                  }
                }
              ]
            });
          } else if (request.method === 'tools/call') {
            const { name, arguments: args } = request.params;
            
            if (name === 'search_attractions') {
              const places = this.placesDB[args.destination] || this.generatePlaces(args.destination);
              const filtered = args.type && args.type !== 'all' 
                ? places.filter(p => p.type === args.type)
                : places;
              
              this.sendResponse(res, {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    destination: args.destination,
                    attractions: filtered.slice(0, args.limit || 5),
                    totalFound: filtered.length
                  }, null, 2)
                }]
              });
            } else if (name === 'get_place_details') {
              const destination = args.destination;
              const placeName = args.placeName;
              const places = this.placesDB[destination] || this.generatePlaces(destination);
              const place = places.find(p => p.name.toLowerCase().includes(placeName.toLowerCase()));
              
              if (place) {
                this.sendResponse(res, {
                  content: [{
                    type: "text",
                    text: JSON.stringify({
                      place: place,
                      destination: destination
                    }, null, 2)
                  }]
                });
              } else {
                this.sendError(res, -32602, "Invalid params", `Place '${placeName}' not found in ${destination}`);
              }
            } else if (name === 'get_restaurants') {
              const restaurants = this.generateRestaurants(args.destination, args.cuisine, args.priceRange);
              this.sendResponse(res, {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    destination: args.destination,
                    restaurants: restaurants
                  }, null, 2)
                }]
              });
            } else {
              this.sendError(res, -32601, "Method not found", `Tool '${name}' not found`);
            }
          } else {
            this.sendError(res, -32601, "Method not found", `Method '${request.method}' not found`);
          }
        } catch (error) {
          this.sendError(res, -32603, "Internal error", error.message);
        }
  
        res.end();
      });
  
      this.app.get('/health', (req, res) => {
        res.json({ status: 'ok', service: 'places-mcp-server' });
      });
    }
  
    generatePlaces(destination) {
      // Generate random places for any destination
      const types = ["cultural", "landmark", "museum", "food"];
      const places = [];
      for (let i = 0; i < 10; i++) {
        places.push({
          name: `${destination} Attraction ${i + 1}`,
          type: types[Math.floor(Math.random() * types.length)],
          rating: (Math.random() * 2 + 3).toFixed(1),
          cost: Math.floor(Math.random() * 50)
        });
      }
      return places;
    }
  
    generateRestaurants(destination, cuisine, priceRange) {
      const restaurants = [];
      for (let i = 0; i < 5; i++) {
        restaurants.push({
          name: `${cuisine || 'Local'} Restaurant ${i + 1}`,
          cuisine: cuisine || 'Local',
          priceRange: priceRange || 'moderate',
          rating: (Math.random() * 2 + 3).toFixed(1),
          address: `${i + 1} Main Street, ${destination}`
        });
      }
      return restaurants;
    }
  
    sendResponse(res, response) {
      const data = JSON.stringify({ 
        jsonrpc: "2.0", 
        result: response,
        id: Date.now()
      });
      res.write(data + '\n');
    }
  
    sendError(res, code, message, data = null) {
      const errorResponse = {
        jsonrpc: "2.0",
        error: {
          code: code,
          message: message
        },
        id: Date.now()
      };
      
      if (data) {
        errorResponse.error.data = data;
      }
      
      res.write(JSON.stringify(errorResponse) + '\n');
    }
  
    start() {
      this.app.listen(this.port, () => {
        console.log(`Places MCP Server running on http://localhost:${this.port}`);
        console.log(`Test with MCP Inspector: npx @modelcontextprotocol/inspector node places-server.js`);
      });
    }
  }
  
  // Start server
  const placesServer = new PlacesMCPServer(3001);
  placesServer.start();