// mcp-travel/server.js
// MCP Travel Server - Provides travel-related tools via Model Context Protocol

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mcp-travel-server' });
});

// MCP Tool Definitions
const TOOLS = {
  getWeather: {
    name: 'getWeather',
    description: 'Get weather forecast for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City or location name' },
        dates: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' }
          }
        }
      },
      required: ['location']
    }
  },
  searchFlights: {
    name: 'searchFlights',
    description: 'Search for flight options',
    parameters: {
      type: 'object',
      properties: {
        origin: { type: 'string' },
        destination: { type: 'string' },
        departureDate: { type: 'string', format: 'date' },
        returnDate: { type: 'string', format: 'date' },
        passengers: { type: 'number', minimum: 1 }
      },
      required: ['origin', 'destination', 'departureDate']
    }
  },
  searchAccommodation: {
    name: 'searchAccommodation',
    description: 'Search for hotels and accommodations',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        checkIn: { type: 'string', format: 'date' },
        checkOut: { type: 'string', format: 'date' },
        guests: { type: 'number', minimum: 1 },
        priceRange: {
          type: 'object',
          properties: {
            min: { type: 'number' },
            max: { type: 'number' }
          }
        }
      },
      required: ['location', 'checkIn', 'checkOut']
    }
  },
  getAttractions: {
    name: 'getAttractions',
    description: 'Get popular attractions and activities',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        category: {
          type: 'string',
          enum: ['museums', 'restaurants', 'outdoor', 'entertainment', 'shopping', 'all']
        },
        radius: { type: 'number', description: 'Search radius in km' }
      },
      required: ['location']
    }
  },
  getTravelAdvisory: {
    name: 'getTravelAdvisory',
    description: 'Get travel advisories and safety information',
    parameters: {
      type: 'object',
      properties: {
        country: { type: 'string' },
        region: { type: 'string' }
      },
      required: ['country']
    }
  },
  calculateRoute: {
    name: 'calculateRoute',
    description: 'Calculate route and transportation options',
    parameters: {
      type: 'object',
      properties: {
        origin: { type: 'string' },
        destination: { type: 'string' },
        mode: {
          type: 'string',
          enum: ['driving', 'walking', 'transit', 'cycling']
        }
      },
      required: ['origin', 'destination']
    }
  }
};

// MCP Protocol Handler
app.post('/mcp/tools', (req, res) => {
  // Return available tools
  res.json({
    tools: Object.values(TOOLS)
  });
});

// MCP Execute Tool
app.post('/mcp/execute', async (req, res) => {
  const { tool, parameters } = req.body;
  
  if (!TOOLS[tool]) {
    return res.status(400).json({ 
      error: `Unknown tool: ${tool}` 
    });
  }

  try {
    const result = await executeToolFunction(tool, parameters);
    res.json({
      tool,
      parameters,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error executing tool ${tool}:`, error);
    res.status(500).json({ 
      error: error.message,
      tool,
      parameters
    });
  }
});

// Tool Implementation Functions
async function executeToolFunction(toolName, parameters) {
  switch (toolName) {
    case 'getWeather':
      return await getWeatherData(parameters);
    case 'searchFlights':
      return await searchFlightOptions(parameters);
    case 'searchAccommodation':
      return await searchHotels(parameters);
    case 'getAttractions':
      return await getLocalAttractions(parameters);
    case 'getTravelAdvisory':
      return await getTravelAdvisoryInfo(parameters);
    case 'calculateRoute':
      return await calculateTravelRoute(parameters);
    default:
      throw new Error(`Tool ${toolName} not implemented`);
  }
}

// Weather Data Implementation
async function getWeatherData({ location, dates }) {
  // Mock implementation - replace with actual weather API
  try {
    // In production, use OpenWeatherMap, WeatherAPI, etc.
    const mockWeather = {
      location,
      dates: dates || { start: new Date().toISOString().split('T')[0] },
      forecast: [
        {
          date: dates?.start || new Date().toISOString().split('T')[0],
          temperature: { high: 75, low: 60, unit: 'F' },
          condition: 'Partly Cloudy',
          precipitation: 20,
          humidity: 65
        }
      ],
      summary: `Weather in ${location} is expected to be pleasant with partly cloudy skies.`
    };
    return mockWeather;
  } catch (error) {
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }
}

// Flight Search Implementation
async function searchFlightOptions({ origin, destination, departureDate, returnDate, passengers = 1 }) {
  // Mock implementation - replace with Amadeus API, Skyscanner, etc.
  try {
    const mockFlights = {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      flights: [
        {
          carrier: 'United Airlines',
          flightNumber: 'UA123',
          departure: `${departureDate}T08:00:00`,
          arrival: `${departureDate}T12:00:00`,
          price: { amount: 450, currency: 'USD' },
          duration: '4h',
          stops: 0
        },
        {
          carrier: 'Delta Airlines',
          flightNumber: 'DL456',
          departure: `${departureDate}T14:00:00`,
          arrival: `${departureDate}T18:30:00`,
          price: { amount: 380, currency: 'USD' },
          duration: '4h 30m',
          stops: 1
        }
      ]
    };
    return mockFlights;
  } catch (error) {
    throw new Error(`Failed to search flights: ${error.message}`);
  }
}

// Hotel Search Implementation
async function searchHotels({ location, checkIn, checkOut, guests = 1, priceRange }) {
  // Mock implementation - replace with Booking.com API, Hotels.com, etc.
  try {
    const mockHotels = {
      location,
      checkIn,
      checkOut,
      guests,
      priceRange,
      hotels: [
        {
          name: 'Grand Plaza Hotel',
          rating: 4.5,
          price: { amount: 150, currency: 'USD', period: 'per night' },
          amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant'],
          distance: '2.5 km from city center',
          availability: true
        },
        {
          name: 'Budget Inn',
          rating: 3.8,
          price: { amount: 75, currency: 'USD', period: 'per night' },
          amenities: ['WiFi', 'Parking'],
          distance: '5 km from city center',
          availability: true
        }
      ]
    };
    return mockHotels;
  } catch (error) {
    throw new Error(`Failed to search hotels: ${error.message}`);
  }
}

// Attractions Implementation
async function getLocalAttractions({ location, category = 'all', radius = 10 }) {
  // Mock implementation - replace with TripAdvisor API, Google Places, etc.
  try {
    const mockAttractions = {
      location,
      category,
      radius,
      attractions: [
        {
          name: 'City Museum',
          category: 'museums',
          rating: 4.7,
          description: 'Historical artifacts and art collections',
          hours: '9:00 AM - 5:00 PM',
          admission: { adult: 15, child: 8, currency: 'USD' }
        },
        {
          name: 'Central Park',
          category: 'outdoor',
          rating: 4.8,
          description: 'Beautiful urban park with walking trails',
          hours: 'Dawn to Dusk',
          admission: { free: true }
        }
      ]
    };
    return mockAttractions;
  } catch (error) {
    throw new Error(`Failed to get attractions: ${error.message}`);
  }
}

// Travel Advisory Implementation
async function getTravelAdvisoryInfo({ country, region }) {
  // Mock implementation - replace with government travel advisory APIs
  try {
    const mockAdvisory = {
      country,
      region,
      level: 'Normal Precautions',
      lastUpdated: new Date().toISOString(),
      advisories: [
        'Exercise normal precautions',
        'Keep copies of important documents',
        'Register with embassy if staying long-term'
      ],
      health: {
        vaccinations: ['Routine vaccines up to date'],
        healthRisks: 'Low'
      }
    };
    return mockAdvisory;
  } catch (error) {
    throw new Error(`Failed to get travel advisory: ${error.message}`);
  }
}

// Route Calculation Implementation
async function calculateTravelRoute({ origin, destination, mode = 'driving' }) {
  // Mock implementation - replace with Google Maps API, MapBox, etc.
  try {
    const mockRoute = {
      origin,
      destination,
      mode,
      distance: { value: 45, unit: 'km' },
      duration: { value: 50, unit: 'minutes' },
      steps: [
        {
          instruction: 'Head north on Main St',
          distance: '2 km',
          duration: '5 min'
        },
        {
          instruction: 'Turn right onto Highway 101',
          distance: '40 km',
          duration: '40 min'
        },
        {
          instruction: 'Take exit 23 toward Downtown',
          distance: '3 km',
          duration: '5 min'
        }
      ]
    };
    return mockRoute;
  } catch (error) {
    throw new Error(`Failed to calculate route: ${error.message}`);
  }
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`MCP Travel Server running on port ${PORT}`);
  console.log(`Available tools: ${Object.keys(TOOLS).join(', ')}`);
  console.log('Health check: http://localhost:' + PORT + '/health');
});