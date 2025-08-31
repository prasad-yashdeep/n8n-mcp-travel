// ========================================
// 1. WEATHER SERVICE (weather-server.js)
// Run: node weather-server.js
// Port: 3000
// ========================================

const express = require('express');
const cors = require('cors');

class WeatherMCPServer {
  constructor(port = 3000) {
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
    // MCP Protocol endpoint
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
              name: "weather-mcp-server",
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
                name: "get_weather",
                description: "Get current weather for a location",
                inputSchema: {
                  type: "object",
                  properties: {
                    location: { type: "string", description: "City name or coordinates" },
                    date: { type: "string", description: "Date in YYYY-MM-DD format" }
                  },
                  required: ["location"]
                }
              },
              {
                name: "get_forecast",
                description: "Get weather forecast for next 7 days",
                inputSchema: {
                  type: "object",
                  properties: {
                    location: { type: "string" },
                    days: { type: "number", default: 7 }
                  },
                  required: ["location"]
                }
              }
            ]
          });
        } else if (request.method === 'tools/call') {
          const { name, arguments: args } = request.params;
          
          if (name === 'get_weather') {
            const weatherData = {
              location: args.location,
              date: args.date || new Date().toISOString().split('T')[0],
              temperature: Math.floor(Math.random() * 20) + 15,
              conditions: ["Sunny", "Partly Cloudy", "Cloudy", "Rainy"][Math.floor(Math.random() * 4)],
              humidity: Math.floor(Math.random() * 40) + 40,
              windSpeed: Math.floor(Math.random() * 20) + 5,
              unit: "celsius"
            };
            
            this.sendResponse(res, {
              content: [{
                type: "text",
                text: JSON.stringify(weatherData, null, 2)
              }]
            });
          } else if (name === 'get_forecast') {
            const forecast = [];
            for (let i = 0; i < (args.days || 7); i++) {
              const date = new Date();
              date.setDate(date.getDate() + i);
              forecast.push({
                date: date.toISOString().split('T')[0],
                high: Math.floor(Math.random() * 10) + 20,
                low: Math.floor(Math.random() * 10) + 10,
                conditions: ["Sunny", "Partly Cloudy", "Cloudy", "Rainy"][Math.floor(Math.random() * 4)],
                precipitationChance: Math.floor(Math.random() * 100)
              });
            }
            
            this.sendResponse(res, {
              content: [{
                type: "text",
                text: JSON.stringify({
                  location: args.location,
                  forecast: forecast,
                  unit: "celsius"
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

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'weather-mcp-server' });
    });
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
      console.log(`Weather MCP Server running on http://localhost:${this.port}`);
      console.log(`Test with MCP Inspector: npx @modelcontextprotocol/inspector node weather-server.js`);
    });
  }
}

// Start server
const weatherServer = new WeatherMCPServer(3000);
weatherServer.start();