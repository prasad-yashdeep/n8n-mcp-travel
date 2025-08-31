// ========================================
// 3. FLIGHT SERVICE (flight-server.js)
// Run: node flight-server.js
// Port: 3002
// ========================================

const express = require('express');
const cors = require('cors');

class FlightMCPServer {
    constructor(port = 3002) {
      this.app = express();
      this.port = port;
      this.setupMiddleware();
      this.setupRoutes();
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
                name: "flight-mcp-server",
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
                  name: "search_flights",
                  description: "Search for flights between origin and destination",
                  inputSchema: {
                    type: "object",
                    properties: {
                      origin: { type: "string" },
                      destination: { type: "string" },
                      departureDate: { type: "string", format: "date" },
                      returnDate: { type: "string", format: "date" },
                      passengers: { type: "number", default: 1 },
                      class: { 
                        type: "string", 
                        enum: ["economy", "business", "first"],
                        default: "economy"
                      }
                    },
                    required: ["origin", "destination", "departureDate"]
                  }
                },
                {
                  name: "get_flight_prices",
                  description: "Get price estimates for flights",
                  inputSchema: {
                    type: "object",
                    properties: {
                      origin: { type: "string" },
                      destination: { type: "string" },
                      month: { type: "string" }
                    },
                    required: ["origin", "destination"]
                  }
                }
              ]
            });
          } else if (request.method === 'tools/call') {
            const { name, arguments: args } = request.params;
            
            if (name === 'search_flights') {
              const flights = this.generateFlights(args);
              this.sendResponse(res, {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    search: {
                      origin: args.origin,
                      destination: args.destination,
                      departureDate: args.departureDate,
                      returnDate: args.returnDate,
                      passengers: args.passengers || 1,
                      class: args.class || "economy"
                    },
                    flights: flights,
                    cheapestPrice: Math.min(...flights.map(f => f.price)),
                    averagePrice: Math.floor(flights.reduce((a, f) => a + f.price, 0) / flights.length)
                  }, null, 2)
                }]
              });
            } else if (name === 'get_flight_prices') {
              const priceEstimate = {
                origin: args.origin,
                destination: args.destination,
                month: args.month || new Date().toISOString().slice(0, 7),
                priceRange: {
                  economy: { min: 300, max: 800, average: 550 },
                  business: { min: 1200, max: 2500, average: 1850 },
                  first: { min: 3000, max: 6000, average: 4500 }
                },
                recommendation: "Book 3-4 weeks in advance for best prices"
              };
              
              this.sendResponse(res, {
                content: [{
                  type: "text",
                  text: JSON.stringify(priceEstimate, null, 2)
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
        res.json({ status: 'ok', service: 'flight-mcp-server' });
      });
    }
  
    generateFlights(args) {
      const airlines = ["United", "Delta", "American", "JetBlue", "Southwest"];
      const flights = [];
      
      for (let i = 0; i < 5; i++) {
        const basePrice = args.class === "business" ? 1500 : args.class === "first" ? 3500 : 400;
        flights.push({
          flightNumber: `${airlines[i].substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
          airline: airlines[i],
          departure: {
            airport: args.origin,
            time: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
          },
          arrival: {
            airport: args.destination,
            time: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
          },
          duration: `${Math.floor(Math.random() * 10) + 2}h ${Math.floor(Math.random() * 60)}m`,
          price: basePrice + Math.floor(Math.random() * 500),
          stops: Math.random() > 0.7 ? 1 : 0,
          class: args.class || "economy"
        });
      }
      
      return flights.sort((a, b) => a.price - b.price);
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
        console.log(`Flight MCP Server running on http://localhost:${this.port}`);
        console.log(`Test with MCP Inspector: npx @modelcontextprotocol/inspector node flight-server.js`);
      });
    }
  }
  
  // Start server
  const flightServer = new FlightMCPServer(3002);
  flightServer.start();